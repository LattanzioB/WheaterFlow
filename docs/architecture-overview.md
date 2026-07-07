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
| Ingestion service (`apps/ingestion`)        | External weather acquisition orchestration, OpenWeather resilience and operational configuration                             | Health, metrics and protected manual trigger on port `3002`               | OpenWeather API, API service                           |
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

### Why Ingestion Is a Third Independent Service (Delivery III)

Delivery III adds a fourth granularity breaker to justify `apps/ingestion` as
its own deployable process instead of an adapter inside the API service.

| Breaker                  | Decision                                                                                                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Failure domain isolation | OpenWeather has variable latency and can fail or rate-limit independently of WeatherFlow. Running the provider client, its circuit breaker, bulkhead and cache in a separate process means an OWM outage cannot exhaust API request threads or its event loop. |
| Change cadence           | Scheduling, provider adapters and resilience tuning (timeouts, breaker thresholds, cache TTL) change independently of the domain rules for measurements and alerts, and can be redeployed without touching the API.        |
| Operational scaling      | The ingestion cron and its concurrency limits are sized for OpenWeather's rate limits, not for user traffic. Keeping it out of the API process lets each service scale, restart and be rate-limited on its own terms.       |

Ingestion still has **no direct access to MongoDB or RabbitMQ**: it owns
acquisition and resilience only, and always writes through the API's internal
REST boundary (`POST /internal/ingestion/measurements`) so the API remains the
single owner of the measurement/alert domain pipeline. This mirrors the same
data-ownership and transaction-boundary reasoning already used for the
Notification service above, applied to a service that produces data instead of
one that consumes it.

## Resilience Strategies

Delivery III protects two boundaries where a remote dependency can be slow or
unavailable: the outbound call to OpenWeather, and the internal REST calls
between Ingestion and the API. Both apply the same five strategies, tuned
differently per direction because one is a batch write path and the other is a
synchronous read path.

| Strategy       | OpenWeather boundary (Ingestion → OWM)                                                             | Ingestion → API (write measurements)                                             | API → Ingestion (read current temperature)                                    |
| -------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Timeout        | `OWM_TIMEOUT_MS` bounds every HTTP call so a slow OWM response cannot stall a cycle.                  | `API_TIMEOUT_MS` bounds each measurement submission attempt.                        | `INGESTION_TIMEOUT_MS` bounds the synchronous read so a report request fails fast. |
| Circuit breaker | Opens after `OWM_BREAKER_FAILURE_THRESHOLD` consecutive failures for `OWM_BREAKER_OPEN_MS`, then half-opens. | Opens on `API_BREAKER_FAILURE_THRESHOLD`/`API_BREAKER_OPEN_MS` to stop hammering a degraded API. | Opens on `INGESTION_BREAKER_FAILURE_THRESHOLD`/`INGESTION_BREAKER_OPEN_MS`, returning `503` instead of queuing requests. |
| Bulkhead       | `OWM_CONCURRENCY_LIMIT` caps concurrent OWM calls per cycle and per synchronous request.               | `API_CONCURRENCY_LIMIT` caps concurrent measurement submissions.                    | `INGESTION_CONCURRENCY_LIMIT` caps concurrent report reads so a traffic spike cannot saturate ingestion. |
| Fallback / cache | Last-valid-reading cache (`OWM_CACHE_TTL_MS`) is reused **only for scheduled cycles**; the cached age is reported explicitly. | Definitive failures are recorded per station without cancelling the batch.          | Synchronous reads never use the cache; a failure returns a typed error mapped to `502`/`503`/`504` instead of stale data. |
| Retry          | Not retried at this layer; the breaker/cache already absorb transient OWM failures.                    | Retries only `429`, `502`, `503`, `504`, timeouts and safe network errors, with exponential backoff + jitter, reusing the same idempotency key. | At most one conservative retry (`INGESTION_RETRY_ATTEMPTS`, default `1`) to avoid degrading p95 latency on the read path. |

The asymmetry between the two REST boundaries is deliberate: the write path
(ingestion → API) favors durability and can afford retries because it is
off the request/response critical path of a user, while the read path
(API → ingestion, backing the current-temperature report) favors low, bounded
latency and returns an honest error rather than a stale or duplicated reading.

Full rationale and test coverage: [`docs/stories/E-03/S-03.7-resiliencia-frontera-openweathermap.md`](./stories/E-03/S-03.7-resiliencia-frontera-openweathermap.md) and
[`docs/stories/E-03/S-03.8-resiliencia-frontera-ingesta-api.md`](./stories/E-03/S-03.8-resiliencia-frontera-ingesta-api.md).

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

The optional Compose `observability` profile (`docker compose --profile
observability up --build`) runs Prometheus, Alertmanager, Grafana, Loki,
Promtail, cAdvisor and Jaeger side by side with the three application
services, covering all four observability pillars required for Delivery III:

| Pillar              | Implementation                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Log aggregation      | Pino structured JSON logs from every service are shipped by Promtail into Loki and queried from Grafana.          |
| Metrics aggregation  | Prometheus scrapes `/metrics` on API, Notifications and Ingestion plus cAdvisor container metrics every 15s.      |
| Distributed tracing  | OpenTelemetry auto-instrumentation exports spans over OTLP/HTTP to Jaeger, correlating a request across services. |
| Alerting             | Prometheus evaluates versioned rules and forwards firing alerts to Alertmanager, which groups and routes them.    |

Prometheus evaluates the rules versioned in
`observability/prometheus/rules/weatherflow-alerts.yml`:

| Alert                              | Condition                                                       | Severity |
| ----------------------------------- | ---------------------------------------------------------------- | -------- |
| `WeatherFlowServiceDown`            | API, Notifications or Ingestion not scrapeable for 1 minute       | critical |
| `WeatherFlowIngestionStopped`       | No scheduled ingestion cycle observed in the last 15 minutes      | warning  |
| `WeatherFlowOpenWeatherErrorsHigh`  | More than 25% of OWM boundary attempts failing/rejected over 5m   | warning  |
| `WeatherFlowHttpP95High`            | p95 HTTP latency above 1 second for 5 minutes, per job and route  | warning  |

Alertmanager (`observability/alertmanager/alertmanager.yml`) groups firing
alerts by `alertname`, `service`/`job` and `severity`, waits 30s before the
first notification, re-groups every 5 minutes, repeats every 2 hours, and
inhibits `warning` alerts once an equivalent `critical` alert is already firing
for the same `job`. The demo route forwards to a local webhook receiver so the
routing strategy can be inspected without a real paging integration. Grafana
provisions Prometheus, Loki and Jaeger datasources with stable UIDs and loads
the versioned `WeatherFlow Operaciones` dashboard
(`observability/grafana/provisioning/dashboards/weatherflow-overview.json`)
automatically; it shows hardware metrics per container (CPU, memory,
approximate restarts), HTTP metrics per endpoint (requests, 5xx errors, p95),
and business metrics (OpenWeather measurements ingested per minute, OpenWeather
failures by typed code, breaker state, and alerts published/consumed over
RabbitMQ).

Full runbook, panel-by-panel interpretation and reproducible alert-testing
scenarios: [`observability/README.md`](../observability/README.md).

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

The same `RecordMeasurementService` pipeline evaluates alerts for
OpenWeather-sourced measurements as it does for manual ones: once the API
persists the measurement, an alerting reading publishes the same
`ClimateAlertDetectedMessage` consumed by the Notification service. There is no
separate alert path for external data; see "Measurement Recording and Alert
Delivery" below for the shared downstream sequence from that point onward.

### Current Temperature Report

Clients call `GET /stations/:stationId/reports/temperature/current` on the API
service. The API loads the station, rejects it with `422` unless
`provider=openweather`, and otherwise delegates to the API-to-ingestion current
weather boundary. Ingestion serves the request from the same
`WeatherDataProvider` port used by scheduled cycles, so the same timeout,
circuit breaker, bulkhead and typed-error mapping apply, but **without** the
scheduled-cycle cache fallback: a failure always propagates a typed error that
the API maps to `502`/`503`/`504`. Nothing on this path touches MongoDB or
OpenWeather from the API process, and the reading returned to the client is
never persisted.

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

## Load Test Evidence

Three versioned k6 scenarios in `scripts/load-tests/weatherflow-load.js`
exercise the query/report endpoints (`npm run test:load`):

| Scenario         | Shape            | Endpoints covered                                                |
| ----------------- | ---------------- | -------------------------------------------------------------------- |
| `sustained_ramp`  | Sustained ramp   | Measurement search, daily average                                    |
| `spike`           | Traffic spike    | Measurement search, current temperature, weekly average              |
| `long_run`        | Prolonged load   | Measurement search, both averages, periodic current-temperature reads |

Search and average scenarios run against MongoDB-only data seeded in the k6
`setup()` step, so they never depend on OpenWeather or Telegram. The current
temperature scenario runs ingestion against a local OWM stub
(`npm run test:load:owm-stub`) to stay deterministic and avoid OpenWeather rate
limits. Thresholds cover global and per-endpoint p95, error rate and
throughput; the versioned baseline run is committed at
[`docs/load-tests/baseline-summary.json`](./load-tests/baseline-summary.json) and
[`docs/load-tests/baseline-report.html`](./load-tests/baseline-report.html).
Full scenario/dataset/threshold documentation:
[`docs/load-tests/README.md`](./load-tests/README.md).

> **Pending for final delivery:** the grading criteria also require at least
> one week of measurements ingested from real OpenWeatherMap data for at least
> one station. That evidence depends on the shared continuous-ingestion
> deployment against the team's MongoDB Atlas cluster and is tracked
> separately in [`docs/stories/E-03/S-03.15-documentacion-arquitectura-entrega-iii.md`](./stories/E-03/S-03.15-documentacion-arquitectura-entrega-iii.md);
> it is not yet captured in this document.

## Diagrams

Índice narrativo en español: [`docs/architecture/c4/architecture.md`](./architecture/c4/architecture.md).

| Diagram                                      | Source                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| C4 (todos los niveles)                       | [`docs/architecture/c4/architecture.md`](./architecture/c4/architecture.md) |
| C4 context                                   | `docs/architecture/c4/c4_level_1_context.plantuml`                          |
| C4 container                                 | `docs/architecture/c4/c4_level_2_container.plantuml`                        |
| C4 component (API)                           | `docs/architecture/c4/c4_level_3_api.plantuml`                              |
| C4 component (Notifications)                 | `docs/architecture/c4/c4_level_3_notifications.plantuml`                    |
| C4 component (Ingestion)                     | `docs/architecture/c4/c4_level_3_ingestion.plantuml`                        |
| C4 component (distributed notification flow) | `docs/architecture/c4/weatherflow-component.mmd`                            |
| Measurement search/filter sequence           | `docs/architecture/sequences/query-measurements-sequence.mmd`               |
| Alert publication and consumption sequence   | `docs/architecture/sequences/record-measurement-alert-sequence.mmd`         |
| Climate alert to in-app delivery sequence    | `docs/architecture/sequences/climate-alert-in-app-delivery-sequence.mmd`    |
| Notification preference sequence             | `docs/architecture/sequences/manage-notification-preferences-sequence.mmd`  |
| Scheduled OpenWeather ingestion sequence     | `docs/architecture/sequences/scheduled-ingestion-sequence.mmd`              |
| Current temperature report sequence          | `docs/architecture/sequences/current-temperature-report-sequence.mmd`       |
| Temperature average report sequence          | `docs/architecture/sequences/temperature-average-report-sequence.mmd`       |
| MongoDB document model diagram               | `docs/architecture/uml/weatherflow-document-model.mmd`                      |

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
