# E-03: Delivery III — External Ingestion, Reports, Resilience & Observability

Status: draft

## Goal

Extend WeatherFlow (Delivery I + II) with an external meteorological data source
(OpenWeatherMap) ingested periodically, three new temperature **report** endpoints,
explicit **fault-tolerance** strategies on the external and internal boundaries,
full **observability** (logs, metrics, distributed tracing, alerting), a
**monitoring dashboard**, and **load tests**.

The domain is unchanged: OWM readings become domain `Measurement`s and must flow
through the **same pipeline** built in Delivery I/II — threshold validation, alert
detection, alert publication, and notification dispatch — **without modifying that
logic**. The entire search/filter/alert/subscription surface must keep working on
the OWM-sourced data with no changes.

## Current State (inherited from E-01 / E-02)

- Monorepo NestJS 11 with two runnable services plus a web client:
  - `apps/api` — auth, stations, measurements, search/filter, alert detection
    (`AlertEvaluatorService`), alert publication to RabbitMQ.
  - `apps/notifications` — preferences, queue consumption, Telegram + in-app dispatch.
  - `apps/web` — React client.
  - `libs/contracts` — shared integration messages (`ClimateAlertDetectedMessage`).
  - `libs/shared` — config, injection tokens.
- Remote boundaries already in place: REST (API↔Notifications) and RabbitMQ
  (climate alerts). MongoDB shared as an external managed DB.
- The domain pipeline lives in
  [`record-measurement.service.ts`](../../../apps/api/src/modules/measurements/application/services/record-measurement.service.ts):
  build `Measurement` → evaluate thresholds → persist → publish
  `ClimateAlertDetectedMessage` when an alert is detected.
- `docker compose` already orchestrates `mongo`, `rabbitmq`, `api`,
  `notifications`, `web`.

What does **not** exist yet and is in scope for E-03: periodic OWM ingestion,
station↔provider association, default stations, the three report endpoints,
fault-tolerance strategies, the observability stack, the dashboard, and load tests.

## Proposed Solution

### Topology — new independent ingestion service

A new `apps/ingestion` NestJS worker owns periodic OpenWeatherMap polling. It does
**not** re-implement the domain pipeline: for every provider-backed station it
fetches OWM and pushes the reading to the API over a **remote REST boundary**,
where the existing `RecordMeasurementService` runs unchanged (validation → alert →
publish). This keeps the meteorological core authoritative in `apps/api`, creates a
new own-component boundary to protect, and maximizes the granularity breakers
(failure isolation, volatility, independent scaling/scheduling).

```
                 ┌────────────────────── apps/ingestion (new) ─────────────────────┐
   OpenWeather   │  Scheduler ──> OwmClient (timeout/breaker/bulkhead/cache/fallback)│
   Map API  <────┤            \                                                      │
                 │             └─> IngestionApiClient (REST, timeout/breaker/retry)  │
                 └───────────────────────────────┬──────────────────────────────────┘
                                                  │ POST /internal/ingestion/measurements (system auth)
                                                  ▼
   apps/api  RecordMeasurementService ─> AlertEvaluator ─> Mongo ─> publish ClimateAlertDetectedMessage
                                                  │ RabbitMQ (alerts.climate.detected)
                                                  ▼
   apps/notifications  consume ─> resolve subscribers ─> dispatch (Telegram / in-app)
```

Distributed tracing propagates trace context across **HTTP** (ingestion→api) and
**AMQP** (api→notifications), so a single trace covers *poll → record → alert
publish → notification*, satisfying the end-to-end tracing requirement.

### Domain changes (additive, pipeline untouched)

- **Station ↔ provider:** stations gain a `provider` attribute
  (`none` | `openweather`). The OWM call uses the station's existing
  latitude/longitude. Provider-backed stations are the polling set.
- **Measurement source:** measurements gain a `source` attribute
  (`manual` | `openweather`) so business metrics can distinguish origins. Existing
  manual recording keeps `manual` as default; the pipeline logic is unchanged.
- **Default stations (3):** Universidad Nacional de Quilmes + Buenos Aires + Bariloche
  (climate variety to demo heat/frost alerts), seeded with `provider=openweather`
  and owned by a seeded system account.

### Fault tolerance (5 strategies, exceeding the ≥3 minimum)

| Strategy        | Where applied                                       | Why                                                                 |
| --------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| Timeout         | OWM HTTP calls; ingestion→API REST calls            | Bound latency on the volatile external API and the own-component hop |
| Circuit breaker | Around OWM client; around ingestion→API client      | Stop hammering a failing dependency; fail fast and recover          |
| Bulkhead        | Bounded concurrency for the per-cycle OWM polling   | A slow OWM cannot exhaust the ingestion worker for all stations     |
| Fallback        | OWM failure / breaker open → last-good reading; skip | Degrade gracefully instead of crashing the cycle                    |
| Request cache   | Last successful OWM response per location           | Powers the fallback and avoids redundant external calls             |

### Reports (3 new endpoints on `apps/api`)

- `GET` current temperature for a station/location.
- `GET` average temperature of the last day.
- `GET` average temperature of the last week.

Backed by measurement-repository aggregations; documented in Swagger; covered by
unit tests. These are the primary targets of the k6 load tests.

### Observability stack (Prometheus + Grafana + Jaeger + Loki)

- **Log aggregation:** structured JSON logs (with `traceId`/`spanId`) shipped by
  Promtail to Loki, explorable in Grafana.
- **Metrics aggregation:** each service exposes `/metrics` (Prometheus). Hardware/
  process metrics, per-endpoint HTTP histograms, and business counters/gauges
  (measurements ingested/min, alerts fired, OWM error rate, circuit-breaker state).
- **Distributed tracing:** OpenTelemetry SDK + auto-instrumentation (HTTP, Nest,
  amqplib, Mongoose) exporting to Jaeger; context propagated over HTTP and AMQP.
- **Alerting:** Prometheus alert rules + Alertmanager (OWM error rate, ingestion
  stalled, high p95 latency, service down) with a documented routing strategy.
- **Dashboard:** provisioned Grafana dashboard with hardware, per-endpoint, and
  business sections.

### Load tests (k6, ≥3)

Three k6 scenarios over the report/query endpoints (ramp, spike, soak) with
pass/fail thresholds (p95 latency, error rate), runnable locally and optionally
exporting results to Prometheus/Grafana.

## Stories

| ID      | Title                                                                  | Status |
| ------- | ---------------------------------------------------------------------- | ------ |
| S-03.1  | Station↔provider association, measurement source & default stations    | done   |
| S-03.2  | Internal ingestion intake endpoint reusing the domain pipeline         | draft  |
| S-03.3  | Scaffold the `apps/ingestion` worker (scheduler, config, Docker)       | draft  |
| S-03.4  | OpenWeatherMap client adapter and reading mapping                      | draft  |
| S-03.5  | Periodic ingestion use case (poll → record → alert, end to end)        | draft  |
| S-03.6  | Fault tolerance on the OWM and ingestion→API boundaries                | draft  |
| S-03.7  | Temperature report endpoints (current, last-day avg, last-week avg)    | draft  |
| S-03.8  | Log aggregation — structured JSON logs + Loki/Promtail                 | draft  |
| S-03.9  | Metrics aggregation — Prometheus instrumentation (hw/endpoint/business)| draft  |
| S-03.10 | Distributed tracing — OpenTelemetry across ingestion→API→queue         | draft  |
| S-03.11 | Alerting — Prometheus rules + Alertmanager strategy                    | draft  |
| S-03.12 | Monitoring dashboard — Grafana (hardware, endpoint, business)          | draft  |
| S-03.13 | Load tests — k6 scenarios over report/query endpoints                  | draft  |
| S-03.14 | Update architecture documentation and README for Delivery III          | draft  |

### Dependency graph

```
S-03.1 ─┬─> S-03.2 ─┬─> S-03.5 ─> S-03.6
        │           │
        │   S-03.3 ─┤
        │   S-03.4 ─┘
        └─> S-03.7

Observability (after the ingestion path exists, can run in parallel):
S-03.8 ─┐
S-03.9 ─┼─> S-03.12
S-03.10 ┘
S-03.9 ─> S-03.11

S-03.7 ─> S-03.13            All ─> S-03.14
```

## Definition of Done

1. `docker compose up` starts mongo, rabbitmq, api, notifications, web, the new
   ingestion worker, and the observability stack (Prometheus, Grafana, Jaeger,
   Loki, Promtail, Alertmanager).
2. Stations can be associated with OpenWeatherMap; three default stations exist
   (Quilmes + two cities) and are polled automatically.
3. OWM readings are ingested on a configurable schedule and processed by the
   **unchanged** domain pipeline (validation, alerts, publication, notifications).
4. At least three fault-tolerance strategies protect the OWM boundary and the
   own-component boundary, each justified by where it is applied.
5. Three report endpoints (current temperature, last-day avg, last-week avg) are
   exposed, documented in Swagger, and unit-tested.
6. All four observability strategies are implemented: log aggregation, metrics
   aggregation, distributed tracing (ingestion→alert end to end), and alerting.
7. A Grafana dashboard shows hardware, per-endpoint, and business metrics.
8. At least three k6 load tests run against the report/query endpoints with
   documented thresholds and results.
9. Architecture docs (C4, sequence, ER) and README are updated for Delivery III.
