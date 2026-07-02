# API Reference - WeatherFlow

Base URL: `http://localhost:3000`
Swagger UI: `http://localhost:3000/api/docs`
Notification service local URL: `http://localhost:3001`
Ingestion service local URL: `http://localhost:3002`

All protected endpoints require `Authorization: Bearer <token>`.

The Ingestion service does not expose weather data publicly yet. Internally it
exports the `WeatherDataProvider` port, whose normalized Current Weather reading
has this shape:

```json
{
  "externalId": "3435910",
  "temperature": { "value": 18.42, "unit": "celsius" },
  "humidity": { "value": 63, "unit": "percent" },
  "pressure": { "value": 1017, "unit": "hPa" },
  "observedAt": "2024-06-21T14:00:00.000Z"
}
```

S-03.5 and S-03.9 consume this same port; neither duplicates the OpenWeather
HTTP contract.

The ingestion service exposes OpenWeather resilience metrics at
`GET http://localhost:3002/metrics` in Prometheus text format. The current
series include `weatherflow_owm_requests_total`,
`weatherflow_owm_failures_total`, `weatherflow_owm_breaker_state` and
`weatherflow_owm_cache_entries`.

Both API and ingestion expose internal REST boundary metrics in Prometheus text
format through `GET /metrics`. `weatherflow_http_boundary_requests_total`
counts attempts, retries, failures, bulkhead rejections and open-circuit
rejections for `ingestion_to_api` and `api_to_ingestion`.
`weatherflow_http_boundary_breaker_state` exposes the current breaker state for
each direction.

## Internal Ingestion Operations

These routes are service-to-service or operational endpoints. They require:

```text
x-ingestion-token: <INGESTION_SYSTEM_TOKEN>
```

### `GET http://localhost:3000/internal/ingestion/stations`

Returns the API-owned stations whose provider is `openweather`. The scheduled
worker uses this route instead of accessing MongoDB or importing API domain
code.

**Response `200`:** array of Station objects.

**Response `401`:** missing or invalid ingestion system token.

### `POST http://localhost:3002/internal/ingestion/run`

Starts the same ingestion cycle used by `INGESTION_CRON`. The cycle skips
inactive stations, limits concurrent OWM requests, and isolates failures by
station. Scheduled cycles may use the last valid OWM reading for the same
coordinates when the provider fails and the cache entry is still within
`OWM_CACHE_TTL_MS`; manual runs do not use fallback.

**Response `200`:**

```json
{
  "cycleId": "f19bc2ec-7d42-42f9-b2b1-c2695d9f9854",
  "trigger": "manual",
  "startedAt": "2026-06-25T20:00:00.000Z",
  "completedAt": "2026-06-25T20:00:00.420Z",
  "durationMs": 420,
  "discovered": 3,
  "succeeded": 2,
  "failed": 0,
  "skipped": 1,
  "results": []
}
```

When fallback is used, the successful station result includes the age of the
reused observation:

```json
{
  "stationId": "station-uuid",
  "stationName": "Buenos Aires",
  "status": "succeeded",
  "fallback": {
    "reason": "WeatherDataProviderTimeoutError",
    "cachedAt": "2026-06-25T19:55:00.000Z",
    "ageMs": 120000,
    "ttlMs": 300000
  }
}
```

**Response `401`:** missing or invalid ingestion system token.

**Response `409`:** another scheduled or manual cycle is already running.

Each successful station reading is submitted to the API domain pipeline through
the endpoint below.

### `POST http://localhost:3000/internal/ingestion/measurements`

Requires `x-ingestion-token` and `x-correlation-id`.

**Body:**

```json
{
  "stationId": "station-uuid",
  "temperature": 42,
  "humidity": 50,
  "pressure": 1012,
  "reportedAt": "2026-06-25T12:00:00.000Z",
  "source": "openweather",
  "idempotencyKey": "0f2f0e332a783584246f5f972f6d3e06afc7eb74cb67ebf5db052363196a15c8"
}
```

The ingestion adapter derives `idempotencyKey` from the station, OWM external
identifier, and observation timestamp. Repeating the same observation returns
the existing measurement without another MongoDB row or alert publication.
The correlation identifier reaches the RabbitMQ message payload and AMQP
metadata when the reading triggers an alert. When OpenTelemetry tracing is
enabled, the HTTP `traceparent` from ingestion is continued by the API and
injected into AMQP headers so the notification consumer appears in the same
Jaeger trace.
The worker protects this write path with a configurable timeout, bulkhead,
circuit breaker and backoff with jitter. Only `429`, `502`, `503`, `504`,
timeouts and safe network failures are retried, always with the same
idempotency key.

**Response `200`:** Measurement object with `source: "openweather"`.

**Response `400`:** invalid measurement or idempotency contract.

**Response `401`:** missing/invalid system token or correlation identifier.

**Response `404`:** station does not exist.

### API -> ingestion current-weather boundary

The public current-temperature report on the API calls ingestion through
`GET http://localhost:3002/internal/weather/current` with `latitude` and
`longitude`, authenticated with `x-ingestion-token`.
The API client timeout, bulkhead, breaker and read-path retry policy are
configured through `INGESTION_TIMEOUT_MS`, `INGESTION_CONCURRENCY_LIMIT`,
`INGESTION_BREAKER_FAILURE_THRESHOLD`, `INGESTION_BREAKER_OPEN_MS`,
`INGESTION_RETRY_ATTEMPTS` and `INGESTION_RETRY_BASE_DELAY_MS`. Defaults keep
read retries conservative: maximum one retry for `429`, `502`, `503`, `504`,
timeout or network failure, mapping exhausted internal failures to clear
`502`, `503` or `504` responses without stack traces.

### `GET http://localhost:3002/internal/weather/current`

Requires `x-ingestion-token`.

**Query params:**
| Param | Type | Description |
|---|---|---|
| `latitude` | number | Station latitude, -90 to 90 |
| `longitude` | number | Station longitude, -180 to 180 |

**Response `200`:**

```json
{
  "externalId": "3435910",
  "temperature": { "value": 18.42, "unit": "celsius" },
  "humidity": { "value": 63, "unit": "percent" },
  "pressure": { "value": 1017, "unit": "hPa" },
  "observedAt": "2026-06-21T14:00:00.000Z"
}
```

**Response `401`:** missing or invalid ingestion system token.

**Response `502`:** OpenWeather returned an invalid or unsupported response.

**Response `503`:** OpenWeather is unavailable, saturated, or circuit-open.

**Response `504`:** OpenWeather timed out.

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

| Route                                                  | Mode                                                |
| ------------------------------------------------------ | --------------------------------------------------- |
| `GET/POST/PATCH/DELETE /users/:id/subscriptions...`    | API proxy → Notification service                    |
| `PATCH /users/:id/delivery-channels`                   | API proxy → Notification service                    |
| `POST /users/:id/delivery-channels/telegram/link-code` | API proxy → Notification service                    |
| `GET /users/me`                                        | API (identity) + Notification service (preferences) |

Direct Notification service routes (no JWT on the service boundary; intended for internal or local use):

| Method   | Route                                                                          |
| -------- | ------------------------------------------------------------------------------ |
| `GET`    | `/notification-preferences/users/:userId`                                      |
| `GET`    | `/notification-preferences/users/:userId/subscriptions`                        |
| `POST`   | `/notification-preferences/users/:userId/subscriptions/:stationId`             |
| `DELETE` | `/notification-preferences/users/:userId/subscriptions/:stationId`             |
| `PATCH`  | `/notification-preferences/users/:userId/subscriptions/:stationId`             |
| `PATCH`  | `/notification-preferences/users/:userId/delivery-channels`                    |
| `POST`   | `/notification-preferences/users/:userId/delivery-channels/telegram/link-code` |
| `GET`    | `/notifications`                                                               |
| `PATCH`  | `/notifications/:id/read`                                                      |
| `PATCH`  | `/notifications/read-all`                                                      |
| `GET`    | `/notifications/stream`                                                        |
| `POST`   | `/notifications/telegram/webhook`                                              |

Persistence: `user_notification_profiles` and `notifications` collections in MongoDB (Notification service).

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
    },
    "inApp": true
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
    },
    "log": {
      "enabled": true
    },
    "inApp": true
  },
  "createdAt": "2026-03-29T00:00:00.000Z"
}
```

---

## In-app notifications

Base URL: `http://localhost:3001`

These endpoints live on the Notification service and require the same JWT issued by the API service. REST calls use `Authorization: Bearer <token>`. Native browser `EventSource` cannot set custom headers, so `GET /notifications/stream` also accepts `?token=<JWT>`.

### `GET /notifications`

**Auth required.** Lists the authenticated user's persisted alert notifications, newest first.

**Query params (optional):**
| Param | Type | Description |
|---|---|---|
| `unreadOnly` | boolean | If `true`, return only notifications whose `readAt` is `null` |
| `limit` | number | Page size, 1 to 100. Default: 20 |
| `cursor` | string | Cursor returned by the previous page |

**Response `200`:**

```json
{
  "items": [
    {
      "id": "notification-uuid",
      "userId": "user-uuid",
      "stationId": "station-uuid",
      "stationName": "Estacion Central",
      "alertType": "STORM",
      "temperature": 22.1,
      "humidity": 92,
      "pressure": 970,
      "reportedAt": "2026-05-24T14:00:00.000Z",
      "createdAt": "2026-05-24T14:00:01.000Z",
      "readAt": null,
      "messageId": "climate-alert-message-id"
    }
  ],
  "nextCursor": null,
  "unreadCount": 1
}
```

Response DTO: `NotificationsPageDto` with `items: NotificationResponseDto[]`, `nextCursor: string | null`, and `unreadCount: number`. `NotificationResponseDto` contains `id`, `userId`, `stationId`, `stationName`, `alertType`, `temperature`, `humidity`, `pressure`, `reportedAt`, `createdAt`, `readAt`, and `messageId`.

### `PATCH /notifications/:id/read`

**Auth required.** Marks one owned notification as read. Returns `404` when the notification does not belong to the authenticated user.

**Response `204`:** empty body.

### `PATCH /notifications/read-all`

**Auth required.** Marks every unread notification for the authenticated user as read.

**Response `204`:** empty body.

### `GET /notifications/stream`

**Auth required.** Opens an SSE stream for the authenticated user. Use `Authorization: Bearer <token>` when the client can send headers, or `GET /notifications/stream?token=<JWT>` for native `EventSource`.

**Response headers:** `Content-Type: text/event-stream`

**Live notification event:**

```text
event: notification
data: {"id":"notification-uuid","userId":"user-uuid","stationId":"station-uuid","stationName":"Estacion Central","alertType":"STORM","temperature":22.1,"humidity":92,"pressure":970,"reportedAt":"2026-05-24T14:00:00.000Z","createdAt":"2026-05-24T14:00:01.000Z","readAt":null,"messageId":"climate-alert-message-id"}
```

**Heartbeat:** the service emits `event: ping` with `data: ping` every 25 seconds so clients and proxies keep the foreground connection alive.

**Reconnect expectations:** browsers auto-reconnect `EventSource` streams. On every successful initial connect or reconnect, clients should rehydrate state with `GET /notifications` so any alerts persisted while disconnected are visible.

Persistence: `notifications` collection in MongoDB with `{ userId: 1, createdAt: -1 }` and unique `{ userId: 1, messageId: 1 }` indexes.

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
  "provider": "none"
}
```

`provider` is optional and defaults to `"none"`.

**Response `201`:** Station object.

---

### `GET /weather-stations/:id`

**Auth required.** Response `200`: Station object. `404` if not found.

---

### `PATCH /weather-stations/:id`

**Auth required.**

**Body:** Any subset of: `name`, `location`, `sensorModel`, `status`,
`provider`, `alertSettings`

**Response `200`:** Updated Station object.

---

### `DELETE /weather-stations/:id`

**Auth required.** Response `204`.

---

### `GET /stations/:stationId/reports/temperature/current`

**Auth required.** Returns the current temperature for an OpenWeather-backed
station. The API resolves the station and calls ingestion in real time; it does
not read the latest persisted measurement and does not persist the returned
reading.

**Response `200`:**

```json
{
  "station": {
    "id": "station-uuid",
    "name": "Buenos Aires"
  },
  "temperature": { "value": 18.42, "unit": "celsius" },
  "observedAt": "2026-06-21T14:00:00.000Z",
  "fetchedAt": "2026-06-21T14:00:01.250Z"
}
```

**Response `404`:** station does not exist.

**Response `422`:** station is not backed by `provider=openweather`.

**Response `502`:** ingestion returned an invalid result or provider failure.

**Response `503`:** ingestion is unavailable, saturated, or circuit-open.

**Response `504`:** ingestion or OpenWeather timed out.

---

### `GET /stations/:stationId/reports/temperature/daily-average`

**Auth required.** Returns the moving 24 hour average temperature for an
existing station using only persisted measurements in MongoDB. The API does not
call OpenWeather or the ingestion service for this report.

The period is evaluated in UTC as `[now - 24h, now]`, inclusive on both bounds.
Both manual and `openweather` measurements are included.

**Response `200`:**

```json
{
  "station": {
    "id": "station-uuid",
    "name": "Buenos Aires"
  },
  "period": {
    "from": "2026-06-29T12:00:00.000Z",
    "to": "2026-06-30T12:00:00.000Z"
  },
  "average": {
    "value": 18.75,
    "unit": "celsius"
  },
  "sampleCount": 12
}
```

**Response `200` with empty period:** `average.value` is `null` and
`sampleCount` is `0`; the UTC period and station metadata are still returned.

**Response `404`:** station does not exist.

---

### `GET /stations/:stationId/reports/temperature/weekly-average`

**Auth required.** Returns the moving 7 day average temperature for an existing
station using only persisted measurements in MongoDB. The response shape and
empty-period semantics are the same as the daily average; only the UTC period
changes to `[now - 7d, now]`.

**Response `404`:** station does not exist.

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
  "provider": "none",
  "alertSettings": {
    "extremeHeat": true,
    "frost": true,
    "storm": true,
    "criticalHumidity": true
  },
  "createdAt": "2026-03-29T00:00:00.000Z"
}
```

**Status values:** `"Activa"` | `"Inactiva"`
**Provider values:** `"none"` | `"openweather"`

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
  "source": "manual",
  "alertStatus": true,
  "alertType": "Calor Extremo"
}
```

**Alert type values:** `"Ninguna"` | `"Calor Extremo"` | `"Helada"` | `"Tormenta"` | `"Humedad Critica"`
**Source values:** `"manual"` | `"openweather"`

---

## Alert Rules

| Condition          | Alert Type          |
| ------------------ | ------------------- |
| temperature > 40 C | `"Calor Extremo"`   |
| temperature < 0 C  | `"Helada"`          |
| pressure < 980 hPa | `"Tormenta"`        |
| humidity > 90%     | `"Humedad Critica"` |
| none               | `"Ninguna"`         |

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

| Status | Meaning                                           |
| ------ | ------------------------------------------------- |
| `400`  | Validation error                                  |
| `401`  | Missing or invalid JWT                            |
| `403`  | Forbidden                                         |
| `404`  | Resource not found                                |
| `409`  | Conflict, for example an already registered email |
