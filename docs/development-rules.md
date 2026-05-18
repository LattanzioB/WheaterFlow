# WeatherFlow Development Rules

## 1. Git Workflow Rules

### Branch Naming

All work happens on feature branches off `main`. Use the following prefixes:

| Prefix      | Purpose                        | Example                          |
| ----------- | ------------------------------ | -------------------------------- |
| `feature/`  | New functionality              | `feature/station-registration`   |
| `bugfix/`   | Bug fixes                      | `bugfix/jwt-token-expiry`        |
| `docs/`     | Documentation only             | `docs/swagger-measurements`      |
| `test/`     | Adding or fixing tests         | `test/user-entity-specs`         |

### Commit Message Conventions (Conventional Commits)

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

**Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `style`, `perf`

**Scopes:** `auth`, `users`, `stations`, `measurements`, `notifications`, `shared`, `infra`

Examples:

```
feat(stations): add station registration use case
fix(auth): handle expired refresh token edge case
docs(measurements): add Swagger decorators to controller
test(users): add unit tests for Email value object
refactor(shared): extract Result pattern to shared kernel
```

### Pull Request Process

1. Create a PR from your feature branch into `main`.
2. PR title follows the same conventional commit format.
3. PR description must include:
   - **What** changed and **why**.
   - Link to related issue or user story (if applicable).
   - Checklist: tests pass, linting passes, Swagger updated (if endpoint changed).
4. At least **1 approval** required before merge.
5. All CI checks (lint, tests, build) must pass.

### Merge Strategy

- Use **Squash and Merge** into `main` to keep a linear history.
- Delete the source branch after merge.

### Branch Protection (main)

- Direct pushes to `main` are **forbidden**.
- Force pushes to `main` are **forbidden**.
- Require passing CI status checks before merge.
- Require at least 1 approving review.

---

## 2. Code Architecture Rules

### Project Structure

```
src/
├── modules/
│   ├── auth/
│   │   ├── domain/           # Entities, Value Objects, Domain Services, Ports
│   │   ├── application/      # Use Cases (Application Services)
│   │   └── infrastructure/   # Adapters (Controllers, Repositories, etc.)
│   ├── users/
│   ├── stations/
│   ├── measurements/
│   └── notifications/
└── shared/                   # Shared Kernel (Result, base classes, domain events)
```

### Domain Layer Rules

- **No framework imports.** Domain code must be pure TypeScript — no NestJS, Mongoose, Express, or any third-party library imports.
- Entities must have a unique identity and encapsulate business logic.
- Value Objects are **immutable** — all properties are `readonly`, no setters.
- Domain Services contain logic that does not naturally belong to a single entity.
- Domain errors are expressed via the **Result pattern** (see Section 5), never by throwing exceptions.
- Domain events follow the naming convention: `{Entity}{Action}Event` (e.g., `StationRegisteredEvent`, `MeasurementRecordedEvent`).

### Port Definitions

- Ports live inside the `domain/` folder (e.g., `domain/ports/`).
- A port is a **TypeScript interface only** — no implementations, no abstract classes.
- Port names describe the capability: `StationRepository`, `NotificationSender`, `TokenProvider`.
- Ports never reference framework-specific types.

### Adapter Rules

- Adapters live inside the `infrastructure/` folder.
- Every adapter **implements** exactly one port interface.
- Framework-specific code (NestJS decorators, Mongoose schemas, JWT libraries) is allowed **only** in adapters.
- Controllers are adapters for the HTTP driving port.
- Repository implementations are adapters for the persistence driven port.
- Adapters convert between DTOs/database models and domain objects at the boundary.

### NestJS Module Organization

- Each bounded context (`auth`, `users`, `stations`, `measurements`, `notifications`) is a **NestJS module**.
- Module files (`*.module.ts`) live at the root of each module folder.
- Providers bind port interfaces to adapter implementations using custom provider tokens:

```typescript
{
  provide: 'StationRepository',       // Port token
  useClass: MongoStationRepository,   // Adapter implementation
}
```

- Cross-module communication happens through **exported services or domain events**, never by importing another module's domain internals directly.

---

## 3. Testing Rules

### General Requirements

- Unit tests are **required** for ALL:
  - Domain entities
  - Value objects
  - Domain services
  - Use cases (application services)
- Integration tests are encouraged for adapter implementations.

### File Naming and Location

- Test files use the suffix `*.spec.ts`.
- Tests are **colocated** with the source file they test:

```
domain/
├── entities/
│   ├── station.entity.ts
│   └── station.entity.spec.ts
├── value-objects/
│   ├── coordinates.vo.ts
│   └── coordinates.vo.spec.ts
```

### Coverage Targets

| Layer       | Minimum Coverage |
| ----------- | ---------------- |
| Domain      | **90%**          |
| Application | **80%**          |
| Adapters    | **60%**          |

### Testing Principles

- **No mocking of domain objects.** Always test entities and value objects with real instances.
- Ports (interfaces) used by use cases **should** be mocked/stubbed in unit tests.
- Each test follows **Arrange-Act-Assert** structure.
- Test descriptions use the pattern: `should <expected behavior> when <condition>`.
- Tests must be deterministic — no reliance on system time, random values, or external services.

### Running Tests

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:cov

# Run tests for a specific module
npm run test -- --testPathPattern=stations
```

---

## 4. Documentation Rules

### README Requirements

The project `README.md` must include the following sections:

1. **Project Description** — what WeatherFlow is and its purpose.
2. **Prerequisites** — Node.js 20, npm/yarn, MongoDB Atlas account, Git.
3. **Installation** — step-by-step clone and dependency install.
4. **Environment Variables** — table of all required env vars with descriptions and example values.
5. **Running Locally** — how to start the development server.
6. **Running Tests** — how to run unit and integration tests.
7. **API Documentation** — how to access Swagger UI (e.g., `http://localhost:3000/api`).

### Swagger / OpenAPI

- Every controller endpoint must have Swagger decorators:
  - `@ApiTags()` on the controller class.
  - `@ApiOperation()` on each method.
  - `@ApiResponse()` for success and error responses.
  - `@ApiBody()` and `@ApiParam()` where applicable.
  - `@ApiBearerAuth()` on authenticated endpoints.
- DTOs used in request/response must have `@ApiProperty()` on every field.

### Architecture Documentation (C4 Model)

Three levels of C4 diagrams are required:

1. **Context Diagram (Level 1):** WeatherFlow system, users (station operators, administrators), and external systems.
2. **Container Diagram (Level 2):** NestJS API, MongoDB Atlas, external notification services, JWT auth provider.
3. **Component Diagram (Level 3):** One per module showing domain, application, and infrastructure layers with port/adapter boundaries.

Diagrams must be stored in `docs/` and can use Draw.io, PlantUML, or Structurizr DSL.

### UML Diagrams

- **Class Diagrams:** Required for each module. Must clearly separate:
  - Domain layer (entities, value objects, domain services, ports).
  - Application layer (use cases).
  - Infrastructure layer (adapters, controllers, repositories).
- **Sequence Diagrams:** Required for each use case, showing the flow from controller through use case to repository and back.

All UML diagrams must be stored in `docs/` as source files (`.puml`, `.drawio`) and exported images (`.png` or `.svg`).

### Database Diagram

- An Entity-Relationship diagram showing all MongoDB collections, their fields, types, and relationships.
- Stored in `docs/` as both source and exported image.

---

## 5. Code Style Rules

### TypeScript Configuration

- `strict: true` must be enabled in `tsconfig.json` — this includes `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, etc.
- `noUnusedLocals: true` and `noUnusedParameters: true` must be enabled.
- Use `unknown` instead of `any` wherever possible.

### Value Objects

- All properties must be `readonly`.
- No setter methods.
- Validation happens in a static factory method that returns a `Result`:

```typescript
export class Email {
  private constructor(readonly value: string) {}

  static create(value: string): Result<Email> {
    if (!Email.isValid(value)) {
      return Result.fail('Invalid email format');
    }
    return Result.ok(new Email(value));
  }

  private static isValid(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
```

### Result Pattern

- Domain operations that can fail must return `Result<T>` instead of throwing exceptions.
- The `Result` class lives in `src/shared/result.ts`.
- Exceptions may only be thrown in infrastructure/adapter code for truly exceptional situations (e.g., database connection lost).
- Controllers translate `Result` failures into appropriate HTTP error responses.

### DTOs

- DTOs exist **only** at adapter boundaries (controllers, external API clients).
- DTOs are **plain classes** with Swagger decorators and validation decorators (`class-validator`).
- Domain objects are never exposed directly to the outside world.
- Mapping between DTOs and domain objects happens in the adapter layer (controller or mapper class).

### Domain Events

- Event class names follow: `{Entity}{Action}Event`.
  - Examples: `UserRegisteredEvent`, `StationDeactivatedEvent`, `MeasurementRecordedEvent`.
- Events are immutable data classes with a `readonly occurredOn: Date` property.
- Events carry only the data needed by consumers — no full entity references.

### General Conventions

- Use `interface` for port definitions, `class` for implementations.
- Prefer composition over inheritance in domain objects.
- Avoid primitive obsession — wrap primitives in value objects when they carry domain meaning (e.g., `StationId`, `Email`, `Coordinates`).
- One class per file. File name matches class name in kebab-case (e.g., `station.entity.ts`, `coordinates.vo.ts`).
- Barrel exports (`index.ts`) are allowed at the domain layer root for convenience but must not re-export infrastructure code.

### Linting and Formatting

- ESLint with `@typescript-eslint` plugin must be configured.
- Prettier must be configured for consistent formatting.
- Run lint and format checks before committing:

```bash
npm run lint
npm run format
```

- CI must fail on lint or format violations.

---

## 6. Environment and Infrastructure Rules

### Environment Variables

- All environment variables must be documented in `.env.example` with placeholder values.
- `.env` files are **never** committed — they must be listed in `.gitignore`.
- Use NestJS `ConfigModule` with validation (Joi or class-validator) to fail fast on missing config.

### Required Environment Variables

| Variable            | Description                     | Example                            |
| ------------------- | ------------------------------- | ---------------------------------- |
| `PORT`              | Application port                | `3000`                             |
| `MONGODB_URI`       | MongoDB Atlas connection string | `mongodb+srv://...`                |
| `JWT_SECRET`        | Secret for signing JWTs         | `your-secret-key`                  |
| `JWT_EXPIRATION`    | Token expiration time           | `1h`                               |

### Local Development

- `npm run start:dev` for watch mode.
- MongoDB Atlas free tier for development database.
- Seed scripts (if any) live in `src/shared/seeds/`.
