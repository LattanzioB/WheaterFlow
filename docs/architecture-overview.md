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
  a reusable Current Weather adapter, protects the OpenWeather boundary with
  timeout, circuit breaker, bulkhead and request cache, and submits normalized
  observations to the API domain pipeline with idempotency, correlation and
  distributed trace propagation.

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
| Tracing             | OpenTelemetry SDK + OTLP/HTTP exporter to Jaeger                   |
| Local orchestration | Docker Compose for API, Notification service, Ingestion, RabbitMQ and observability |
| Testing             | Jest unit tests plus cross-service integration tests               |

## Delivery II Components

| Component                                   | Owns                                                                                                                         | Exposes                                                                   | Depends on                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| API service (`apps/api`)                    | Auth, user identity, station catalog, measurement recording, measurement search, alert detection                             | Public REST API on port `3000`, Swagger at `/api/docs`                    | MongoDB Atlas, RabbitMQ, Notification service REST API |
| Notification service (`apps/notifications`) | Notification profiles, station subscriptions, alert-type preferences, delivery channels, Telegram link codes, alert dispatch | Internal/local REST API on port `3001`, Telegram webhook, health endpoint | MongoDB Atlas, RabbitMQ, Telegram Bot API when enabled |
| Ingestion service (`apps/ingestion`)        | External weather acquisition orchestration, OpenWeather resilience and operational configuration                             | Health, metrics, protected manual trigger and protected current-weather read on port `3002` | OpenWeather API, API service                           |
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
| Current temperature report                                  | API to Ingestion REST                 | The API remains the public facade while synchronous OWM latency and failures stay isolated in Ingestion.      |
| Historical average reports                                  | API to MongoDB aggregation             | Daily and weekly averages are domain reports over persisted measurements, not external provider reads.       |

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
- Expose `GET /stations/:stationId/reports/temperature/current` as an
  authenticated facade that validates station provider metadata and delegates
  real-time OWM reads to ingestion without persisting the reading.
- Expose daily and weekly temperature average reports from persisted
  measurements in MongoDB without calling ingestion or OpenWeather.
- Expose HTTP, process and RabbitMQ publication metrics consumed by the
  Prometheus/Grafana operational dashboard.

### Notification Service

- Persist notification profiles in `user_notification_profiles`.
- Manage station subscriptions and selected alert types per user.
- Manage delivery channels, including log and Telegram targets.
- Generate and resolve Telegram link codes.
- Consume RabbitMQ climate-alert messages.
- Filter subscribers by `stationId` and `alertType`.
- Resolve concrete delivery targets before invoking channel adapters.
- Dispatch notifications through the configured notifier adapters.
- Expose HTTP, process and RabbitMQ consumption metrics consumed by the
  Prometheus/Grafana operational dashboard.

### Ingestion Service

- Run as an independent NestJS process and Docker container.
- Validate OpenWeather/API URLs, API key, cron, and concurrency limits at startup.
- Expose `GET /health` on port `3002`.
- Query OpenWeather Current Weather by coordinates through the
  `WeatherDataProvider` port.
- Protect OpenWeather calls with configurable timeout, circuit breaker,
  provider-level bulkhead and last-valid-reading cache.
- Expose OpenWeather resilience metrics at `/metrics` with bounded labels for
  request outcome, typed failure code and breaker state.
- Load `provider=openweather` stations through the API-owned internal catalog.
- Run the configured `INGESTION_CRON` job with bounded OWM concurrency.
- Continue after station-level failures and report succeeded, failed, skipped,
  and duration fields for every cycle.
- Submit normalized observations through the `MeasurementSubmitter` port and
  protected API REST adapter.
- Derive deterministic idempotency keys from OWM observations and propagate the
  cycle identifier plus W3C trace context through HTTP and RabbitMQ.
- Protect the ingestion-to-API write boundary with configurable timeout,
  bulkhead, circuit breaker, safe retries, backoff with jitter and Prometheus
  metrics.
- Protect manual cycles, synchronous current-weather reads and the API catalog
  with `INGESTION_SYSTEM_TOKEN`, and reject overlapping manual cycles.
- Normalize provider payloads to explicit Celsius, percent, hPa, observation
  timestamp, and external identifier fields.
- Classify OpenWeather client errors, server errors, timeouts, network failures,
  and invalid payloads with typed provider errors.
- Use cached OpenWeather readings only for scheduled ingestion fallback, making
  the cache age explicit in the cycle summary; synchronous requests propagate
  typed errors instead of returning stale data.
- Keep application, domain, and infrastructure layers local to `apps/ingestion`.
- Depend on remote contracts rather than importing API or Notification domain entities.
- Expose ingestion, OpenWeather, HTTP boundary and process metrics consumed by
  the Prometheus/Grafana operational dashboard.

### Observability Stack

The optional Compose `observability` profile runs Prometheus, Alertmanager,
Grafana, Loki, Promtail, cAdvisor and Jaeger. Prometheus scrapes the three
NestJS services plus cAdvisor, evaluates the versioned rules under
`observability/prometheus/rules/`, and sends grouped demo notifications to
Alertmanager. Grafana provisions Prometheus, Loki and Jaeger datasources and
loads the versioned `WeatherFlow Operaciones` dashboard automatically.

## Key Flows

### Scheduled OpenWeather Acquisition

The Ingestion scheduler starts from `INGESTION_CRON`, requests the protected
OpenWeather station catalog from the API, skips inactive stations, and invokes
`WeatherDataProvider` with at most `OWM_CONCURRENCY_LIMIT` concurrent calls.
The provider wrapper enforces timeout, circuit breaker, bulkhead and cache.
Failures are isolated per station. Scheduled runs can reuse a valid cached
reading and include its age in the result; manual or synchronous requests keep
the typed failure. Successful readings are sent through the authenticated
`MeasurementSubmitter` REST adapter to `RecordMeasurementService`; the cycle
emits one structured summary containing the persisted measurement.

OpenTelemetry auto-instrumentation creates the cross-process trace for HTTP,
NestJS, MongoDB and RabbitMQ work. Ingestion sends `traceparent` to the API over
HTTP. The API injects the active trace context into AMQP headers when it
publishes `ClimateAlertDetectedMessage`, and the Notification service extracts
those headers before invoking the alert handling use case. Logs emitted inside
that path include the active `traceId` and `spanId`.

The REST boundary from ingestion to API retries only transient safe failures
(`429`, `502`, `503`, `504`, timeouts and network errors). Retries reuse the
same idempotency key, so duplicate attempts resolve to the existing measurement
instead of creating duplicate rows or alert messages. The opposite read
boundary from API to ingestion powers the current-temperature report with a
shorter timeout and a maximum of one retry by default, protecting p95 latency
during synchronous user requests. In that flow, the API resolves the station
from MongoDB only to validate existence, coordinates and `provider=openweather`;
the weather reading itself comes from ingestion calling OWM in real time and is
not persisted.

Sequence source:
`docs/architecture/sequences/scheduled-ingestion-sequence.mmd`

### Current Temperature Report

Clients call `GET /stations/:stationId/reports/temperature/current` on the API
service. The API validates the station and `provider=openweather`, then calls
the protected Ingestion endpoint `GET /internal/weather/current` with the
station coordinates. Ingestion performs the real-time OWM call through the same
resilient provider used by scheduled acquisition and returns the normalized
reading. The API adds the station metadata and `fetchedAt` timestamp; it does
not persist the synchronous reading.

Sequence source:
`docs/architecture/sequences/current-temperature-report-sequence.mmd`

### Historical Temperature Average Reports

Clients call
`GET /stations/:stationId/reports/temperature/daily-average` or
`GET /stations/:stationId/reports/temperature/weekly-average` on the API
service. The API first validates that the station exists, then asks the
measurement repository for a MongoDB aggregation over the moving UTC period:
24 hours for the daily report and 7 days for the weekly report. The aggregation
matches by `stationId` and `reportedAt`, using the existing compound index, and
returns the average Celsius temperature plus the sample count.

Unlike the current-temperature report, these endpoints never call ingestion or
OpenWeather. An empty period is still a successful report: the response includes
the UTC bounds, `average.value: null`, unit `celsius`, and `sampleCount: 0`.

Sequence source:
`docs/architecture/sequences/temperature-average-report-sequence.mmd`

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

Indice narrativo en espanol: [`docs/architecture/c4/architecture.md`](./architecture/c4/architecture.md).

| Diagram                                      | Source                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| C4 (todos los niveles)                       | [`docs/architecture/c4/architecture.md`](./architecture/c4/architecture.md) |
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
| Current temperature report sequence          | `docs/architecture/sequences/current-temperature-report-sequence.mmd`       |
| Daily/weekly average report sequence         | `docs/architecture/sequences/temperature-average-report-sequence.mmd`       |
| MongoDB ER diagram                           | `docs/architecture/uml/weatherflow-er.mmd`                                  |
| Delivery III demo and evidence               | `docs/delivery-iii-demo.md`                                                 |
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
