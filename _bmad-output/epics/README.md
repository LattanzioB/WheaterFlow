# WeatherFlow — Epics & Stories

## Epic Overview

| Epic | Title | Stories | Priority | Dependencies | Status |
|------|-------|---------|----------|-------------|--------|
| [E-01](E-01-project-foundation.md) | Project Foundation | 5 | Critical | None | Done |
| [E-02](E-02-domain-layer.md) | Domain Layer | 6 | High | E-01 | In Review |
| [E-03](E-03-ports-application-layer.md) | Ports & Application Layer | 6 | High | E-02 | In Review |
| [E-03B](E-03B-notification-preferences-channel-separation.md) | Notification Preferences & Channel Separation | 4 | High | E-03 | Not Started |
| [E-04](E-04-adapters-infrastructure.md) | Adapters & Infrastructure | 8 | High | E-03B | Not Started |
| [E-05](E-05-api-docs-database.md) | API Documentation & Database | 4 | Medium | E-04 | Not Started |
| [E-06](E-06-architecture-documentation.md) | Architecture Documentation | 5 | Medium | E-04, E-02, E-03, E-03B | Not Started |

**Total Stories:** 38
**Estimated Effort:** ~90 hours

## Dependency Graph

```
E-01 → E-02 → E-03 → E-03B → E-04 → E-05
                                     → E-06 (parallelizable with E-05)
```

## University Deliverable Traceability

| Deliverable | Covered By |
|---|---|
| Solution running locally | E-01, E-04 |
| Code in internet repo (feature-branch workflow) | E-01 (S-01.5) |
| README with execution instructions | E-01 (S-01.5) |
| Unit tests for domain | E-02 (S-02.6), E-03 (S-03.6) |
| UML class diagrams (Domain, Adapters, Ports) | E-06 (S-06.3, S-06.4) |
| Use case sequence diagrams | E-06 (S-06.5) |
| C4 architecture documentation | E-06 (S-06.1, S-06.2) |
| Database diagram | E-05 (S-05.4) |
| APIs documented (Swagger) | E-05 (S-05.1, S-05.2, S-05.3) |

## Deferred

- **Additional notification channels (email, push, SMS)** — Future epic after the preference/channel split is implemented and Telegram delivery is stable.

## Rules

Development rules are documented in [docs/development-rules.md](../../docs/development-rules.md).
