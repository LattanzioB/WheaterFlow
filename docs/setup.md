# Setup & Development Guide - WeatherFlow

## Prerequisites

- Node.js 20+
- npm 9+
- Docker Desktop
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
API_BASE_URL=http://api:3000
INGESTION_CRON=*/10 * * * *
OWM_CONCURRENCY_LIMIT=3
API_CONCURRENCY_LIMIT=3
RABBITMQ_DEFAULT_USER=weatherflow
RABBITMQ_DEFAULT_PASS=weatherflow
RABBITMQ_URL=amqp://weatherflow:weatherflow@rabbitmq:5672
RABBITMQ_ALERT_EXCHANGE=weatherflow.alerts
RABBITMQ_ALERT_QUEUE=weatherflow.notifications.alerts
RABBITMQ_ALERT_ROUTING_KEY=alerts.climate.detected
NOTIFICATION_DELIVERY_MODE=log
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
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

| Service                     | URL                                   |
| --------------------------- | ------------------------------------- |
| API                         | `http://localhost:3000`               |
| Swagger UI                  | `http://localhost:3000/api/docs`      |
| OpenAPI JSON                | `http://localhost:3000/api/docs-json` |
| Notification service health | `http://localhost:3001/health`        |
| Ingestion service health    | `http://localhost:3002/health`        |
| RabbitMQ management UI      | `http://localhost:15672`              |

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

### Production Build

```bash
npm run build
npm run start:api:prod
npm run start:notifications:prod
npm run start:ingestion:prod
```

---

## Running Tests

```bash
npm run test
npm run test:watch
npm run test:cov
npm run test:integration
```

Focus unit tests on domain entities, value objects, application services, and infrastructure wiring that can be verified deterministically.

`npm run test:integration` exercises the Delivery II remote boundaries. It
requires `.env.integration`, a disposable MongoDB database, RabbitMQ, and
explicit cleanup consent. Use a dedicated MongoDB Atlas test database for these
tests. See `docs/testing/integration-tests.md`.

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
