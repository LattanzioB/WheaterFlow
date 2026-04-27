# API Reference - WeatherFlow

Base URL: `http://localhost:3000`
Swagger UI: `http://localhost:3000/api/docs`

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

### `POST /users/:id/subscriptions/:stationId`
**Auth required.** Subscribes the user to the station and selected alert types.

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
**Auth required.** Response `200`: array of Station objects.

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
| `stationName` | string | Filter by station name (partial match) |
| `tempMin` | number | Minimum temperature (C) |
| `tempMax` | number | Maximum temperature (C) |
| `alertOnly` | boolean | If `true`, return only alert measurements |

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

When an alert is detected, the application filters users by station subscription and selected alert type, then forwards the alert to the configured delivery targets. Telegram is the current delivery mechanism.

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
