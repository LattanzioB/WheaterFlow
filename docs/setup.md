# Setup & Development Guide — WeatherFlow

## Prerequisites

- Node.js 20+
- npm 9+
- MongoDB Atlas account (free tier works)
- Telegram Bot Token (optional — needed for alert notifications)

---

## Initial Setup

### 1. Scaffold the project

```bash
npm install -g @nestjs/cli
nest new weatherflow --strict --skip-git --package-manager=npm
cd weatherflow
```

### 2. Install dependencies

```bash
# Database
npm install @nestjs/mongoose mongoose

# Auth
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt

# API docs
npm install @nestjs/swagger swagger-ui-express

# Config
npm install @nestjs/config

# Validation
npm install class-validator class-transformer

# Events (for Telegram notifications)
npm install @nestjs/event-emitter

# HTTP client (for Telegram Bot API)
npm install axios
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

```env
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/weatherflow
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
TELEGRAM_BOT_TOKEN=your-bot-token-here
```

**Getting MongoDB URI:**
1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a database user
3. Whitelist your IP (or use 0.0.0.0/0 for dev)
4. Copy the connection string

**Getting Telegram Bot Token:**
1. Message `@BotFather` on Telegram
2. Send `/newbot` and follow instructions
3. Copy the token provided

---

## Running the Project

```bash
# Development (hot reload)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

API is available at: `http://localhost:3000`
Swagger docs at: `http://localhost:3000/api/docs`

---

## Running Tests

```bash
# All unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov
```

**What to test:** Focus on domain layer — entities and value objects.
```bash
# Examples
npm run test -- user.entity.spec.ts
npm run test -- measurement.entity.spec.ts
npm run test -- email.value-object.spec.ts
npm run test -- temperature.value-object.spec.ts
```

---

## Project Structure Quick Reference

```
src/
├── auth/                   # JWT auth (login, register, guard, strategy)
├── modules/
│   ├── users/              # User aggregate
│   │   ├── domain/         # Entity, value objects, port interface
│   │   ├── application/    # Services (CRUD + subscriptions)
│   │   ├── infrastructure/ # MongoRepository + Mapper
│   │   └── interface/      # Controller + DTOs
│   ├── stations/           # WeatherStation aggregate (same structure)
│   ├── measurements/       # Measurement aggregate (same structure)
│   └── notifications/      # INotificationPort + TelegramAdapter
└── shared/
    ├── exceptions/         # Domain exceptions + HTTP filter
    ├── tokens/             # Injection token constants
    └── config/             # ConfigModule setup
```

---

## Git Workflow

This project uses **feature-branch workflow**:

```bash
# Start a new feature
git checkout -b feature/create-user-aggregate

# Work, commit, push
git add .
git commit -m "feat: implement User entity and Email value object"
git push origin feature/create-user-aggregate

# Open PR → review → merge to main
```

**Branch naming:** `feature/<description>`, `fix/<description>`, `docs/<description>`

---

## Development Tips

- **Layer discipline:** Never import from `infrastructure/` in `domain/` or `application/`.
- **Value objects:** Always use static `create()` factory — never `new` directly.
- **Repositories:** Always inject via token (`USER_REPOSITORY_TOKEN`), not the concrete class.
- **Alert logic:** The `evaluateAlerts()` method is called inside `Measurement.create()`. It sets both `alertStatus` and `alertType` automatically.
- **Swagger:** Add `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()` to all controllers so docs stay up to date.
