# Domain Model - WeatherFlow

## Bounded Contexts

WeatherFlow has a single bounded context with three aggregate roots.

---

## Aggregate: User

**Root entity:** `User`  
**Module:** `src/modules/users/`

### Entity

```typescript
User {
  id: string
  name: string
  lastName: string
  email: Email
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
  telegramLinking: {
    code: string | null
    expiresAt: Date | null
  }
  createdAt: Date
}
```

### Value Objects

#### `Email`
```typescript
Email.create(raw: string): Email
email.getValue(): string
email.equals(other: Email): boolean
```

### Invariants

- `email` must be unique across all users
- `notificationPreferences` contains unique station ids
- each station preference contains one or more supported alert types
- `deliveryChannels.telegram.chatId` may be empty until the user links Telegram
- `telegramLinking.code` and `telegramLinking.expiresAt` are either both present or both null

### Telegram Linking Flow

- registration no longer accepts Telegram delivery data
- an authenticated user requests a short-lived link code
- the user sends `/link <code>` to the Telegram bot
- the webhook resolves that code to the user and stores the sender chat id

### Repository Port

```typescript
interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: Email): Promise<User | null>
  findByTelegramLinkCode(code: string): Promise<User | null>
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
  id: string
  name: string
  location: Location
  sensorModel: string
  status: StationStatus
  ownerId: string
  createdAt: Date
}
```

### Invariants

- `ownerId` must reference an existing user
- coordinates must stay within valid latitude and longitude ranges

---

## Aggregate: Measurement

**Root entity:** `Measurement`  
**Module:** `src/modules/measurements/`

### Entity

```typescript
Measurement {
  id: string
  stationId: string
  temperature: Temperature
  humidity: Humidity
  pressure: Pressure
  reportedAt: Date
  alertStatus: boolean
  alertType: AlertType
}
```

### Alert Rules

```text
1. temperature > 40 C  -> Calor Extremo
2. temperature < 0 C   -> Helada
3. pressure < 980 hPa  -> Tormenta
4. humidity > 90%      -> Humedad Critica
5. none                -> Ninguna
```

---

## Domain Events

### `MeasurementAlertDetectedEvent`

Emitted when a measurement triggers an alert. `NotificationService` handles the event, filters subscribed users, and forwards the message to the configured delivery targets.

---

## Entity Relationships

```text
User (1) owns (N) WeatherStation
User (N) subscribes to (N) WeatherStation
WeatherStation (1) reports (N) Measurement
```
