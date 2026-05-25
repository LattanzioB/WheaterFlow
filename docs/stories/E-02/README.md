# E-02: Delivery II Distributed Architecture

Status: draft

## Goal

Evolve WeatherFlow from the Delivery I modular monolith into a two-component distributed system while preserving existing functionality.

The target architecture is a single repository with two independently runnable NestJS applications:

- `api`: owns authentication, station management, measurement recording/search, alert detection, and alert message publishing.
- `notifications`: owns notification preferences, delivery channels, queue consumption, recipient resolution, and notification dispatch.

Both applications must run locally in separate Docker images and communicate through remote boundaries:

- REST for synchronous API-to-notification service calls where needed.
- RabbitMQ for asynchronous climate alert publication and consumption.

## Architectural Direction

The notification capability is extracted because it is already modeled as support behavior in Delivery I and has natural distributed-system boundaries:

- Business capability breaker: weather data management and notification delivery change for different reasons.
- Transaction breaker: measurement persistence must complete independently from notification delivery.
- Failure isolation: queue/notification failures must not block measurement recording.
- Volatility breaker: delivery channels can evolve without touching measurement logic.
- Data ownership breaker: notification preferences and delivery channels become owned by the notification service.

## Stories

| ID      | Title                                                                 | Status |
| ------- | --------------------------------------------------------------------- | ------ |
| S-02.1  | Restructure repository into two NestJS apps                           | draft  |
| S-02.2  | Add Dockerized local distributed environment                          | draft  |
| S-02.3  | Define shared contracts and alert publisher                           | draft  |
| S-02.4  | Extract notification service APIs and persistence                     | draft  |
| S-02.5  | Consume alert messages and dispatch notifications                     | draft  |
| S-02.6  | Complete station and measurement search filters                       | draft  |
| S-02.7  | Add cross-service integration tests                                   | draft  |
| S-02.8  | Update distributed architecture documentation                         | draft  |
| S-02.9  | Build web UI for use cases (extra)                                    | done   |
| S-02.10 | In-app notification persistence and adapter (extra)                   | done   |
| S-02.11 | In-app notifications — REST history endpoints (extra)                 | done   |
| S-02.12 | In-app notifications — SSE live stream (extra)                        | done   |
| S-02.13 | Web — NotificationsContext, header bell, and toast (extra)            | done   |
| S-02.14 | Web — Notifications page and profile toggle (extra)                   | done   |
| S-02.15 | In-app notifications — integration test and architecture docs (extra) | done   |

### S-02.10–S-02.15: In-App Realtime Alert Notifications

These six stories deliver **Option E (Hybrid: Persist + Stream)** — validated 2026-05-24 — so subscribed users receive weather alerts inside the Web app in real time, in parallel with the existing Telegram delivery. The slices are vertically demonstrable and have the following dependency graph:

```
S-02.10 ──┬──> S-02.11 ──┐
          └──> S-02.12 ──┴──> S-02.13 ──> S-02.14 ──┐
                                                      └──> S-02.15
```

| Slice   | Estimate | Demonstrable outcome                                                                            |
| ------- | -------- | ----------------------------------------------------------------------------------------------- |
| S-02.10 | 10h      | Alert persisted in new `notifications` collection per `in-app` subscriber; Telegram unaffected. |
| S-02.11 | 3h       | Authenticated REST: list/paginate, mark read, mark all read.                                    |
| S-02.12 | 3h       | Authenticated SSE: live event in <2s after RabbitMQ publish.                                    |
| S-02.13 | 6h       | Web header bell + badge + dropdown + live toast.                                                |
| S-02.14 | 5h       | `/notifications` page with filters; profile toggle for `inApp` channel.                         |
| S-02.15 | 6h       | Cross-boundary integration test + refreshed C4/sequence/ER/API docs.                            |

## Definition of Done

1. `docker compose up` starts RabbitMQ, the API service, and the Notification service; both services connect to MongoDB Atlas through `MONGODB_URI`.
2. API and Notification service are built as separate Docker images.
3. Alert detection remains in the measurement/domain flow.
4. Climate alerts are published to RabbitMQ and consumed by the Notification service.
5. Notification preferences and delivery-channel state are owned by the Notification service.
6. Unit tests exist for the new Notification service behavior.
7. Integration tests verify real service boundaries without Postman/manual simulation.
8. Architecture docs include diagrams, responsibilities, sequence diagrams, and technical justification.
9. _(Optional — S-02.9)_ Web UI executes main use cases against the API for demo and assignment extra credit.
10. _(Optional — S-02.10–S-02.15)_ Web UI receives weather alerts in real time (in-app notifications + history + profile toggle) for subscribed users via SSE, persisting a history alongside the existing Telegram delivery.
