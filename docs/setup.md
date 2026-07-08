# Setup & Development Guide - WeatherFlow

## Prerequisites

- Node.js 20+
- npm 9+
- Docker Desktop
- k6 CLI for S-03.13 load tests
- MongoDB Atlas account (free tier works)
- Telegram Bot Token (optional for local notification delivery)

---

## Initial Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Minimum local distributed environment:

```env
PORT=3000
NOTIFICATIONS_PORT=3001
INGESTION_PORT=3002
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/weatherflow
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
NOTIFICATION_SERVICE_URL=http://notifications:3001
OWM_API_KEY=your-openweather-api-key
OWM_BASE_URL=https://api.openweathermap.org
OWM_TIMEOUT_MS=10000
OWM_CACHE_TTL_MS=300000
OWM_BREAKER_FAILURE_THRESHOLD=3
OWM_BREAKER_OPEN_MS=30000
API_BASE_URL=http://api:3000
API_TIMEOUT_MS=10000
API_BREAKER_FAILURE_THRESHOLD=3
API_BREAKER_OPEN_MS=30000
API_RETRY_ATTEMPTS=2
API_RETRY_BASE_DELAY_MS=250
INGESTION_SERVICE_URL=http://ingestion:3002
INGESTION_TIMEOUT_MS=5000
INGESTION_CONCURRENCY_LIMIT=10
INGESTION_BREAKER_FAILURE_THRESHOLD=3
INGESTION_BREAKER_OPEN_MS=30000
INGESTION_RETRY_ATTEMPTS=1
INGESTION_RETRY_BASE_DELAY_MS=100
INGESTION_SYSTEM_TOKEN=replace-with-at-least-16-characters
INGESTION_CRON=*/10 * * * *
OWM_CONCURRENCY_LIMIT=3
API_CONCURRENCY_LIMIT=3
RABBITMQ_DEFAULT_USER=weatherflow
RABBITMQ_DEFAULT_PASS=weatherflow
RABBITMQ_URL=amqp://weatherflow:weatherflow@rabbitmq:5672
RABBITMQ_ALERT_EXCHANGE=weatherflow.alerts
RABBITMQ_ALERT_QUEUE=weatherflow.notifications.alerts
RABBITMQ_ALERT_ROUTING_KEY=alerts.climate.detected
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
LOG_LEVEL=info
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://jaeger:4318/v1/traces
OTEL_TRACING_ENABLED=true
```

### MongoDB Atlas URI

Use MongoDB Atlas as the normal WeatherFlow database:

1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas).
2. Create a database user.
3. Whitelist your IP address, or use `0.0.0.0/0` only for development.
4. Copy the connection string into `MONGODB_URI`.

The local MongoDB service in `docker-compose.yml` is for disposable local and integration scenarios. For the distributed environment used by the application docs, keep `MONGODB_URI` pointed at Atlas.

---

## Running the Distributed Environment

```bash
docker compose up --build
```

Local URLs:

| Service                     | URL                                                 |
| --------------------------- | --------------------------------------------------- |
| API                         | `http://localhost:3000`                             |
| Swagger UI                  | `http://localhost:3000/api/docs`                    |
| OpenAPI JSON                | `http://localhost:3000/api/docs-json`               |
| Notification service health | `http://localhost:3001/health`                      |
| Ingestion service health    | `http://localhost:3002/health`                      |
| API metrics                 | `http://localhost:3000/metrics`                     |
| Ingestion metrics           | `http://localhost:3002/metrics`                     |
| Grafana                     | `http://localhost:3300`                             |
| Prometheus                  | `http://localhost:9090`                             |
| Alertmanager                | `http://localhost:9093`                             |
| cAdvisor                    | `http://localhost:8081`                             |
| Jaeger UI                   | `http://localhost:16686`                            |
| Manual ingestion trigger    | `POST http://localhost:3002/internal/ingestion/run` |
| RabbitMQ management UI      | `http://localhost:15672`                            |

Open RabbitMQ management and sign in with `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS`.

### Smoke Tests

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

### Running Services Without Docker Images

```bash
npm run start:api:dev
npm run start:notifications:dev
npm run start:ingestion:dev
```

When the API starts, an idempotent bootstrap ensures the WeatherFlow system
owner and the Universidad Nacional de Quilmes, Buenos Aires, and Bariloche
stations exist with `provider=openweather`. Repeated starts do not duplicate
these records.

The Ingestion service uses `OWM_BASE_URL`, `OWM_API_KEY`, and
`OWM_TIMEOUT_MS` to call OpenWeather Current Weather by latitude and longitude.
The adapter always requests `units=metric`, so temperature is normalized as
Celsius while humidity remains percent and pressure remains hPa.
The OpenWeather boundary is wrapped with a circuit breaker, bulkhead and
request cache. `OWM_BREAKER_FAILURE_THRESHOLD` controls how many consecutive
typed provider failures open the breaker, `OWM_BREAKER_OPEN_MS` controls how
long requests are rejected before one half-open probe is allowed, and
`OWM_CACHE_TTL_MS` controls how long the last valid reading per coordinate can
be reused by scheduled ingestion.

The ingestion process registers the `INGESTION_CRON` schedule at startup. Each
cycle loads `provider=openweather` stations from the API, skips inactive
stations, limits concurrent OWM requests with `OWM_CONCURRENCY_LIMIT`, and logs
a structured summary. For a diagnostic run:

```bash
curl -X POST http://localhost:3002/internal/ingestion/run \
  -H "x-ingestion-token: $INGESTION_SYSTEM_TOKEN"
```

The same token protects the API station catalog and measurement endpoint used
by the worker. Every successful OWM observation is submitted to the API with a
deterministic idempotency key and the cycle identifier as correlation ID. The
API records it through `RecordMeasurementService`; retries return the same
measurement without duplicate persistence or alert publication.
The write boundary from ingestion to API uses `API_TIMEOUT_MS`,
`API_CONCURRENCY_LIMIT`, `API_BREAKER_FAILURE_THRESHOLD`,
`API_BREAKER_OPEN_MS`, `API_RETRY_ATTEMPTS`, and
`API_RETRY_BASE_DELAY_MS`. Only `429`, `502`, `503`, `504`, timeouts, and safe
network errors are retried, and every retry reuses the same idempotency key.
When a scheduled cycle cannot reach OWM, it may submit a cached reading only if
that cache entry is still inside `OWM_CACHE_TTL_MS`; the cycle result includes
`fallback.reason`, `fallback.cachedAt`, `fallback.ageMs`, and `fallback.ttlMs`.
Manual runs and synchronous current-temperature requests keep the typed OWM
error so callers can receive `502`, `503`, or `504` instead of stale data.

The read boundary from API to ingestion is configured separately with
`INGESTION_SERVICE_URL`, `INGESTION_TIMEOUT_MS`,
`INGESTION_CONCURRENCY_LIMIT`, `INGESTION_BREAKER_FAILURE_THRESHOLD`,
`INGESTION_BREAKER_OPEN_MS`, `INGESTION_RETRY_ATTEMPTS`, and
`INGESTION_RETRY_BASE_DELAY_MS`. The default read-path policy allows at most
one retry on `429`, `502`, `503`, `504`, timeout, or network failure so current
temperature reports do not trade p95 latency for aggressive recovery.
The public report is available at
`GET http://localhost:3000/stations/:stationId/reports/temperature/current`.
Only stations with `provider=openweather` are accepted; the API resolves the
station, forwards coordinates to ingesta, and returns OWM's current observation
plus the API `fetchedAt` timestamp without creating a measurement.

OpenWeather resilience metrics are exposed in Prometheus text format at
`GET /metrics`, including request outcomes, typed failure codes, breaker state
and current cache entries. Internal REST boundary metrics are exposed on both
API and ingestion services as `weatherflow_http_boundary_requests_total` and
`weatherflow_http_boundary_breaker_state`, labeled by direction
(`api_to_ingestion` or `ingestion_to_api`).

Distributed tracing is initialized in the API, ingestion and notification
services. The default Docker configuration exports OpenTelemetry traces through
OTLP/HTTP to Jaeger at `http://jaeger:4318/v1/traces`; local non-Docker runs can
override `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` with
`http://localhost:4318/v1/traces`. HTTP, NestJS, MongoDB and RabbitMQ clients
are auto-instrumented. The ingestion service propagates W3C `traceparent` when
it submits measurements to the API, and the API injects the active trace context
into AMQP headers before RabbitMQ delivers alert messages to notifications.
Structured logs include `traceId` and `spanId` when a request is inside an
active span.

To inspect a complete ingestion-to-queue trace:

```bash
docker compose --profile observability up --build
curl -X POST http://localhost:3002/internal/ingestion/run \
  -H "x-ingestion-token: $INGESTION_SYSTEM_TOKEN"
```

Then open `http://localhost:16686`, select one of
`weatherflow-ingestion`, `weatherflow-api` or `weatherflow-notifications`, and
look for a trace containing the OWM HTTP call, ingestion HTTP submit, API
MongoDB persistence, RabbitMQ publish and notification consumer spans.

### Observability Profile

The observability stack (Prometheus, Alertmanager, Grafana, Loki, Promtail,
cAdvisor and Jaeger) is gated behind the optional `observability` Compose
profile so a plain `docker compose up` stays lightweight:

```bash
docker compose --profile observability up --build
```

This provisions Grafana with Prometheus and Loki datasources, scrapes
container metrics through cAdvisor, loads the versioned dashboard
`observability/grafana/provisioning/dashboards/weatherflow-overview.json`
(`WeatherFlow Operaciones`, Grafana at `http://localhost:3300`, user/password
from `GRAFANA_ADMIN_USER`/`GRAFANA_ADMIN_PASSWORD`, default `admin`/`admin`),
and routes firing Prometheus alerts (`observability/prometheus/rules/weatherflow-alerts.yml`)
to Alertmanager at `http://localhost:9093`. The operational runbook in
[`observability/README.md`](../observability/README.md) explains each panel,
the alert thresholds, the demo webhook route, grouping/silence behavior, and
reproducible scenarios to make each alert fire on purpose.

### Production Build

```bash
npm run build
npm run start:api:prod
npm run start:notifications:prod
npm run start:ingestion:prod
```

---

## Demo Walkthrough

A suggested path to show the full Delivery III solution working end to end,
from external ingestion to alerting and observability:

1. **Start everything, including observability**:
   `docker compose --profile observability up --build`.
2. **Show the OpenWeather ingestion cycle running live**: trigger it manually
   (`POST /internal/ingestion/run` with `x-ingestion-token`) and show the
   structured JSON summary with the three default stations
   (Universidad Nacional de Quilmes, Buenos Aires, Bariloche) succeeding.
3. **Show the three reports in Swagger** (`http://localhost:3000/api/docs`,
   tag `Reports`): current temperature (`GET
   /stations/:stationId/reports/temperature/current`, delegates to ingestion
   and OpenWeather in real time), and the daily/weekly averages (persisted
   MongoDB data only).
4. **Trigger an alert from external data**: pick a station and threshold where
   the current OWM reading crosses an alert rule, or lower a station's alert
   threshold, then re-run the ingestion cycle and show the resulting
   notification in every delivery channel enabled for the user's profile.
5. **Show the distributed trace for that same request** in Jaeger
   (`http://localhost:16686`): pick the `weatherflow-ingestion` service and
   find the trace spanning the OWM call, the ingestion-to-API submission, the
   MongoDB write, and the RabbitMQ publish/consume.
6. **Show the Grafana dashboard** (`http://localhost:3300`, `WeatherFlow
   Operaciones`): point out the business panels (OWM measurements per minute,
   OWM errors, breaker state, alerts published/consumed) updating from the
   run just performed.
7. **Fire an operational alert on purpose**: `docker compose stop ingestion`,
   wait about a minute, and show `WeatherFlowServiceDown` go from `pending` to
   `firing` in Prometheus (`http://localhost:9090/alerts`) and then `active` in
   Alertmanager (`http://localhost:9093`). Restart ingestion
   (`docker compose start ingestion`) to resolve it.
8. **Show a load test run**: `npm run test:load` (with the OWM stub for the
   current-temperature scenario, see below) and open
   `docs/load-tests/baseline-report.html` to walk through thresholds and
   results.

## Running Tests

```bash
npm run test
npm run test:watch
npm run test:cov
npm run test:integration
npm run test:load
```

Focus unit tests on domain entities, value objects, application services, and infrastructure wiring that can be verified deterministically.

`npm run test:integration` exercises the Delivery II remote boundaries. It
requires `.env.integration`, a disposable MongoDB database, RabbitMQ, and
explicit cleanup consent. Use a dedicated MongoDB Atlas test database for these
tests. See `docs/testing/integration-tests.md`.

### Running Load Tests

S-03.13 adds k6 load tests for measurement search, current temperature reports,
and daily/weekly average reports:

```bash
npm run test:load
```

The script creates its own user, OpenWeather-backed station, and synthetic
measurement dataset before running three scenarios: sustained ramp, spike, and
long run. Search and average-report scenarios use only API + MongoDB data.

For current-temperature reports, run ingestion against the local OpenWeather
stub to avoid external rate limits and network flakiness:

```powershell
npm run test:load:owm-stub
$env:OWM_BASE_URL = "http://host.docker.internal:4010"
docker compose up --build api ingestion mongo rabbitmq
npm run test:load
```

When running ingestion outside Docker, set
`OWM_BASE_URL=http://localhost:4010`. k6 writes JSON and HTML summaries to
`docs/load-tests/latest-summary.json` and
`docs/load-tests/latest-report.html`. The versioned baseline lives in
`docs/load-tests/`.

---

## Project Structure Quick Reference

```text
apps/
|-- api/
|   `-- src/
|       |-- modules/
|       |   |-- auth/
|       |   |-- measurements/
|       |   |-- stations/
|       |   `-- users/
|       `-- main.ts
|-- notifications/
    `-- src/
        |-- modules/
        |   `-- notifications/
        `-- main.ts
`-- ingestion/
    `-- src/
        |-- modules/
        |   `-- ingestion/
        |       |-- application/
        |       |-- domain/
        |       `-- infrastructure/
        `-- main.ts
libs/
|-- contracts/
`-- shared/
```

---

## Git Workflow

This project uses feature branches against `main`.

```bash
git checkout main
git pull --ff-only
git checkout -b feature/my-story
git add .
git commit -m "feat(scope): describe the change"
git push -u origin feature/my-story
```

Open a pull request into `main`, wait for review, and squash merge after checks pass.

---

## Development Tips

- Keep layer discipline: domain code stays framework-free.
- Use value object factory methods instead of direct constructors.
- Inject repositories through tokens rather than concrete classes.
- Alert detection remains in the measurement/domain flow.
- Keep Docker Compose focused on local service orchestration; managed dependencies like MongoDB Atlas stay external for normal development.
