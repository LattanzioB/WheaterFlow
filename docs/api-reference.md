# API Reference - WeatherFlow

Base URL: `http://localhost:3000`
Swagger UI: `http://localhost:3000/api/docs`
Notification service local URL: `http://localhost:3001`

All protected endpoints require `Authorization: Bearer <token>`.

---

## Authentication

### `POST /auth/register`
Register a new user and receive a JWT.

**Body:**
```json
{
  "name": "Juan",
  "lastName": "Perez",
  "email": "juan@example.com",
  "password": "securepassword"
}
```

**Response `201`:**
```json
{ "access_token": "eyJ..." }
```

---

### `POST /auth/login`
Authenticate and receive a JWT.

**Body:**
```json
{
  "email": "juan@example.com",
  "password": "securepassword"
}
```

**Response `200`:**
```json
{ "access_token": "eyJ..." }
```

---

## Users

Notification preferences are owned by the Notification service (`http://localhost:3001`). The API routes below are **proxy routes**: they keep the same URLs and JWT checks, then forward state changes to the Notification service.

| Route | Mode |
|-------|------|
| `GET/POST/PATCH/DELETE /users/:id/subscriptions...` | API proxy → Notification service |
| `PATCH /users/:id/delivery-channels` | API proxy → Notification service |
| `POST /users/:id/delivery-channels/telegram/link-code` | API proxy → Notification service |
| `GET /users/me` | API (identity) + Notification service (preferences) |

Direct Notification service routes (no JWT on the service boundary; intended for internal or local use):

| Method | Route |
|--------|-------|
| `GET` | `/notification-preferences/users/:userId` |
| `GET` | `/notification-preferences/users/:userId/subscriptions` |
| `POST` | `/notification-preferences/users/:userId/subscriptions/:stationId` |
| `DELETE` | `/notification-preferences/users/:userId/subscriptions/:stationId` |
| `PATCH` | `/notification-preferences/users/:userId/subscriptions/:stationId` |
| `PATCH` | `/notification-preferences/users/:userId/delivery-channels` |
| `POST` | `/notification-preferences/users/:userId/delivery-channels/telegram/link-code` |
| `POST` | `/notifications/telegram/webhook` |

Persistence: `user_notification_profiles` collection in MongoDB (Notification service).

---

### `GET /users/:id/subscriptions`
**Auth required.** Lists stations the user is subscribed to for alerts. The API combines station data from the API service with notification profile data from the Notification service.

**Query params (optional):**
| Param | Type | Description |
|---|---|---|
| `activeAlertOnly` | boolean | If `true`, return only subscriptions whose latest measurement currently has an active alert |

**Response `200`:** array of subscribed Station objects plus alert preference metadata.

---

### `POST /users/:id/subscriptions/:stationId`
**Auth required.** Subscribes the user to the station and selected alert types. Proxied to the Notification service. Returns `201` when the subscription is created.

**Body (optional):**
```json
{
  "alertTypes": ["Tormenta", "Humedad Critica"]
}
```

**Response `200`:** Updated User object.

---

### `DELETE /users/:id/subscriptions/:stationId`
**Auth required.** Removes the station preference from the user's alert routing.

**Response `200`:** Updated User object.

---

### `PATCH /users/:id/subscriptions/:stationId`
**Auth required.** Replaces the selected alert types for an existing station subscription.

**Body:**
```json
{
  "alertTypes": ["Calor Extremo"]
}
```

**Response `200`:** Updated User object.

---

### `PATCH /users/:id/delivery-channels`
**Auth required.** Updates channel-specific delivery configuration separately from alert preferences.

**Body:**
```json
{
  "deliveryChannels": {
    "telegram": {
      "chatId": "987654321"
    }
  }
}
```

**Response `200`:** Updated User object.

---

### `POST /users/:id/delivery-channels/telegram/link-code`
**Auth required.** Creates a short-lived code the user can send to the Telegram bot so the backend can store the Telegram `chatId` automatically.

**Body:** none

**Response `200`:**
```json
{
  "code": "WF-A1B2C3D4",
  "expiresAt": "2026-04-26T18:45:00.000Z",
  "instructions": "Send /link WF-A1B2C3D4 to the WeatherFlow Telegram bot.",
  "botUsername": "weatherflow_bot",
  "botUrl": "https://t.me/weatherflow_bot"
}
```

**Linking flow:**
1. Register with `POST /auth/register`.
2. Call `POST /users/:id/delivery-channels/telegram/link-code`.
3. Send `/link <code>` to the WeatherFlow Telegram bot.
4. The backend receives the Telegram webhook and stores the sender chat automatically.

---

### User Object
```json
{
  "id": "uuid",
  "name": "Ana",
  "lastName": "Garcia",
  "email": "ana@example.com",
  "notificationPreferences": [
    {
      "stationId": "station-uuid-1",
      "alertTypes": ["Tormenta", "Humedad Critica"]
    },
    {
      "stationId": "station-uuid-2",
      "alertTypes": ["Calor Extremo"]
    }
  ],
  "deliveryChannels": {
    "telegram": {
      "chatId": "987654321"
    }
  },
  "createdAt": "2026-03-29T00:00:00.000Z"
}
```

---

## Weather Stations

### `GET /weather-stations`
**Auth required.** Lists stations owned by the authenticated user.

**Query params (optional):**
| Param | Type | Description |
|---|---|---|
| `name` | string | Case-insensitive partial match on station name |

**Response `200`:** array of Station objects.

---

### `GET /weather-stations/available`
**Auth required.** Lists all stations available for alert subscription discovery.

**Query params (optional):**
| Param | Type | Description |
|---|---|---|
| `name` | string | Case-insensitive partial match on station name |

**Response `200`:** array of Station objects.

---

### `POST /weather-stations`
**Auth required.**

**Body:**
```json
{
  "name": "Estacion Central",
  "location": { "latitude": -34.6037, "longitude": -58.3816 },
  "sensorModel": "Davis Vantage Pro2",
  "ownerId": "user-uuid"
}
```

**Response `201`:** Station object.

---

### `GET /weather-stations/:id`
**Auth required.** Response `200`: Station object. `404` if not found.

---

### `PATCH /weather-stations/:id`
**Auth required.**

**Body:** Any subset of: `name`, `location`, `sensorModel`, `status`

**Response `200`:** Updated Station object.

---

### `DELETE /weather-stations/:id`
**Auth required.** Response `204`.

---

### Station Object
```json
{
  "id": "uuid",
  "name": "Estacion Central",
  "location": { "latitude": -34.6037, "longitude": -58.3816 },
  "sensorModel": "Davis Vantage Pro2",
  "status": "Activa",
  "ownerId": "user-uuid",
  "createdAt": "2026-03-29T00:00:00.000Z"
}
```

**Status values:** `"Activa"` | `"Inactiva"`

---

## Measurements

### `GET /measurements`
**Auth required.**

**Query params (all optional):**
| Param | Type | Description |
|---|---|---|
| `stationName` | string | Filter by station name (case-insensitive partial match) |
| `tempMin` | number | Minimum temperature (C); alone implies greater-than |
| `tempMax` | number | Maximum temperature (C); alone implies less-than |
| `humidityMin` | number | Minimum humidity (%); alone implies greater-than |
| `humidityMax` | number | Maximum humidity (%); alone implies less-than |
| `pressureMin` | number | Minimum pressure (hPa); alone implies greater-than |
| `pressureMax` | number | Maximum pressure (hPa); alone implies less-than |
| `reportedFrom` | string (ISO-8601) | Inclusive lower bound for `reportedAt` |
| `reportedTo` | string (ISO-8601) | Inclusive upper bound for `reportedAt` |
| `alertOnly` | boolean | If `true`, return only alert measurements |

Invalid ranges (`tempMin` > `tempMax`, `humidityMin` > `humidityMax`, `pressureMin` > `pressureMax`, or `reportedFrom` > `reportedTo`) return `400`.

**Response `200`:** Array of Measurement objects.

---

### `POST /measurements`
**Auth required.**

**Body:**
```json
{
  "stationId": "station-uuid",
  "temperature": 42.5,
  "humidity": 65,
  "pressure": 1013,
  "reportedAt": "2026-03-29T12:00:00.000Z"
}
```

**Response `201`:** Measurement object.
Alert fields (`alertStatus`, `alertType`) are set automatically by domain logic and must not be included in the request.

---

### `GET /measurements/:id`
**Auth required.** Response `200`: Measurement object. `404` if not found.

---

### `DELETE /measurements/:id`
**Auth required.** Response `204`.

---

### Measurement Object
```json
{
  "id": "uuid",
  "stationId": "station-uuid",
  "temperature": 42.5,
  "humidity": 65,
  "pressure": 1013,
  "reportedAt": "2026-03-29T12:00:00.000Z",
  "alertStatus": true,
  "alertType": "Calor Extremo"
}
```

**Alert type values:** `"Ninguna"` | `"Calor Extremo"` | `"Helada"` | `"Tormenta"` | `"Humedad Critica"`

---

## Alert Rules

| Condition | Alert Type |
|---|---|
| temperature > 40 C | `"Calor Extremo"` |
| temperature < 0 C | `"Helada"` |
| pressure < 980 hPa | `"Tormenta"` |
| humidity > 90% | `"Humedad Critica"` |
| none | `"Ninguna"` |

When an alert is detected, the API service persists the measurement and publishes a `ClimateAlertDetectedMessage` to RabbitMQ. The Notification service consumes the message, filters notification profiles by station subscription and selected alert type, resolves delivery targets, and dispatches through log or Telegram adapters.

---

## Error Responses

All errors follow the NestJS standard shape:

```json
{
  "statusCode": 404,
  "message": "Station with id abc not found",
  "error": "Not Found"
}
```

| Status | Meaning |
|---|---|
| `400` | Validation error |
| `401` | Missing or invalid JWT |
| `403` | Forbidden |
| `404` | Resource not found |
| `409` | Conflict, for example an already registered email |
