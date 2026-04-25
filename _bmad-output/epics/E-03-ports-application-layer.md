# E-03: Ports & Application Layer

**Status:** In Review
**Priority:** High
**Depends On:** E-02

**Description:** Define port interfaces (repositories, external services) and implement application-level use cases as application services. Each use case follows the hexagonal pattern: depends only on port abstractions, never on infrastructure.

## Acceptance Criteria

- [x] Repository port interfaces defined for each aggregate (`UserRepository`, `WeatherStationRepository`, `MeasurementRepository`)
- [x] Notification port interface defined (`AlertNotifier`)
- [x] Auth port interface defined (`TokenService`)
- [x] Use cases implemented: register user, login, CRUD stations, record measurement, query measurements, trigger alerts
- [x] Use cases depend exclusively on port interfaces (no infrastructure imports)
- [x] Unit tests for use cases using mock implementations of ports

## Stories

| ID | Title | Description | Estimate | Status |
|---|---|---|---|---|
| S-03.1 | Repository port interfaces | Define `UserRepository`, `WeatherStationRepository`, `MeasurementRepository` interfaces in each module's `application/ports/` | 2h | Done |
| S-03.2 | Service port interfaces | Define `TokenService`, `PasswordHasher`, `AlertNotifier` port interfaces | 1h | Done |
| S-03.3 | Auth use cases | Implement `RegisterUser` and `LoginUser` application services | 3h | Done |
| S-03.4 | Station use cases | Implement `CreateStation`, `UpdateStation`, `DeleteStation`, `ListUserStations` | 3h | Done |
| S-03.5 | Measurement use cases | Implement `RecordMeasurement` (with alert evaluation trigger), `QueryMeasurements` | 3h | Done |
| S-03.6 | Application layer unit tests | Test all use cases with mocked port implementations, covering happy paths and error cases | 3h | Done |

## Dependencies

E-02 (domain layer complete)

## Completion Notes

- Added application-layer repository ports for users, stations, and measurements while keeping the previous domain port paths as compatibility re-exports.
- Added service-side ports for token generation, password hashing, and outbound alert delivery, plus shared injection tokens under `src/shared/tokens/`.
- Implemented `RegisterUserService` and `LoginUserService` with email uniqueness checks, password hashing/verification, and token issuance through ports.
- Implemented station application services for create, update, delete, and list-by-owner flows, including owner existence validation during station creation.
- Implemented measurement application services for recording and querying measurements, including filter validation, alert-event emission, and an event-driven `NotificationService`.
- Enabled `EventEmitterModule` in `AppModule` so the application alert workflow matches the documented architecture.
- Application-layer coverage is above the target: 98.74% statements/lines, 80.85% branches, and 100% functions.

## Alignment Notes

- The current notification payloads still expose Telegram delivery details at the application boundary, and subscriber selection is based on station membership only.
- `E-03B: Notification Preferences & Channel Separation` is the planned corrective pass to separate alert subscriptions/preferences from channel configuration and to make the notifier contract channel-agnostic before E-04 infrastructure is implemented.

## Branches and PRs

| Story | Branch | PR |
|---|---|---|
| S-03.1 | `feature/s-03-1-repository-port-interfaces` | [#9](https://github.com/LattanzioB/WheaterFlow/pull/9) |
| S-03.2 | `feature/s-03-2-service-port-interfaces` | [#10](https://github.com/LattanzioB/WheaterFlow/pull/10) |
| S-03.3 | `feature/s-03-3-auth-use-cases` | [#11](https://github.com/LattanzioB/WheaterFlow/pull/11) |
| S-03.4 | `feature/s-03-4-station-use-cases` | [#12](https://github.com/LattanzioB/WheaterFlow/pull/12) |
| S-03.5 | `feature/s-03-5-measurement-use-cases` | [#13](https://github.com/LattanzioB/WheaterFlow/pull/13) |
| S-03.6 | `feature/s-03-6-application-test-coverage` | [#14](https://github.com/LattanzioB/WheaterFlow/pull/14) |

## Deliverables Covered

- Code in internet repo with feature-branch workflow
- Unit tests for application layer
- Port definitions aligned with the hexagonal architecture
