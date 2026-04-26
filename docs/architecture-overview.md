# Architecture Overview — WeatherFlow

## Summary

WeatherFlow is a **meteorological services platform** implemented as a **NestJS monolith**
using **Hexagonal Architecture (Ports & Adapters)** and **Domain-Driven Design (DDD)**.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript (strict) |
| Framework | NestJS 11 |
| Database | MongoDB Atlas via Mongoose ODM |
| Auth | JWT (`@nestjs/jwt` + Passport) |
| API | REST + Swagger (`@nestjs/swagger`) |
| Notifications | Channel-agnostic alert port + Telegram delivery target |
| Events | `@nestjs/event-emitter` (EventEmitter2) |
| Testing | Jest (co-located `.spec.ts`) |

---

## Architecture Diagram (C4 — Level 1: System Context)

```
┌──────────────────────────────────────────────────────┐
│                     WeatherFlow                       │
│              NestJS Monolith (Local)                  │
│                                                       │
│  ┌─────────────┐   ┌──────────────┐                  │
│  │ REST API    │   │ Domain Logic  │                  │
│  │ (NestJS)    │──▶│ (DDD + Hex)  │                  │
│  └─────────────┘   └──────┬───────┘                  │
│                           │                           │
│            ┌──────────────┼──────────────┐            │
│            ▼              ▼              ▼            │
│      ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│      │ MongoDB  │  │ Telegram │  │  JWT     │        │
│      │  Atlas   │  │ Bot API  │  │ (local)  │        │
│      └──────────┘  └──────────┘  └──────────┘        │
└──────────────────────────────────────────────────────┘
         ▲
    HTTP REST
         ▲
   [API Clients]
```

---

## C4 Level 2: Container Diagram

```
[API Client]
     │
     ▼  HTTP
┌─────────────────────────────────────────────────────┐
│                  NestJS Application                  │
│                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐ │
│  │  Auth      │  │  Users     │  │   Stations     │ │
│  │  Module    │  │  Module    │  │   Module       │ │
│  └────────────┘  └────────────┘  └────────────────┘ │
│                                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐  │
│  │  Measurements Module │  │ Notifications Module │  │
│  └──────────────────────┘  └──────────────────────┘  │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │               Shared                            │ │
│  │  (Exceptions, Injection Tokens, Config)         │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
   [MongoDB Atlas]           [Telegram Bot API]
```

---

## Domain Aggregates

| Aggregate | Root Entity | Key Value Objects | Business Rules |
|---|---|---|---|
| User | `User` | `Email` | Unique email, station alert preferences, separate delivery settings |
| WeatherStation | `WeatherStation` | `Location`, `StationStatus` | Valid coordinates, owner exists |
| Measurement | `Measurement` | `Temperature`, `Humidity`, `Pressure`, `AlertType` | Alert threshold evaluation |

---

## Alert Rules (Core Business Logic)

Evaluated inside `Measurement.evaluateAlerts()` — runs on every measurement creation.

| Condition | Alert |
|---|---|
| temperature > 40°C | Calor Extremo |
| temperature < 0°C | Helada |
| pressure < 980 hPa | Tormenta |
| humidity > 90% | Humedad Crítica |

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | Hexagonal + DDD | Assignment requirement |
| Framework | NestJS 11 | TypeScript-first, DI, maps well to DDD modules |
| Database | MongoDB Atlas | Assignment requirement |
| Auth | JWT (no refresh) | Sufficient for Delivery I scope |
| Notifications | Channel-agnostic application port with Telegram as the first delivery target | Keeps the notification boundary ready for more channels without leaking Telegram-specific fields into use cases |
| Events | EventEmitter2 | Decouples domain from notification side-effects |
| Value Objects | Full (per aggregate) | Assignment explicitly requires them |
| API style | REST | Standard, well-supported by Swagger |

---

## Module Dependency Graph

```
AppModule
├── ConfigModule (global)
├── MongooseModule (global)
├── EventEmitterModule (global)
├── AuthModule
│   └── UsersModule (for credential lookup)
├── UsersModule
├── StationsModule
├── MeasurementsModule
│   └── NotificationsModule (for event handling)
└── NotificationsModule
```

---

## Further Reading

- [Domain Model](./domain-model.md) — entities, value objects, aggregates
- [Database Diagram](./database-diagram.md) — MongoDB collections, indexes, and references
- [Hexagonal Architecture](./hexagonal-architecture.md) — layers, ports, adapters, data flow
- [API Reference](./api-reference.md) — all endpoints with request/response examples
- [Setup Guide](./setup.md) — how to run the project locally
- [Full Architecture Document](_bmad-output/planning-artifacts/architecture.md)
