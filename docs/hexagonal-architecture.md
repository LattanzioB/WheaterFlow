# Hexagonal Architecture — WeatherFlow

## Overview

WeatherFlow uses **Ports & Adapters (Hexagonal) architecture** combined with **DDD**.
The core rule: **dependencies always point inward**. The domain knows nothing about
infrastructure, frameworks, or delivery mechanisms.

```
┌─────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE                      │
│  (Mongoose repos, TelegramAdapter, JWT, Controllers) │
│                                                      │
│   ┌─────────────────────────────────────────────┐   │
│   │            APPLICATION LAYER                │   │
│   │   (Services, Event handlers, Ports used)    │   │
│   │                                             │   │
│   │   ┌───────────────────────────────────┐     │   │
│   │   │         DOMAIN LAYER              │     │   │
│   │   │  (Entities, Value Objects,        │     │   │
│   │   │   Domain Events, Port interfaces) │     │   │
│   │   └───────────────────────────────────┘     │   │
│   └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Layers

### Domain Layer (`src/modules/*/domain/`)

**What lives here:**
- Entities (`User`, `WeatherStation`, `Measurement`)
- Value Objects (`Email`, `Location`, `Temperature`, `Humidity`, `Pressure`, `AlertType`)
- Domain Events (`MeasurementAlertDetectedEvent`)
- Repository Port interfaces (`IUserRepository`, `IStationRepository`, `IMeasurementRepository`)

**Rules:**
- Zero imports from NestJS, Mongoose, or any infrastructure library
- Pure TypeScript only
- All business logic lives here — especially `Measurement.evaluateAlerts()`

**Dependency direction:** Nothing — domain depends on nothing else.

---

### Application Layer (`src/modules/*/application/`)

**What lives here:**
- Application Services (`CreateUserService`, `CreateMeasurementService`, etc.)
- Notification port (`INotificationPort` in `notifications/application/ports/`)
- Notification service (`NotificationService` — handles domain events)

**Rules:**
- Imports domain types and port interfaces only
- NestJS `@Injectable()` decorator allowed
- Calls `IUserRepository`, `IStationRepository`, etc. — never the concrete implementation
- Emits domain events via `EventEmitter2` when business rules fire

**Dependency direction:** Application → Domain (interfaces only)

---

### Infrastructure Layer (`src/modules/*/infrastructure/`)

**What lives here:**
- Mongoose documents (`UserDocument`, `StationDocument`, `MeasurementDocument`)
- Repository implementations (`MongoUserRepository`, `MongoStationRepository`, `MongoMeasurementRepository`)
- Mappers (`UserMapper`, `StationMapper`, `MeasurementMapper`)
- Telegram adapter (`TelegramAdapter`)

**Rules:**
- Implements domain port interfaces
- Can import Mongoose, Axios, any library
- Never imported by domain or application layers
- Registered in NestJS modules as providers behind injection tokens

**Dependency direction:** Infrastructure → Domain (implements ports)

---

### Interface Layer (`src/modules/*/interface/`)

**What lives here:**
- NestJS controllers (`UsersController`, `StationsController`, `MeasurementsController`)
- DTOs (`CreateUserDto`, `UpdateUserDto`, `UserResponseDto`, etc.)
- Swagger decorators

**Rules:**
- Calls application services only — never repositories directly
- Validates input via `class-validator`
- Translates HTTP request → application call → HTTP response
- `JwtAuthGuard` applied at controller level

**Dependency direction:** Interface → Application

---

## Ports & Adapters

### Driving Ports (Primary — left side)
Initiated by external actors calling INTO the system.

| Port | Adapter | Description |
|---|---|---|
| REST API | `UsersController` | HTTP requests for user management |
| REST API | `StationsController` | HTTP requests for station management |
| REST API | `MeasurementsController` | HTTP requests for measurement management |
| REST API | `AuthController` | Login / register |

### Driven Ports (Secondary — right side)
Initiated by the application calling OUT to external systems.

| Port Interface | Adapter | Description |
|---|---|---|
| `IUserRepository` | `MongoUserRepository` | User persistence in MongoDB |
| `IStationRepository` | `MongoStationRepository` | Station persistence in MongoDB |
| `IMeasurementRepository` | `MongoMeasurementRepository` | Measurement persistence in MongoDB |
| `INotificationPort` | `TelegramAdapter` | Sends alert notifications via Telegram Bot API |

---

## Dependency Injection

Adapters are wired to ports via NestJS DI using injection tokens:

```typescript
// src/shared/tokens/injection-tokens.ts
export const USER_REPOSITORY_TOKEN = 'IUserRepository';
export const STATION_REPOSITORY_TOKEN = 'IStationRepository';
export const MEASUREMENT_REPOSITORY_TOKEN = 'IMeasurementRepository';
export const NOTIFICATION_PORT_TOKEN = 'INotificationPort';
```

```typescript
// In module providers
{
  provide: USER_REPOSITORY_TOKEN,
  useClass: MongoUserRepository,
}

// In application service constructor
@Inject(USER_REPOSITORY_TOKEN)
private readonly userRepository: IUserRepository
```

---

## Data Flow Example: Creating a Measurement with Alert

```
1. POST /measurements  (HTTP request with JSON body)
        ↓
2. MeasurementsController.create(dto)
        ↓
3. CreateMeasurementService.execute(command)
        ↓
4. Measurement.create(props)           ← Domain layer
   measurement.evaluateAlerts()        ← Domain business logic
        ↓
5. IMeasurementRepository.save(measurement)
        ↓
6. MongoMeasurementRepository.save()   ← Infrastructure
   MeasurementMapper.toPersistence()
        ↓
7. [if alert] EventEmitter2.emit('measurement.alert.detected')
        ↓
8. NotificationService.handleAlert()   ← Application layer
        ↓
9. INotificationPort.sendAlert()
        ↓
10. TelegramAdapter.sendAlert()        ← Infrastructure
    HTTP POST → Telegram Bot API
```

---

## Anti-Patterns (DO NOT DO)

```typescript
// ❌ Domain importing NestJS
import { Injectable } from '@nestjs/common';
export class User { ... }

// ❌ Controller calling repository directly
constructor(private readonly userRepo: MongoUserRepository) {}

// ❌ Business logic in controller
if (temperature > 40) { alert = 'Calor Extremo'; }

// ❌ Mongoose schema mixed with domain entity
@Schema() export class User extends Document { ... }

// ❌ Infrastructure in application layer
import { InjectModel } from '@nestjs/mongoose';
```
