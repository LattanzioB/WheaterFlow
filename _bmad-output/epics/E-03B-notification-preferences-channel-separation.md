# E-03B: Notification Preferences & Channel Separation

**Status:** In Review
**Priority:** High
**Depends On:** E-03

**Description:** Correct the notification model before infrastructure work begins by separating user alert subscriptions/preferences from channel-specific delivery configuration. This epic introduces a cleaner domain and application contract so users subscribe to station alerts they care about, while Telegram remains only one delivery mechanism.

## Acceptance Criteria

- [x] User notification intent is modeled separately from channel delivery settings
- [x] Subscription logic supports station subscriptions plus selected alert types
- [x] Application-layer notification contracts are channel-agnostic (no Telegram-specific fields)
- [x] Recipient resolution filters by station subscription and alert type before delivery
- [x] User repository and application services expose the data needed for preference-aware notification delivery
- [x] Unit tests cover preference filtering and users without configured delivery channels

## Stories

| ID | Title | Description | Estimate | Status |
|---|---|---|---|---|
| S-03B.1 | Domain preference model | Introduce user-level alert preference modeling separate from channel settings | 3h | Done |
| S-03B.2 | Application port realignment | Refactor notification payloads and repository/application contracts to remove Telegram-specific fields | 2h | Done |
| S-03B.3 | Preference-aware use cases | Update subscription and notification application services to resolve recipients by station and alert type | 3h | Done |
| S-03B.4 | Alignment tests and docs | Add tests for preference-aware alert routing and update dependent planning/docs artifacts | 2h | Done |

## Dependencies

E-03 (ports and current use cases exist, but require alignment before infrastructure)

## Completion Notes

- Refactored the `User` aggregate to separate station-specific `notificationPreferences` from `deliveryChannels`, while keeping legacy helpers as compatibility wrappers during the transition.
- Added user application services to subscribe to station alerts, update per-station alert selections, and unsubscribe from alert routing with repository-backed validation.
- Realigned the notification application contract so `MeasurementAlertNotification` carries generic delivery targets instead of Telegram-specific fields.
- Updated `NotificationService` to resolve recipients by station and alert type before delivery and to skip users without configured delivery targets.
- Added unit tests for the new domain model, user preference services, and preference-aware notification routing.
- `graphify update .` could not be completed in this environment: the `graphify` CLI is not on PATH, and `python -m graphify update .` fails with `'wrapper_descriptor' object has no attribute '__annotate__'`.

## Branches and PRs

| Story | Branch | PR |
|---|---|---|
| S-03B.1 | `feature/s-03b-1-domain-preference-model` | [#16](https://github.com/LattanzioB/WheaterFlow/pull/16) |
| S-03B.2 | `feature/s-03b-2-application-port-realignment` | [#17](https://github.com/LattanzioB/WheaterFlow/pull/17) |
| S-03B.3 | `feature/s-03b-3-preference-aware-use-cases` | [#18](https://github.com/LattanzioB/WheaterFlow/pull/18) |
| S-03B.4 | `feature/s-03b-4-alignment-tests-and-docs` | Pending |

## Deliverables Covered

- Corrected domain/application model for notifications
- Planning bridge between E-03 and E-04
- Unit tests for preference-aware notification logic
