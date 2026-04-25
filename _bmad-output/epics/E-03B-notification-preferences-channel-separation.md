# E-03B: Notification Preferences & Channel Separation

**Status:** Not Started
**Priority:** High
**Depends On:** E-03

**Description:** Correct the notification model before infrastructure work begins by separating user alert subscriptions/preferences from channel-specific delivery configuration. This epic introduces a cleaner domain and application contract so users subscribe to station alerts they care about, while Telegram remains only one delivery mechanism.

## Acceptance Criteria

- [ ] User notification intent is modeled separately from channel delivery settings
- [ ] Subscription logic supports station subscriptions plus selected alert types
- [ ] Application-layer notification contracts are channel-agnostic (no Telegram-specific fields)
- [ ] Recipient resolution filters by station subscription and alert type before delivery
- [ ] User repository and application services expose the data needed for preference-aware notification delivery
- [ ] Unit tests cover preference filtering and users without configured delivery channels

## Stories

| ID | Title | Description | Estimate |
|---|---|---|---|
| S-03B.1 | Domain preference model | Introduce user-level alert preference modeling separate from channel settings | 3h |
| S-03B.2 | Application port realignment | Refactor notification payloads and repository/application contracts to remove Telegram-specific fields | 2h |
| S-03B.3 | Preference-aware use cases | Update subscription and notification application services to resolve recipients by station and alert type | 3h |
| S-03B.4 | Alignment tests and docs | Add tests for preference-aware alert routing and update dependent planning/docs artifacts | 2h |

## Dependencies

E-03 (ports and current use cases exist, but require alignment before infrastructure)

## Deliverables Covered

- Corrected domain/application model for notifications
- Planning bridge between E-03 and E-04
- Unit tests for preference-aware notification logic
