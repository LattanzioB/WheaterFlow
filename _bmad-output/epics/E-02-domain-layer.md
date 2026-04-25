# E-02: Domain Layer

**Status:** In Review
**Priority:** High
**Depends On:** E-01

**Description:** Implement the three DDD aggregates (`User`, `WeatherStation`, `Measurement`) with their value objects, domain events, and domain services. Every domain class must have comprehensive unit tests covering invariants and edge cases.

## Acceptance Criteria

- [x] Aggregate roots: `User`, `WeatherStation`, `Measurement` implemented with business rules
- [x] Value objects: `Email`, `Location`, `Temperature`, `Humidity`, `Pressure` with self-validation
- [x] Domain event `MeasurementAlertDetectedEvent` emitted when thresholds are breached
- [x] Alert rules enforced: heat >40 C, frost <0 C, storms <980 hPa, humidity >90%
- [x] Domain services for alert evaluation logic
- [x] Unit test coverage >= 90% for all domain classes
- [x] No framework dependencies in the domain layer (pure TypeScript)

## Stories

| ID | Title | Description | Estimate | Status |
|---|---|---|---|---|
| S-02.1 | Value objects | Implement `Email`, `Location`, `Temperature`, `Humidity`, `Pressure` with validation and equality semantics | 3h | Done |
| S-02.2 | User aggregate | Implement `User` aggregate root with roles, credentials, and associated station references | 2h | Done |
| S-02.3 | WeatherStation aggregate | Implement `WeatherStation` with location, owner, status, and alert-rule configuration | 2h | Done |
| S-02.4 | Measurement aggregate | Implement `Measurement` with temperature, humidity, pressure, timestamp, and station reference | 2h | Done |
| S-02.5 | Domain events and alert rules | Create `MeasurementAlertDetectedEvent` and domain service `AlertEvaluator` applying the four threshold rules | 3h | Done |
| S-02.6 | Domain unit tests | Write Jest tests for all value objects, aggregates, domain events, and alert evaluation logic | 4h | Done |

## Dependencies

E-01 (project scaffolded)

## Completion Notes

- Added pure TypeScript domain code under `src/modules/*/domain/` with no NestJS or Mongoose imports.
- Implemented immutable value objects for `Email`, `Location`, `Temperature`, `Humidity`, `Pressure`, and station alert preferences.
- Implemented `User`, `WeatherStation`, and `Measurement` aggregate roots with constructor factories, identity generation, invariants, and state mutation methods.
- Added repository ports for users, stations, and measurements inside the domain layer.
- Added `AlertEvaluator` and `MeasurementAlertDetectedEvent`; `Measurement.create()` now auto-evaluates alerts using the documented rule priority.
- Clarified the story ambiguity around station alert configuration and implemented simple per-alert enable/disable flags.
- Domain-only coverage is above the target: 96.49% statements/lines, 95.83% branches, and 96.66% functions.

## Branches and PRs

| Story | Branch | PR |
|---|---|---|
| S-02.1 | `feature/s-02-1-value-objects` | [#3](https://github.com/LattanzioB/WheaterFlow/pull/3) |
| S-02.2 | `feature/s-02-2-user-aggregate` | [#4](https://github.com/LattanzioB/WheaterFlow/pull/4) |
| S-02.3 | `feature/s-02-3-weather-station` | [#5](https://github.com/LattanzioB/WheaterFlow/pull/5) |
| S-02.4 | `feature/s-02-4-measurement-aggregate` | [#6](https://github.com/LattanzioB/WheaterFlow/pull/6) |
| S-02.5 | `feature/s-02-5-alert-evaluator` | [#7](https://github.com/LattanzioB/WheaterFlow/pull/7) |
| S-02.6 | `feature/s-02-6-domain-test-coverage` | Pending creation |

## Deliverables Covered

- Code in internet repo with feature-branch workflow
- Unit tests for domain
- Domain model aligned with hexagonal architecture
