# Cross-Service Integration Tests

WeatherFlow includes a dedicated Jest integration suite for Delivery II:

```bash
npm run test:integration
```

The suite starts test instances of the API and Notification Nest applications in
the Jest process, each bound to an ephemeral localhost port. It connects those
apps to real remote boundaries:

- MongoDB through `MONGODB_URI` (local Compose Mongo by default)
- RabbitMQ through `RABBITMQ_URL`
- API-to-Notification HTTP through the API proxy client
- Notification alert delivery through an injected fake notifier

## Environment

Copy `.env.integration.example` to `.env.integration` and fill in disposable
test resources:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/weatherflow_integration
WEATHERFLOW_INTEGRATION_ALLOW_DB_CLEANUP=true
RABBITMQ_URL=amqp://weatherflow:weatherflow@localhost:5672
RABBITMQ_ALERT_EXCHANGE=weatherflow.integration.alerts
RABBITMQ_ALERT_QUEUE=weatherflow.integration.notifications.alerts
RABBITMQ_ALERT_ROUTING_KEY=alerts.integration.climate.detected
JWT_SECRET=integration-test-secret
NOTIFICATION_DELIVERY_MODE=log
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
```

`WEATHERFLOW_INTEGRATION_ALLOW_DB_CLEANUP=true` is required because the suite
cleans these test collections before and after each test:

- `users`
- `weather_stations`
- `measurements`
- `user_notification_profiles`
- `notifications`

Use the local Compose Mongo service, or a dedicated remote test database. Do not
point this suite at a development or production database.

RabbitMQ queues and exchanges are suffixed with a per-test UUID. The harness
purges them before each test and deletes them after the applications shut down.

## Covered Boundaries

The queue test registers a user through the API, creates a station, subscribes
the user through the API notification preference route, records an
alert-producing measurement, and asserts two remote effects:

- a probe queue bound to the configured exchange receives the
  `ClimateAlertDetectedMessage`
- the Notification service consumer receives the RabbitMQ message and invokes
  the fake notifier with the expected log delivery target

The in-app fanout test starts the Notification service with the real RabbitMQ
consumer and `MongoNotificationRepository`, opens
`GET /notifications/stream?token=<jwt>`, publishes a
`ClimateAlertDetectedMessage`, and asserts notification persistence, SSE
delivery, and idempotency for duplicate `messageId` values.

The REST test calls the API delivery-channel route and then reads the
Notification service directly to verify that the API-to-Notification HTTP
boundary persisted the preference.

## Why Not Postman

Postman/manual calls can demonstrate one happy path at a point in time, but they
do not become a repeatable regression check. These integration tests are
automated, clean their own queues and collections, assert both the message broker
and HTTP service boundaries, and run from a single npm script without Telegram or
any other external notification provider.
