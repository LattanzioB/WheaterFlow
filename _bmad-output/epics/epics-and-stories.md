## E-01: Project Foundation

**Description:** Bootstrap the WeatherFlow monorepo with NestJS 11, TypeScript strict mode, and hexagonal architecture folder structure. Configure Docker Compose for local MongoDB, establish the feature-branch Git workflow, and provide a README with setup/run instructions.

**Acceptance Criteria:**
- [ ] NestJS 11 project scaffolded with TypeScript strict mode enabled
- [ ] Hexagonal folder structure created: `domain/`, `application/`, `infrastructure/` per module
- [ ] Docker Compose runs MongoDB Atlas-compatible local instance
- [ ] `npm run start:dev` launches the app and connects to MongoDB
- [ ] README documents prerequisites (Node 20, Docker), install steps, and run commands
- [ ] Feature-branch workflow documented (naming convention, PR rules)
- [ ] CI-ready: lint and test scripts configured in `package.json`

**Stories:**

| ID | Title | Description | Estimate |
|---|---|---|---|
| S-01.1 | Scaffold NestJS project | Initialize NestJS 11 with TypeScript strict, ESLint, Prettier, and Jest pre-configured | 2h |
| S-01.2 | Define hexagonal folder structure | Create `src/modules/{auth,users,stations,measurements,notifications}` each with `domain/`, `application/`, `infrastructure/` subdirectories | 1h |
| S-01.3 | Docker Compose for MongoDB | Create `docker-compose.yml` with MongoDB 7 service, health check, and persistent volume | 1h |
| S-01.4 | Environment configuration | Set up `@nestjs/config` with `.env.example` for DB URI, JWT secret, and port | 1h |
| S-01.5 | README and Git workflow | Write README with prerequisites, setup commands, run instructions, and feature-branch naming convention | 1h |

**Dependencies:** None

---

## E-02: Domain Layer

**Description:** Implement the three DDD aggregates (User, WeatherStation, Measurement) with their value objects, domain events, and domain services. Every domain class must have comprehensive unit tests covering invariants and edge cases.

**Acceptance Criteria:**
- [ ] Aggregate roots: `User`, `WeatherStation`, `Measurement` implemented with business rules
- [ ] Value objects: `Email`, `Location`, `Temperature`, `Humidity`, `Pressure` with self-validation
- [ ] Domain event `MeasurementAlertDetectedEvent` emitted when thresholds are breached
- [ ] Alert rules enforced: heat >40C, frost <0C, storms <980 hPa, humidity >90%
- [ ] Domain services for alert evaluation logic
- [ ] Unit test coverage >= 90% for all domain classes
- [ ] No framework dependencies in the domain layer (pure TypeScript)

**Stories:**

| ID | Title | Description | Estimate |
|---|---|---|---|
| S-02.1 | Value objects | Implement `Email`, `Location`, `Temperature`, `Humidity`, `Pressure` with validation and equality semantics | 3h |
| S-02.2 | User aggregate | Implement `User` aggregate root with roles, credentials, and associated station references | 2h |
| S-02.3 | WeatherStation aggregate | Implement `WeatherStation` with location, owner, status, and alert-rule configuration | 2h |
| S-02.4 | Measurement aggregate | Implement `Measurement` with temperature, humidity, pressure, timestamp, and station reference | 2h |
| S-02.5 | Domain events and alert rules | Create `MeasurementAlertDetectedEvent` and domain service `AlertEvaluator` applying the four threshold rules | 3h |
| S-02.6 | Domain unit tests | Write Jest tests for all value objects, aggregates, domain events, and alert evaluation logic | 4h |

**Dependencies:** E-01

---

## E-03: Ports & Application Layer

**Description:** Define port interfaces (repositories, external services) and implement application-level use cases as application services. Each use case follows the hexagonal pattern: depends only on port abstractions, never on infrastructure.

**Acceptance Criteria:**
- [ ] Repository port interfaces defined for each aggregate (`UserRepository`, `WeatherStationRepository`, `MeasurementRepository`)
- [ ] Notification port interface defined (`AlertNotifier`)
- [ ] Auth port interface defined (`TokenService`)
- [ ] Use cases implemented: register user, login, CRUD stations, record measurement, query measurements, trigger alerts
- [ ] Use cases depend exclusively on port interfaces (no infrastructure imports)
- [ ] Unit tests for use cases using mock implementations of ports

**Stories:**

| ID | Title | Description | Estimate |
|---|---|---|---|
| S-03.1 | Repository port interfaces | Define `UserRepository`, `WeatherStationRepository`, `MeasurementRepository` interfaces in each module's `application/ports/` | 2h |
| S-03.2 | Service port interfaces | Define `TokenService`, `PasswordHasher`, `AlertNotifier` port interfaces | 1h |
| S-03.3 | Auth use cases | Implement `RegisterUser` and `LoginUser` application services | 3h |
| S-03.4 | Station use cases | Implement `CreateStation`, `UpdateStation`, `DeleteStation`, `ListUserStations` | 3h |
| S-03.5 | Measurement use cases | Implement `RecordMeasurement` (with alert evaluation trigger), `QueryMeasurements` | 3h |
| S-03.6 | Application layer unit tests | Test all use cases with mocked port implementations, covering happy paths and error cases | 3h |

**Dependencies:** E-02

---

## E-03B: Notification Preferences & Channel Separation

**Description:** Correct the notification model before infrastructure work begins by separating user alert subscriptions/preferences from channel-specific delivery configuration. Users subscribe to station alerts they care about, while Telegram remains only one delivery mechanism.

**Acceptance Criteria:**
- [ ] User notification intent is modeled separately from channel delivery settings
- [ ] Subscription logic supports station subscriptions plus selected alert types
- [ ] Application-layer notification contracts are channel-agnostic (no Telegram-specific fields)
- [ ] Recipient resolution filters by station subscription and alert type before delivery
- [ ] User repository and application services expose the data needed for preference-aware notification delivery
- [ ] Unit tests cover preference filtering and users without configured delivery channels

**Stories:**

| ID | Title | Description | Estimate |
|---|---|---|---|
| S-03B.1 | Domain preference model | Introduce user-level alert preference modeling separate from channel settings | 3h |
| S-03B.2 | Application port realignment | Refactor notification payloads and repository/application contracts to remove Telegram-specific fields | 2h |
| S-03B.3 | Preference-aware use cases | Update subscription and notification application services to resolve recipients by station and alert type | 3h |
| S-03B.4 | Alignment tests and docs | Add tests for preference-aware alert routing and update dependent planning/docs artifacts | 2h |

**Dependencies:** E-03

---

## E-04: Adapters & Infrastructure

**Description:** Build the infrastructure adapters that fulfill the aligned port contracts: MongoDB/Mongoose repository implementations, REST controllers with DTOs and validation, JWT authentication guard, preference-aware notification delivery wiring, and NestJS module composition.

**Acceptance Criteria:**
- [ ] Mongoose schemas and repository adapters implement all repository port interfaces
- [ ] REST controllers expose endpoints for auth, users, stations, and measurements
- [ ] JWT strategy and AuthGuard protect private endpoints
- [ ] DTOs with `class-validator` decorators for all request payloads
- [ ] User persistence and DTOs model alert subscriptions/preferences separately from delivery-channel settings
- [ ] Notification adapters resolve generic delivery requests into Telegram-specific calls only at the infrastructure boundary
- [ ] NestJS modules wire ports to adapters via dependency injection
- [ ] Application starts and all endpoints respond correctly via manual/Postman testing
- [ ] Password hashing adapter (bcrypt) implements `PasswordHasher` port

**Stories:**

| ID | Title | Description | Estimate |
|---|---|---|---|
| S-04.1 | Mongoose schemas | Define Mongoose schemas and document mappings for User, WeatherStation, and Measurement, including notification preferences and delivery settings | 3h |
| S-04.2 | Repository adapters | Implement MongoDB repository adapters for each aggregate, including preference-aware subscriber queries | 4h |
| S-04.3 | Auth infrastructure | Implement JWT `TokenService` adapter, bcrypt `PasswordHasher`, and `JwtAuthGuard` | 3h |
| S-04.4 | Auth controllers | Create `POST /auth/register` and `POST /auth/login` endpoints with DTOs, including optional channel configuration capture | 2h |
| S-04.5 | User notification preference controllers | Create endpoints to manage station subscriptions, alert-type preferences, and delivery settings | 2h |
| S-04.6 | Station controllers | Create CRUD endpoints for stations with ownership validation and auth guard | 3h |
| S-04.7 | Measurement controllers | Create `POST /measurements` and `GET /measurements` endpoints with query filters and preference-aware alert triggering | 2h |
| S-04.8 | NestJS module wiring | Configure each NestJS module to bind port tokens to adapter implementations via providers, including notification adapters | 2h |

**Dependencies:** E-03B

---

## E-05: API Documentation & Database

**Description:** Integrate Swagger/OpenAPI for auto-generated API documentation and produce the database entity-relationship diagram showing all MongoDB collections, their fields, types, relationships, and the split between notification preferences and delivery settings.

**Acceptance Criteria:**
- [ ] Swagger UI accessible at `/api/docs` with all endpoints documented
- [ ] DTOs decorated with `@ApiProperty` including descriptions and examples
- [ ] API responses documented with status codes (200, 201, 400, 401, 404)
- [ ] Database diagram (ER diagram) showing all collections, fields, types, indexes, references, notification preferences, and delivery settings
- [ ] Database diagram exported as image and included in `docs/`

**Stories:**

| ID | Title | Description | Estimate |
|---|---|---|---|
| S-05.1 | Swagger setup | Install `@nestjs/swagger`, configure `DocumentBuilder` in `main.ts`, enable Swagger UI at `/api/docs` | 1h |
| S-05.2 | DTO and endpoint documentation | Add `@ApiProperty`, `@ApiTags`, `@ApiOperation`, `@ApiResponse` decorators to all DTOs and controllers, including notification preference endpoints | 3h |
| S-05.3 | Authentication in Swagger | Configure Bearer JWT auth scheme in Swagger so protected endpoints can be tested from the UI | 1h |
| S-05.4 | Database diagram | Create ER diagram of MongoDB collections (users, stations, measurements) with field types, indexes, references, alert preferences, and channel settings | 2h |

**Dependencies:** E-04

---

## E-06: Architecture Documentation

**Description:** Produce all required architecture diagrams: C4 model (Context, Container, Component levels), UML class diagrams explicitly differentiating Domain, Ports, and Adapters layers, and sequence diagrams for the main use cases, including notification preference resolution separated from Telegram delivery.

**Acceptance Criteria:**
- [ ] C4 Context diagram showing WeatherFlow system, actors (User, External APIs), and boundaries
- [ ] C4 Container diagram showing NestJS monolith, MongoDB, and external integrations
- [ ] C4 Component diagram showing internal modules and their relationships
- [ ] UML class diagrams for each module separating Domain, Ports, and Adapters with clear stereotypes
- [ ] Sequence diagrams for: user registration, preference-aware record measurement with alert detection, manage notification preferences, query measurements
- [ ] All diagrams stored in `docs/` as source files (`.drawio`, `.puml`, or `.mmd`) and exported images

**Stories:**

| ID | Title | Description | Estimate |
|---|---|---|---|
| S-06.1 | C4 Context and Container diagrams | Create C4 Level 1 (system context) and Level 2 (container) diagrams using draw.io or PlantUML | 3h |
| S-06.2 | C4 Component diagram | Create C4 Level 3 showing Auth, Users, Stations, Measurements, Notifications modules and the preference-resolution flow before channel delivery | 3h |
| S-06.3 | UML class diagrams - Domain layer | Create class diagrams for aggregates, value objects, domain events, and domain services | 3h |
| S-06.4 | UML class diagrams - Ports and Adapters | Create class diagrams showing port interfaces and adapter implementations with dependency direction, including generic notification requests and Telegram-only adapters | 3h |
| S-06.5 | Use case sequence diagrams | Create sequence diagrams for register, login, record measurement (with preference-aware alert flow), manage notification preferences, and query measurements | 3h |

**Dependencies:** E-04 (needs finalized class structure); E-02, E-03, E-03B (for accurate domain and port modeling)
