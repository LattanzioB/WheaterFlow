# Hexagonal Architecture - WeatherFlow

## Overview

WeatherFlow uses Ports and Adapters architecture with DDD inside both Delivery II
services. The core rule remains the same: dependencies point inward toward
domain and application contracts. Remote communication between services is
treated as infrastructure behind ports.

```text
Driving adapters        Application           Domain             Driven adapters
REST controllers  -->   use cases       -->   entities/ports --> MongoDB, RabbitMQ,
Telegram webhook        orchestration         value objects      HTTP clients, Telegram
```

## Service Boundaries

| Service                                     | Business responsibility                                                 | Primary adapters                                                 | Secondary adapters                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| API service (`apps/api`)                    | Auth, user identity facade, stations, measurements, alert detection     | REST controllers, Swagger                                        | Mongo repositories, RabbitMQ alert publisher, Notification service HTTP client, ingestion HTTP client |
| Notification service (`apps/notifications`) | Notification profiles, subscriptions, delivery channels, alert dispatch | Preference REST controllers, Telegram webhook, RabbitMQ consumer | Mongo notification-profile repository, log notifier, Telegram notifier         |
| Ingestion service (`apps/ingestion`)        | Scheduled and synchronous external weather acquisition                   | Health endpoint, cron scheduler, protected manual trigger, protected current-weather endpoint | OpenWeather Current Weather adapter and API station-catalog HTTP adapter       |

The former Delivery I modular monolith is historical context. Delivery II keeps
the same internal layer discipline, but the notification capability is now a
separate NestJS application with its own REST and messaging boundaries.

## Layers

### Domain Layer

Domain code lives under each module's `domain` folder.

**Examples:**

- API service: `User`, `WeatherStation`, `Measurement`, `Email`, `Location`,
  `Temperature`, `Humidity`, `Pressure`.
- Notification service: `UserNotificationProfile` with station alert
  preferences and delivery channels.
- Port interfaces such as `IStationRepository`, `IMeasurementRepository`, and
  `INotificationProfileRepository`.

**Rules:**

- No NestJS, Mongoose, AMQP, Axios, or Telegram imports.
- Business invariants and value-object validation stay here.
- Domain ports describe what the application needs from the outside world.

### Application Layer

Application services orchestrate use cases and depend on domain contracts.

**Examples:**

- `RecordMeasurementService` creates a `Measurement`, saves it, and calls the
  `AlertPublisher` port when an alert exists.
- `QueryMeasurementsService` validates and normalizes measurement filters.
- `GetCurrentTemperatureReportService` resolves station metadata, enforces
  `provider=openweather`, and delegates real-time weather reads to the API-side
  ingestion client.
- `GetTemperatureAverageReportService` resolves station existence and delegates
  moving-period temperature aggregation to the measurement repository port.
- Notification preference services update `UserNotificationProfile`.
- `NotificationService` filters subscribers and resolves delivery targets after
  a RabbitMQ message is consumed.

### Interface Layer

Interface adapters receive inbound requests and translate them into application
commands.

**Examples:**

- API service: `AuthController`, `WeatherStationsController`,
  `MeasurementsController`, `TemperatureAverageReportsController`,
  `UserNotificationPreferencesController`.
- Notification service: `NotificationPreferencesController`,
  `TelegramWebhookController`.
- Ingestion service: `HealthController`, `IngestionController`,
  `CurrentWeatherController`, and `IngestionScheduler`, without crossing into
  API domain code.

Controllers validate DTOs, enforce HTTP/JWT access rules where applicable, and
return response DTOs. They do not call repositories directly.

### Infrastructure Layer

Infrastructure adapters implement ports and communicate with external systems.

**Examples:**

- `MongoUserRepository`, `MongoWeatherStationRepository`,
  `MongoMeasurementRepository`.
- `MongoNotificationProfileRepository`.
- `RabbitMqAlertPublisherAdapter`.
- `RabbitMqClimateAlertConsumerAdapter`.
- `HttpNotificationServiceClient`.
- `LogAlertNotifierAdapter` and `TelegramAlertNotifierAdapter`.

## Ports and Adapters

### Driving Adapters

| Adapter                                 | Service      | Description                                                      |
| --------------------------------------- | ------------ | ---------------------------------------------------------------- |
| `AuthController`                        | API          | Register and login users.                                        |
| `WeatherStationsController`             | API          | Manage and search stations.                                      |
| `MeasurementsController`                | API          | Record and filter measurements.                                  |
| `UserNotificationPreferencesController` | API          | Authenticated facade for notification preferences.               |
| `NotificationPreferencesController`     | Notification | Internal/local preference API owned by the Notification service. |
| `TelegramWebhookController`             | Notification | Receives Telegram link commands.                                 |
| `RabbitMqClimateAlertConsumerAdapter`   | Notification | Consumes climate-alert messages from RabbitMQ.                   |

### Driven Adapters

| Port                             | Adapter                              | Service      | Description                                             |
| -------------------------------- | ------------------------------------ | ------------ | ------------------------------------------------------- |
| `IUserRepository`                | `MongoUserRepository`                | API          | User identity persistence.                              |
| `IStationRepository`             | `MongoWeatherStationRepository`      | API          | Station persistence and search.                         |
| `IMeasurementRepository`         | `MongoMeasurementRepository`         | API          | Measurement persistence and filtering.                  |
| `AlertPublisher`                 | `RabbitMqAlertPublisherAdapter`      | API          | Publishes alert messages after measurement persistence. |
| `NotificationServiceClient`      | `HttpNotificationServiceClient`      | API          | Calls the Notification service REST boundary.           |
| Current weather ingestion client | `ApiToIngestionCurrentWeatherClient` | API          | Calls the ingestion service read boundary for S-03.9.   |
| `INotificationProfileRepository` | `MongoNotificationProfileRepository` | Notification | Notification profile persistence.                       |
| `AlertNotifier`                  | Composite, log, Telegram adapters    | Notification | Sends resolved notifications.                           |
| `WeatherDataProvider`            | `ResilientWeatherDataProvider` + `OpenWeatherMapAdapter` | Ingestion    | Protects and normalizes OpenWeather Current Weather readings. |
| `WeatherStationCatalog`          | `ApiWeatherStationCatalogAdapter`    | Ingestion    | Loads provider-backed stations from the API boundary.   |
| `MeasurementSubmitter`           | `ApiMeasurementSubmitterAdapter`     | Ingestion    | Sends observations through the API domain pipeline.     |

The ingestion application exports `WeatherDataProvider` through a NestJS token.
The port returns a provider-neutral reading with an external identifier,
observation timestamp, and explicit units for temperature, humidity, and
pressure. The adapter is reused by both the scheduled ingestion workflow and
the synchronous current-temperature endpoint.

`OpenWeatherMapAdapter` remains the raw HTTP adapter for Current Weather.
`ResilientWeatherDataProvider` decorates it with timeout-aware typed failures,
circuit breaker, bulkhead, last-valid-reading cache and Prometheus metrics. The
cache is exposed to the application layer only for scheduled ingestion fallback;
manual and synchronous request paths keep the provider error so callers do not
receive stale data by accident.

`RunIngestionCycleService` coordinates the catalog, provider, and measurement
submitter ports. It owns the anti-overlap lock, applies bounded concurrency,
isolates per-station errors, and returns a structured operational summary. The
REST adapter crosses the API boundary without importing API aggregates; the API
persists through `RecordMeasurementService`. `ApiMeasurementSubmitterAdapter`
keeps timeout, bulkhead, circuit breaker, safe retry and idempotency concerns
inside the infrastructure adapter, so application services still depend only on
the `MeasurementSubmitter` port.

`ApiToIngestionCurrentWeatherClient` is the API-side outbound adapter used by
S-03.9. It keeps synchronous read-path protection outside the public
controller/use-case layer: timeout, bulkhead, circuit breaker, maximum-one retry
policy and clear `502`/`503`/`504` mapping are infrastructure concerns.

## Data Flow: Alerting Measurement

```text
1. Client calls POST /measurements on the API service.
2. MeasurementsController validates JWT ownership of the station.
3. RecordMeasurementService loads station alert settings.
4. Measurement.create(...) evaluates alert rules in the domain.
5. MongoMeasurementRepository persists the measurement in MongoDB Atlas.
6. RabbitMqAlertPublisherAdapter publishes ClimateAlertDetectedMessage.
7. RabbitMQ delivers the message to the Notification service queue.
8. RabbitMqClimateAlertConsumerAdapter validates the payload.
9. NotificationService loads notification profiles by stationId.
10. NotificationService filters by station and alert type.
11. NotificationService resolves log/Telegram delivery targets.
12. AlertNotifier adapters dispatch the notification and the consumer acks.
```

Measurement persistence and notification dispatch are intentionally separated.
If RabbitMQ or the Notification service is temporarily unavailable, the
measurement write has already completed and alert publication failure is logged
at the API boundary.

## Dependency Injection

Adapters are wired to ports through NestJS provider tokens in `libs/shared`.

```typescript
export const MEASUREMENT_REPOSITORY_TOKEN = 'IMeasurementRepository';
export const ALERT_PUBLISHER_TOKEN = 'AlertPublisher';
export const ALERT_NOTIFIER_TOKEN = 'AlertNotifier';
export const NOTIFICATION_SERVICE_CLIENT_TOKEN = 'INotificationServiceClient';
```

Application services inject tokens instead of concrete infrastructure classes.
This keeps use cases testable and keeps framework-specific code at the edge.

## Anti-Patterns

```typescript
// Domain importing NestJS or Mongoose
import { Injectable } from '@nestjs/common';

// Controller calling a repository directly
constructor(private readonly repo: MongoMeasurementRepository) {}

// API service mutating notification-profile collections directly
await notificationProfileModel.updateOne(...);

// Notification service importing API domain entities for preference logic
import { WeatherStation } from '@api/modules/stations/domain/entities/...';

// Application service depending on a concrete RabbitMQ or Telegram adapter
constructor(private readonly publisher: RabbitMqAlertPublisherAdapter) {}
```
