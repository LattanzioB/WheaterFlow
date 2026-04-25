# E-04: Adapters & Infrastructure

**Status:** Not Started
**Priority:** High
**Depends On:** E-03B

**Description:** Build the infrastructure adapters that fulfill the aligned port contracts: MongoDB/Mongoose repository implementations, REST controllers with DTOs and validation, JWT authentication guard, preference-aware notification delivery wiring, and NestJS module composition.

## Acceptance Criteria

- [ ] Mongoose schemas and repository adapters implement all repository port interfaces
- [ ] REST controllers expose endpoints for auth, users, stations, and measurements
- [ ] JWT strategy and AuthGuard protect private endpoints
- [ ] DTOs with `class-validator` decorators for all request payloads
- [ ] User persistence and DTOs model alert subscriptions/preferences separately from delivery-channel settings
- [ ] Notification adapters resolve generic delivery requests into Telegram-specific calls only at the infrastructure boundary
- [ ] NestJS modules wire ports to adapters via dependency injection
- [ ] Application starts and all endpoints respond correctly via manual/Postman testing
- [ ] Password hashing adapter (bcrypt) implements `PasswordHasher` port

## Stories

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

## Dependencies

E-03B (aligned notification and preference contracts defined)

## Deliverables Covered

- ✅ Solution running locally (fully functional at this point)
- ✅ UML class diagrams — Adapters layer (adapter implementations here)
