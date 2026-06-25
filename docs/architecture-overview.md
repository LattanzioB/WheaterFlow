# Architecture Overview - WeatherFlow

## Summary

WeatherFlow is a distributed meteorological services platform built with three
independently runnable NestJS backend applications:

- API service: authenticates users, manages stations and measurements, evaluates
  climate alerts, and publishes alert messages.
- Notification service: owns notification preferences, consumes alert messages,
  resolves subscribers and delivery targets, and dispatches notifications.
- Ingestion service: owns external weather acquisition and isolates OpenWeather
  failures from the API process. It exposes health, validates operational
  configuration, schedules bounded-concurrency acquisition cycles, and contains
  a reusable Current Weather adapter, and submits normalized observations to
  the API domain pipeline with idempotency and correlation.

The services keep the Delivery I hexagonal and DDD structure inside each
component. They communicate through explicit remote boundaries instead of in
process module calls: synchronous REST for preference management and RabbitMQ
for climate-alert delivery.

## Runtime Stack

| Concern             | Technology                                                         |
| ------------------- | ------------------------------------------------------------------ |
| Runtime             | Node.js 20 + TypeScript strict mode                                |
| Framework           | NestJS 11                                                          |
| API                 | REST + Swagger through the API service                             |
| Authentication      | JWT with Passport in the API service                               |
| Database            | MongoDB Atlas through Mongoose ODM                                 |
| Messaging           | RabbitMQ topic exchange for climate alerts                         |
| Notifications       | Log delivery for local/test runs, Telegram adapter when configured |
| Local orchestration | Docker Compose for API, Notification service, and RabbitMQ         |
| Testing             | Jest unit tests plus cross-service integration tests               |

## Delivery II Components

| Component                                   | Owns                                                                                                                         | Exposes                                                                   | Depends on                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| API service (`apps/api`)                    | Auth, user identity, station catalog, measurement recording, measurement search, alert detection                             | Public REST API on port `3000`, Swagger at `/api/docs`                    | MongoDB Atlas, RabbitMQ, Notification service REST API |
| Notification service (`apps/notifications`) | Notification profiles, station subscriptions, alert-type preferences, delivery channels, Telegram link codes, alert dispatch | Internal/local REST API on port `3001`, Telegram webhook, health endpoint | MongoDB Atlas, RabbitMQ, Telegram Bot API when enabled |
| Ingestion service (`apps/ingestion`)        | External weather acquisition orchestration and its operational configuration                                                 | Health and protected manual trigger on port `3002`                        | OpenWeather API, API service                           |
| RabbitMQ                                    | Durable alert exchange, notification queue, routing key binding                                                              | AMQP on `5672`, management UI on `15672`                                  | None inside the app boundary                           |
| MongoDB Atlas                               | Persistent collections for users, stations, measurements, and notification profiles                                          | Managed MongoDB endpoint                                                  | External managed dependency                            |
| Clients                                     | Users, Swagger/manual callers, station data publishers                                                                       | HTTPS/JSON requests to the API service                                    | API service                                            |

## Communication Boundaries

| Flow                                                        | Boundary                                 | Reason                                                                                                        |
| ----------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| User registration, login, station CRUD, measurement queries | Client to API REST                       | User-facing workflows stay behind one authenticated API facade.                                               |
| Preference reads and writes from API routes                 | API to Notification REST                 | Preferences are owned by the Notification service, while the API preserves the public Delivery I route shape. |
| Measurement alert publication                               | API to RabbitMQ                          | Alert dispatch does not block measurement persistence and can be retried or observed independently.           |
| Alert consumption and delivery                              | RabbitMQ to Notification service         | Notification processing can scale or fail separately from measurement recording.                              |
| Telegram account linking                                    | Telegram webhook to Notification service | Chat IDs belong to the notification boundary, not the weather-data API.                                       |
| External weather acquisition                                | Ingestion service to OpenWeather and API | Scheduling and provider failures remain isolated; the API retains ownership of stations and measurements.     |

## Technical Split Justification

The split follows three granularity breakers.

| Breaker              | Decision                                                                                                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Business capability  | Weather data capture/search and notification delivery evolve at different speeds. The API service keeps the meteorological core, while the Notification service owns subscriber targeting and channel delivery.                              |
| Data ownership       | Measurement and station writes belong to the API service. Notification profiles, delivery channels, and Telegram link codes belong to the Notification service in the `user_notification_profiles` collection.                               |
| Transaction boundary | Recording a measurement must remain successful even if notification delivery is unavailable. The API persists the measurement first, then publishes a durable `ClimateAlertDetectedMessage`; notification dispatch is eventually consistent. |

This keeps the API focused on authenticated weather workflows and keeps the
Notification service focused on alert routing. MongoDB Atlas is shared as an
external managed database dependency, but the services do not share aggregate
logic: each service accesses only the collections it owns for its use cases.

## Component Responsibilities

### API Service

- Validate JWTs and expose the public WeatherFlow REST API.
- Register and authenticate users.
- Create, update, list, search, and delete weather stations.
- Record measurements and evaluate domain alert rules.
- Search measurements by station name, climate ranges, date ranges, and alert
  state.
- Publish `ClimateAlertDetectedMessage` messages to RabbitMQ after alerting
  measurements are persisted.
- Proxy notification preference workflows to the Notification service so clients
  keep using `/users/:id/...` routes.

### Notification Service

- Persist notification profiles in `user_notification_profiles`.
- Manage station subscriptions and selected alert types per user.
- Manage delivery channels, including log and Telegram targets.
- Generate and resolve Telegram link codes.
- Consume RabbitMQ climate-alert messages.
- Filter subscribers by `stationId` and `alertType`.
- Resolve concrete delivery targets before invoking channel adapters.
- Dispatch notifications through the configured notifier adapters.

### Ingestion Service

- Run as an independent NestJS process and Docker container.
- Validate OpenWeather/API URLs, API key, cron, and concurrency limits at startup.
- Expose `GET /health` on port `3002`.
- Query OpenWeather Current Weather by coordinates through the
  `WeatherDataProvider` port.
- Load `provider=openweather` stations through the API-owned internal catalog.
- Run the configured `INGESTION_CRON` job with bounded OWM concurrency.
- Continue after station-level failures and report succeeded, failed, skipped,
  and duration fields for every cycle.
- Submit normalized observations through the `MeasurementSubmitter` port and
  protected API REST adapter.
- Derive deterministic idempotency keys from OWM observations and propagate the
  cycle identifier through HTTP and RabbitMQ.
- Protect manual cycles and the API catalog with `INGESTION_SYSTEM_TOKEN`, and
  reject overlapping manual cycles.
- Normalize provider payloads to explicit Celsius, percent, hPa, observation
  timestamp, and external identifier fields.
- Classify OpenWeather client errors, server errors, timeouts, network failures,
  and invalid payloads with typed provider errors.
- Keep application, domain, and infrastructure layers local to `apps/ingestion`.
- Depend on remote contracts rather than importing API or Notification domain entities.

## Key Flows

### Scheduled OpenWeather Acquisition

The Ingestion scheduler starts from `INGESTION_CRON`, requests the protected
OpenWeather station catalog from the API, skips inactive stations, and invokes
`WeatherDataProvider` with at most `OWM_CONCURRENCY_LIMIT` concurrent calls.
Failures are isolated per station. Successful readings are sent through the
authenticated `MeasurementSubmitter` REST adapter to `RecordMeasurementService`;
the cycle emits one structured summary containing the persisted measurement.

Sequence source:
`docs/architecture/sequences/scheduled-ingestion-sequence.mmd`

### Search and Filtering

Clients call `GET /measurements` or station listing routes on the API service.
The API validates filters, normalizes ranges, resolves station-name filters to
matching station IDs when needed, and queries MongoDB Atlas through repository
ports.

Sequence source:
`docs/architecture/sequences/query-measurements-sequence.mmd`

### Measurement Recording and Alert Delivery

Clients post measurements to the API service. The API verifies station ownership,
creates the `Measurement` aggregate, persists it, and publishes a
`ClimateAlertDetectedMessage` when an alert is detected. The Notification service
consumes the message, loads matching notification profiles, filters by alert
type, resolves delivery targets, and dispatches through log or Telegram adapters.

Sequence source:
`docs/architecture/sequences/record-measurement-alert-sequence.mmd`

### Notification Preference Management

Clients call authenticated `/users/:id/...` routes on the API service. The API
checks user access and forwards preference changes to the Notification service
over REST through `HttpNotificationServiceClient`. Direct Notification service
routes are internal/local service routes and own the persistence changes.

Sequence source:
`docs/architecture/sequences/manage-notification-preferences-sequence.mmd`

## Integration-Test Strategy

Delivery II has automated cross-service integration tests in
`test/integration/cross-service.integration-spec.ts`, run with:

```bash
npm run test:integration
```

The suite starts API and Notification Nest applications on ephemeral local ports,
uses a real MongoDB Atlas test database, uses a real RabbitMQ broker, and injects
a fake notifier in the Notification service. It verifies:

- API registration, station creation, subscription setup, and alerting
  measurement recording.
- API publication of a `ClimateAlertDetectedMessage` to RabbitMQ.
- Notification service consumption of that message and invocation of the fake
  notifier with the expected delivery target.
- API-to-Notification REST preference updates and persistence in the
  Notification service.

Unit tests remain focused on deterministic service, domain, DTO, repository, and
adapter behavior. Postman and manual Swagger calls are useful smoke tests, but
they are not considered integration tests because they do not create a
repeatable regression check.

## Diagrams

Índice narrativo en español: [`docs/architecture/c4/arquitectura.md`](./architecture/c4/arquitectura.md).

| Diagram                                      | Source                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| C4 (todos los niveles)                       | [`docs/architecture/c4/arquitectura.md`](./architecture/c4/arquitectura.md) |
| C4 context                                   | `docs/architecture/c4/c4_level_1_context.plantuml`                          |
| C4 container                                 | `docs/architecture/c4/c4_level_2_container.plantuml`                        |
| C4 component (API)                           | `docs/architecture/c4/c4_level_3_api.plantuml`                              |
| C4 component (Notifications)                 | `docs/architecture/c4/c4_level_3_notifications.plantuml`                    |
| C4 component (distributed notification flow) | `docs/architecture/c4/weatherflow-component.mmd`                            |
| Measurement search/filter sequence           | `docs/architecture/sequences/query-measurements-sequence.mmd`               |
| Alert publication and consumption sequence   | `docs/architecture/sequences/record-measurement-alert-sequence.mmd`         |
| Climate alert to in-app delivery sequence    | `docs/architecture/sequences/climate-alert-in-app-delivery-sequence.mmd`    |
| Notification preference sequence             | `docs/architecture/sequences/manage-notification-preferences-sequence.mmd`  |
| Scheduled OpenWeather ingestion sequence     | `docs/architecture/sequences/scheduled-ingestion-sequence.mmd`              |
| MongoDB ER diagram                           | `docs/architecture/uml/weatherflow-er.mmd`                                  |

## Delivery I Historical Material

Older documents that describe WeatherFlow as a single modular monolith belong to
Delivery I historical context. In particular, `docs/informe-desarrollo-ddd.md`
and `docs/weatherflow-c4-architecture.drawio` explain the original monolith
constraints and should not be read as the current Delivery II runtime topology.

## Further Reading

- [Domain Model](./domain-model.md) - entities, value objects, aggregates.
- [Hexagonal Architecture](./hexagonal-architecture.md) - layer rules and ports
  and adapters in the distributed repository.
- [API Reference](./api-reference.md) - final routes and filters.
- [Setup Guide](./setup.md) - local distributed runtime.
- [Cross-Service Integration Tests](./testing/integration-tests.md) - automated
  Delivery II integration scope.
