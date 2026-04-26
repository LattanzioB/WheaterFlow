# Domain Model — WeatherFlow

## Bounded Contexts

WeatherFlow has a single bounded context with three aggregate roots.

---

## Aggregate: User

**Root entity:** `User`
**Module:** `src/modules/users/`

### Entity

```typescript
User {
  id: string                  // auto-generated UUID
  name: string
  lastName: string
  email: Email                // value object
  passwordHash: string
  notificationPreferences: Array<{
    stationId: string
    alertTypes: AlertType[]
  }>
  deliveryChannels: {
    telegram: {
      chatId: string | null
    }
  }
  createdAt: Date
}
```

### Value Objects

#### `Email`
```typescript
// Validates format, stores lowercase
Email.create(raw: string): Email
email.getValue(): string
email.equals(other: Email): boolean
```

### Invariants
- `email` must be unique across all users
- `notificationPreferences` contains unique WeatherStation IDs
- Each station preference contains one or more supported alert types
- Delivery-channel settings are stored separately from alert intent

### Compatibility Note
- The aggregate still exposes legacy `subscriptions` helpers as wrappers while older application flows are aligned with `notificationPreferences`.

### Repository Port
```typescript
interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: Email): Promise<User | null>
  save(user: User): Promise<void>
  delete(id: string): Promise<void>
  findAll(): Promise<User[]>
  findSubscribersByStationId(stationId: string): Promise<User[]>
}
```

---

## Aggregate: WeatherStation

**Root entity:** `WeatherStation`
**Module:** `src/modules/stations/`

### Entity

```typescript
WeatherStation {
  id: string                  // auto-generated UUID
  name: string                // e.g. "Estación Central"
  location: Location          // value object
  sensorModel: string
  status: StationStatus       // value object (enum)
  ownerId: string             // reference to User.id
  createdAt: Date
}
```

### Value Objects

#### `Location`
```typescript
// Validates latitude (-90 to 90) and longitude (-180 to 180)
Location.create(latitude: number, longitude: number): Location
location.getLatitude(): number
location.getLongitude(): number
location.equals(other: Location): boolean
```

#### `StationStatus`
```typescript
enum StationStatus {
  ACTIVE = 'Activa',
  INACTIVE = 'Inactiva',
}
```

### Invariants
- `ownerId` must reference an existing User
- Location coordinates must be within valid geographic ranges

### Repository Port
```typescript
interface IStationRepository {
  findById(id: string): Promise<WeatherStation | null>
  findByOwnerId(ownerId: string): Promise<WeatherStation[]>
  save(station: WeatherStation): Promise<void>
  delete(id: string): Promise<void>
  findAll(): Promise<WeatherStation[]>
}
```

---

## Aggregate: Measurement

**Root entity:** `Measurement`
**Module:** `src/modules/measurements/`

### Entity

```typescript
Measurement {
  id: string                  // auto-generated UUID
  stationId: string           // reference to WeatherStation.id
  temperature: Temperature    // value object (°C)
  humidity: Humidity          // value object (0–100%)
  pressure: Pressure          // value object (hPa)
  reportedAt: Date
  alertStatus: boolean        // set by evaluateAlerts()
  alertType: AlertType        // set by evaluateAlerts()
}
```

### Value Objects

#### `Temperature`
```typescript
Temperature.create(celsius: number): Temperature
temperature.getValue(): number
temperature.isExtremeHeat(): boolean   // > 40°C
temperature.isFrost(): boolean          // < 0°C
```

#### `Humidity`
```typescript
Humidity.create(percent: number): Humidity  // must be 0–100
humidity.getValue(): number
humidity.isCritical(): boolean              // > 90%
```

#### `Pressure`
```typescript
Pressure.create(hpa: number): Pressure
pressure.getValue(): number
pressure.isStorm(): boolean                 // < 980 hPa
```

#### `AlertType`
```typescript
enum AlertType {
  NONE = 'Ninguna',
  EXTREME_HEAT = 'Calor Extremo',   // temperature > 40°C
  FROST = 'Helada',                  // temperature < 0°C
  STORM = 'Tormenta',                // pressure < 980 hPa
  CRITICAL_HUMIDITY = 'Humedad Crítica', // humidity > 90%
}
```

### Core Domain Method: `evaluateAlerts()`

Called automatically on `Measurement.create()`. Sets `alertStatus` and `alertType`.

```
Rules (evaluated in order):
1. temperature > 40°C  → alertStatus=true, alertType=EXTREME_HEAT
2. temperature < 0°C   → alertStatus=true, alertType=FROST
3. pressure < 980 hPa  → alertStatus=true, alertType=STORM
4. humidity > 90%      → alertStatus=true, alertType=CRITICAL_HUMIDITY
5. none match          → alertStatus=false, alertType=NONE
```

### Repository Port
```typescript
interface IMeasurementRepository {
  findById(id: string): Promise<Measurement | null>
  findByStationId(stationId: string): Promise<Measurement[]>
  save(measurement: Measurement): Promise<void>
  delete(id: string): Promise<void>
  findWithFilters(filters: MeasurementFilters): Promise<Measurement[]>
}

interface MeasurementFilters {
  stationName?: string
  tempMin?: number
  tempMax?: number
  alertOnly?: boolean
}
```

---

## Domain Events

### `MeasurementAlertDetectedEvent`

Emitted by `CreateMeasurementService` when `measurement.alertStatus === true`.

```typescript
class MeasurementAlertDetectedEvent {
  static readonly EVENT_NAME = 'measurement.alert.detected'
  measurementId: string
  stationId: string
  alertType: string
}
```

**Handled by:** `NotificationService` → `INotificationPort` → `TelegramAdapter`

---

## Entity Relationships

```
User (1) ──────────────── owns ──── (N) WeatherStation
User (N) ──── subscribes to ──────── (N) WeatherStation
WeatherStation (1) ──── reports ──── (N) Measurement
```

**Note:** These are cross-aggregate references via ID only. No direct object nesting.
