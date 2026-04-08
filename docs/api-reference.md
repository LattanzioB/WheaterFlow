# API Reference — WeatherFlow

Base URL: `http://localhost:3000`
Swagger UI: `http://localhost:3000/api/docs`

All protected endpoints require `Authorization: Bearer <token>` header.

---

## Authentication

### `POST /auth/register`
Register a new user and receive a JWT.

**Body:**
```json
{
  "name": "Juan",
  "lastName": "Pérez",
  "email": "juan@example.com",
  "password": "securepassword",
  "telegramChatId": "123456789"
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

### `GET /users` — List all users
**Auth required.** Response `200`: array of User objects.

---

### `POST /users` — Create user
**Auth required.**

**Body:**
```json
{
  "name": "Ana",
  "lastName": "García",
  "email": "ana@example.com",
  "password": "securepassword",
  "telegramChatId": "987654321"
}
```
**Response `201`:** User object.

---

### `GET /users/:id` — Get user by ID
**Auth required.** Response `200`: User object. `404` if not found.

---

### `PATCH /users/:id` — Update user
**Auth required.**

**Body:** Any subset of: `name`, `lastName`, `email`, `telegramChatId`

**Response `200`:** Updated User object.

---

### `DELETE /users/:id` — Delete user
**Auth required.** Response `204` (no body).

---

### `POST /users/:id/subscriptions/:stationId` — Subscribe to station
**Auth required.** Adds `stationId` to user's subscriptions list.

**Response `200`:** Updated User object.

---

### `DELETE /users/:id/subscriptions/:stationId` — Unsubscribe from station
**Auth required.** Removes `stationId` from user's subscriptions list.

**Response `200`:** Updated User object.

---

### User Object
```json
{
  "id": "uuid",
  "name": "Ana",
  "lastName": "García",
  "email": "ana@example.com",
  "telegramChatId": "987654321",
  "subscriptions": ["station-uuid-1", "station-uuid-2"],
  "createdAt": "2026-03-29T00:00:00.000Z"
}
```

---

## Weather Stations

### `GET /weather-stations` — List all stations
**Auth required.** Response `200`: array of Station objects.

---

### `POST /weather-stations` — Create station
**Auth required.**

**Body:**
```json
{
  "name": "Estación Central",
  "location": { "latitude": -34.6037, "longitude": -58.3816 },
  "sensorModel": "Davis Vantage Pro2",
  "ownerId": "user-uuid"
}
```
**Response `201`:** Station object.

---

### `GET /weather-stations/:id` — Get station by ID
**Auth required.** Response `200`: Station object. `404` if not found.

---

### `PATCH /weather-stations/:id` — Update station
**Auth required.**

**Body:** Any subset of: `name`, `location`, `sensorModel`, `status`

**Response `200`:** Updated Station object.

---

### `DELETE /weather-stations/:id` — Delete station
**Auth required.** Response `204`.

---

### Station Object
```json
{
  "id": "uuid",
  "name": "Estación Central",
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

### `GET /measurements` — List / filter measurements
**Auth required.**

**Query params (all optional):**
| Param | Type | Description |
|---|---|---|
| `stationName` | string | Filter by station name (partial match) |
| `tempMin` | number | Minimum temperature (°C) |
| `tempMax` | number | Maximum temperature (°C) |
| `alertOnly` | boolean | If `true`, return only alert measurements |

**Response `200`:** Array of Measurement objects.

---

### `POST /measurements` — Create measurement
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
Alert fields (`alertStatus`, `alertType`) are **set automatically** by domain logic — do not include them in the request.

---

### `GET /measurements/:id` — Get measurement by ID
**Auth required.** Response `200`: Measurement object. `404` if not found.

---

### `DELETE /measurements/:id` — Delete measurement
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

**Alert type values:** `"Ninguna"` | `"Calor Extremo"` | `"Helada"` | `"Tormenta"` | `"Humedad Crítica"`

---

## Alert Rules (Domain Logic)

| Condition | Alert Type |
|---|---|
| temperature > 40°C | `"Calor Extremo"` |
| temperature < 0°C | `"Helada"` |
| pressure < 980 hPa | `"Tormenta"` |
| humidity > 90% | `"Humedad Crítica"` |
| none | `"Ninguna"` |

When an alert is detected, all users subscribed to the station receive a Telegram notification.

---

## Error Responses

All errors follow NestJS standard format:

```json
{
  "statusCode": 404,
  "message": "Station with id abc not found",
  "error": "Not Found"
}
```

| Status | Meaning |
|---|---|
| `400` | Validation error (bad request body) |
| `401` | Missing or invalid JWT |
| `403` | Forbidden |
| `404` | Resource not found |
| `409` | Conflict (e.g. email already registered) |
