# E-06: Architecture Documentation

**Status:** Not Started
**Priority:** Medium
**Depends On:** E-04, E-02, E-03, E-03B

**Description:** Produce all required architecture diagrams: C4 model (Context, Container, Component levels), UML class diagrams explicitly differentiating Domain, Ports, and Adapters layers, and sequence diagrams for the main use cases, including notification preference resolution separated from Telegram delivery.

## Acceptance Criteria

- [ ] C4 Context diagram showing WeatherFlow system, actors (User, External APIs), and boundaries
- [ ] C4 Container diagram showing NestJS monolith, MongoDB, and external integrations
- [ ] C4 Component diagram showing internal modules and their relationships
- [ ] UML class diagrams for each module separating Domain, Ports, and Adapters with clear stereotypes
- [ ] Sequence diagrams for: user registration, preference-aware record measurement with alert detection, manage notification preferences, query measurements
- [ ] All diagrams stored in `docs/` as source files (`.drawio`, `.puml`, or `.mmd`) and exported images

## Stories

| ID | Title | Description | Estimate |
|---|---|---|---|
| S-06.1 | C4 Context and Container diagrams | Create C4 Level 1 (system context) and Level 2 (container) diagrams using draw.io or PlantUML | 3h |
| S-06.2 | C4 Component diagram | Create C4 Level 3 showing Auth, Users, Stations, Measurements, Notifications modules and the preference-resolution flow before channel delivery | 3h |
| S-06.3 | UML class diagrams - Domain layer | Create class diagrams for aggregates, value objects, domain events, and domain services | 3h |
| S-06.4 | UML class diagrams - Ports and Adapters | Create class diagrams showing port interfaces and adapter implementations with dependency direction, including generic notification requests and Telegram-only adapters | 3h |
| S-06.5 | Use case sequence diagrams | Create sequence diagrams for register, login, record measurement (with preference-aware alert flow), manage notification preferences, and query measurements | 3h |

## Dependencies

E-04 (needs finalized class structure), E-02, E-03, and E-03B (for accurate domain and port modeling)

## Deliverables Covered

- ✅ UML class diagrams (Domain, Adapters, Ports)
- ✅ Use case sequence diagrams
- ✅ C4 architecture documentation
