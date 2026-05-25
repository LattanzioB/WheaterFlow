# WeatherFlow

WeatherFlow is a distributed weather monitoring backend built with **NestJS 11**, **MongoDB**, and **RabbitMQ**. The repository contains two independently runnable applications: the API service for weather data and alert detection, and the Notification service for notification delivery workflows.

## Tech Stack

| Technology          | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| NestJS 11           | Application framework                                        |
| TypeScript (strict) | Type-safe backend development                                |
| MongoDB + Mongoose  | Document database access                                     |
| RabbitMQ            | Asynchronous alert messaging                                 |
| Swagger / OpenAPI   | Interactive API documentation                                |
| Docker Compose      | Local API, Notification service, and RabbitMQ infrastructure |
| Jest + SWC          | Unit and e2e testing                                         |
| ESLint + Prettier   | Linting and formatting                                       |

## Prerequisites

| Tool                                                              | Version              |
| ----------------------------------------------------------------- | -------------------- |
| [Node.js](https://nodejs.org/)                                    | 20+                  |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest               |
| npm                                                               | Bundled with Node.js |

## Installation

```bash
git clone <repo-url>
cd weatherflow
npm install
cp .env.example .env
```

If you are using PowerShell on Windows, you can copy the env file with:

```powershell
Copy-Item .env.example .env
```

## Running Locally

```bash
# Start the local distributed environment
docker compose up --build

# Or run each NestJS app directly in watch mode
npm run start:api:dev
npm run start:notifications:dev
npm run start:web:dev
```

Docker Compose starts MongoDB, RabbitMQ, and separate API, Notification service, and Web UI containers. Set `MONGODB_URI` only when you want to override the local Compose Mongo database.

- API base URL: `http://localhost:3000`
- Web UI (extra): `http://localhost:5174` (dev) or `http://localhost:8080` (Docker)
- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs-json`
- Notification service health: `http://localhost:3001/health`
- RabbitMQ management UI: `http://localhost:15672`

## Available Scripts

| Script                             | Description                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run start:api:dev`            | Start the API service with hot reload                                                |
| `npm run start:notifications:dev`  | Start the Notification service with hot reload                                       |
| `npm run start:web:dev`            | Start the Web UI (Vite) on port 5174                                                 |
| `npm run build:web`                | Build the Web UI for production                                                      |
| `npm run build`                    | Compile the production build                                                         |
| `npm run start:api:prod`           | Run the compiled API service                                                         |
| `npm run start:notifications:prod` | Run the compiled Notification service                                                |
| `npm run lint`                     | Run ESLint                                                                           |
| `npm run test`                     | Run unit tests                                                                       |
| `npm run test:e2e`                 | Run end-to-end tests                                                                 |
| `npm run test:integration`         | Run cross-service API, Notification service, RabbitMQ, and MongoDB integration tests |
| `npm run test:int:notifications`   | Run the in-app notification fanout integration test                                  |
| `npm run test:cov`                 | Run tests with coverage                                                              |
| `npm run format`                   | Format source and test files with Prettier                                           |

## Project Structure

The project follows a hexagonal structure inside each business module.

```text
apps/
|-- api/
|   `-- src/
|       |-- modules/
|       |   |-- auth/
|       |   |-- users/
|       |   |-- stations/
|       |   `-- measurements/
|       |-- app.module.ts
|       `-- main.ts
`-- notifications/
    `-- src/
        |-- modules/
        |   |-- notification-preferences/
        |   `-- notifications/
        |-- notifications-app.module.ts
        `-- main.ts
libs/
|-- contracts/
`-- shared/
    |-- config/
    |-- exceptions/
    `-- tokens/
```

## Environment Variables

Copy `.env.example` to `.env` and configure the following values:

| Variable                     | Description                                                               | Example                                        |
| ---------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| `PORT`                       | HTTP server port                                                          | `3000`                                         |
| `NOTIFICATIONS_PORT`         | Notification service HTTP port                                            | `3001`                                         |
| `MONGODB_URI`                | MongoDB connection string; Compose defaults to local Mongo when unset     | `mongodb://mongo:27017/weatherflow`            |
| `JWT_SECRET`                 | JWT signing secret                                                        | `your-secret-key`                              |
| `JWT_EXPIRES_IN`             | JWT expiration window                                                     | `7d`                                           |
| `CORS_ORIGINS`               | Allowed browser origins for the Web UI                                    | `http://localhost:5174,http://localhost:8080`  |
| `NOTIFICATION_SERVICE_URL`   | Internal URL the API uses for synchronous calls to notifications          | `http://notifications:3001`                    |
| `RABBITMQ_DEFAULT_USER`      | Local RabbitMQ username created by Compose                                | `weatherflow`                                  |
| `RABBITMQ_DEFAULT_PASS`      | Local RabbitMQ password created by Compose                                | `weatherflow`                                  |
| `RABBITMQ_URL`               | AMQP connection string used by both services                              | `amqp://weatherflow:weatherflow@rabbitmq:5672` |
| `RABBITMQ_ALERT_EXCHANGE`    | Alert exchange name                                                       | `weatherflow.alerts`                           |
| `RABBITMQ_ALERT_QUEUE`       | Notification alert queue name                                             | `weatherflow.notifications.alerts`             |
| `RABBITMQ_ALERT_ROUTING_KEY` | Climate alert routing key                                                 | `alerts.climate.detected`                      |
| `NOTIFICATION_DELIVERY_MODE` | Notification runtime mode for local delivery                              | `log`                                          |
| `TELEGRAM_BOT_TOKEN`         | Telegram bot token used for alert delivery and Telegram account linking   | `your-bot-token`                               |
| `TELEGRAM_BOT_USERNAME`      | Optional bot username shown to users when generating a Telegram link code | `weatherflow_bot`                              |
| `TELEGRAM_WEBHOOK_SECRET`    | Optional secret validated on Telegram webhook requests                    | `your-webhook-secret`                          |

## Local Smoke Checks

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
```

Open `http://localhost:15672` and sign in with `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` from `.env`.

## Testing

```bash
npm run lint
npm run test
npm run test:e2e
npm run test:integration
```

`npm run test:integration` requires the dedicated `.env.integration` settings
described in `docs/testing/integration-tests.md`, including a disposable
MongoDB database and a reachable RabbitMQ broker. For the in-app fanout slice,
`docker compose up mongo rabbitmq` is enough for the local dependencies.

### Mock Data

To populate MongoDB before testing through Swagger, run:

```bash
npm run seed:swagger-mock-data
```

Seed behavior:

- Reuses the one existing real user in the database as the primary account. If you have multiple real users, set `MOCK_PRIMARY_USER_EMAIL` before running the script.
- Creates a second deterministic user with email `collaborator@example.com` and password `mockpass123`.
- Upserts 3 stations across both users.
- Inserts one week of measurements for each station, every 4 hours.
- Configures overlapping station subscriptions so more than one user is subscribed to some stations.
- Leaves Telegram delivery settings untouched for the existing user.

If you need to target a specific existing user:

```powershell
$env:MOCK_PRIMARY_USER_EMAIL="bruno@example.com"
npm run seed:swagger-mock-data
```

## Next Steps

1. Implement `E-02: Domain Layer` starting with the shared value objects and aggregate roots.
2. Add domain-only unit tests for invariants and alert thresholds before filling in application services.
3. Keep the API and infrastructure layers thin until the domain contracts are stable.

## Git Workflow

This repository uses a feature-branch workflow with `main` as the integration branch.

### Branch Naming

| Prefix     | Purpose                    | Example                       |
| ---------- | -------------------------- | ----------------------------- |
| `feature/` | New functionality          | `feature/user-authentication` |
| `bugfix/`  | Non-urgent bug fixes       | `bugfix/fix-login-redirect`   |
| `hotfix/`  | Urgent production fixes    | `hotfix/patch-security-vuln`  |
| `docs/`    | Documentation-only changes | `docs/update-api-readme`      |
| `chore/`   | Maintenance or tooling     | `chore/upgrade-nestjs`        |

### Pull Request Rules

- Open PRs against `main`.
- Require at least one approving review before merge.
- Ensure build, lint, and test checks pass.
- Prefer squash merges.
- Use Conventional Commits in PR titles and commits when possible.

## License

UNLICENSED
