# WeatherFlow

WeatherFlow is a weather monitoring REST API built with **NestJS 11** and **MongoDB**. This repository currently contains the project foundation: strict TypeScript configuration, shared environment handling, MongoDB wiring, Swagger bootstrap, and a hexagonal module scaffold for the core domains.

## Tech Stack

| Technology | Purpose |
|---|---|
| NestJS 11 | Application framework |
| TypeScript (strict) | Type-safe backend development |
| MongoDB 7 + Mongoose | Local and cloud document database access |
| Swagger / OpenAPI | Interactive API documentation |
| Docker Compose | Local MongoDB infrastructure |
| Jest + SWC | Unit and e2e testing |
| ESLint + Prettier | Linting and formatting |

## Prerequisites

| Tool | Version |
|---|---|
| [Node.js](https://nodejs.org/) | 20+ |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest |
| npm | Bundled with Node.js |

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
# Start MongoDB
docker compose up -d

# Start the NestJS app in watch mode
npm run start:dev
```

With the local Docker service running, the application connects to MongoDB using the `MONGODB_URI` from `.env`.

- API base URL: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs-json`

## Available Scripts

| Script | Description |
|---|---|
| `npm run start:dev` | Start the development server with hot reload |
| `npm run build` | Compile the production build |
| `npm run start:prod` | Run the compiled app |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:cov` | Run tests with coverage |
| `npm run format` | Format source and test files with Prettier |

## Project Structure

The project follows a hexagonal structure inside each business module.

```text
src/
|-- main.ts
|-- app.module.ts
|-- app.controller.ts
|-- app.service.ts
|-- modules/
|   |-- auth/
|   |   |-- auth.module.ts
|   |   |-- domain/
|   |   |-- application/
|   |   |-- infrastructure/
|   |   `-- interface/
|   |-- users/
|   |   |-- users.module.ts
|   |   |-- domain/
|   |   |-- application/
|   |   |-- infrastructure/
|   |   `-- interface/
|   |-- stations/
|   |   |-- stations.module.ts
|   |   |-- domain/
|   |   |-- application/
|   |   |-- infrastructure/
|   |   `-- interface/
|   |-- measurements/
|   |   |-- measurements.module.ts
|   |   |-- domain/
|   |   |-- application/
|   |   |-- infrastructure/
|   |   `-- interface/
|   `-- notifications/
|       |-- notifications.module.ts
|       |-- domain/
|       |-- application/
|       `-- infrastructure/
`-- shared/
    |-- config/
    |-- exceptions/
    `-- tokens/
```

## Environment Variables

Copy `.env.example` to `.env` and configure the following values:

| Variable | Description | Example |
|---|---|---|
| `PORT` | HTTP server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/weatherflow` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `JWT_EXPIRES_IN` | JWT expiration window | `7d` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for future notification features | `your-bot-token` |

## Testing

```bash
npm run lint
npm run test
npm run test:e2e
```

## Next Steps

1. Implement `E-02: Domain Layer` starting with the shared value objects and aggregate roots.
2. Add domain-only unit tests for invariants and alert thresholds before filling in application services.
3. Keep the API and infrastructure layers thin until the domain contracts are stable.

## Git Workflow

This repository uses a feature-branch workflow with `main` as the integration branch.

### Branch Naming

| Prefix | Purpose | Example |
|---|---|---|
| `feature/` | New functionality | `feature/user-authentication` |
| `bugfix/` | Non-urgent bug fixes | `bugfix/fix-login-redirect` |
| `hotfix/` | Urgent production fixes | `hotfix/patch-security-vuln` |
| `docs/` | Documentation-only changes | `docs/update-api-readme` |
| `chore/` | Maintenance or tooling | `chore/upgrade-nestjs` |

### Pull Request Rules

- Open PRs against `main`.
- Require at least one approving review before merge.
- Ensure build, lint, and test checks pass.
- Prefer squash merges.
- Use Conventional Commits in PR titles and commits when possible.

## License

UNLICENSED
