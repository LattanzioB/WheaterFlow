# Pruebas de carga S-03.19: Notificaciones

Este escenario compara el servicio de Notificaciones cuando usa la misma base
MongoDB que el resto del sistema contra una base MongoDB local dedicada. El
split se prueba como experimento operativo: no cambia `docker-compose.yml`,
`.env.example` ni codigo de `apps/notifications/src`.

## Flujo bajo prueba

`setup()` registra un usuario en la API, crea una estacion y la suscribe a
`EXTREME_HEAT` en el servicio de Notificaciones. Cada iteracion ejecuta el
pipeline real:

1. `POST /measurements` en API con `temperature > 40`.
2. API evalua la alerta y publica el evento en RabbitMQ.
3. Notificaciones consume el evento, persiste `Notification` y hace fan-out.
4. k6 lista notificaciones, marca una como leida, marca todas como leidas y
   consulta el perfil de notificaciones.

Las rutas medidas de Notificaciones son:

| Endpoint | Proposito |
| --- | --- |
| `GET /notifications` | Lectura paginada del usuario autenticado |
| `PATCH /notifications/:id/read` | Escritura puntual de estado leido |
| `PATCH /notifications/read-all` | Escritura masiva de estado leido |
| `GET /notification-preferences/users/:userId` | Lectura del perfil y suscripciones |

## Configuracion k6

| Variable | Default | Uso |
| --- | --- | --- |
| `API_BASE_URL` | `http://localhost:3000` | API que recibe auth, estaciones y measurements |
| `NOTIFICATIONS_BASE_URL` | `http://localhost:3001` | Servicio de Notificaciones bajo prueba |
| `LOAD_RAMP_VUS` | `8` | VUs del escenario sostenido |
| `LOAD_SPIKE_VUS` | `24` | VUs del pico |
| `LOAD_NOTIFICATION_SETTLE_SLEEP` | `0.2` | Espera breve para consumo RabbitMQ antes de leer |
| `LOAD_NOTIFICATIONS_RESULT_PREFIX` | `docs/load-tests/notifications-latest` | Prefijo de summary/report |

Umbrales versionados:

- p95 global HTTP menor a 900 ms.
- p95 por endpoint de Notificaciones menor a 650 ms.
- p95 de escritura `POST /measurements` menor a 800 ms.
- tasa de error HTTP y tasa de checks fallidos menor a 3%.
- throughput global mayor a 8 req/s.

## Escenario A: Atlas compartido

Levantar el sistema como se usa actualmente, con `api` y `notifications`
apuntando a la misma `MONGODB_URI` de Atlas.

```powershell
docker compose up --build api notifications ingestion rabbitmq
$env:API_BASE_URL = "http://localhost:3000"
$env:NOTIFICATIONS_BASE_URL = "http://localhost:3001"
$env:LOAD_NOTIFICATIONS_RESULT_PREFIX = "docs/load-tests/notifications-scenario-a"
npm run test:load:notifications
```

Guardar los artefactos generados:

- `docs/load-tests/notifications-scenario-a-summary.json`
- `docs/load-tests/notifications-scenario-a-report.html`

## Escenario B: Mongo local dedicado para Notificaciones

Levantar un Mongo adicional sin commitear cambios de compose:

```powershell
docker run --name weatherflow-mongo-notifications --rm -p 27018:27017 -d mongo:7
```

Mantener `api` con la misma configuracion que en el Escenario A y repuntar solo
el proceso o contenedor `notifications`:

```powershell
$env:MONGODB_URI = "mongodb://localhost:27018/weatherflow-notifications"
npm run start:notifications
```

En otra terminal, ejecutar la corrida con el mismo dataset/VUs/duracion que en
el Escenario A:

```powershell
$env:API_BASE_URL = "http://localhost:3000"
$env:NOTIFICATIONS_BASE_URL = "http://localhost:3001"
$env:LOAD_NOTIFICATIONS_RESULT_PREFIX = "docs/load-tests/notifications-scenario-b"
npm run test:load:notifications
```

Si `notifications` corre dentro de Docker, usar una URI alcanzable desde el
contenedor, por ejemplo `mongodb://host.docker.internal:27018/weatherflow-notifications`.

Guardar los artefactos generados:

- `docs/load-tests/notifications-scenario-b-summary.json`
- `docs/load-tests/notifications-scenario-b-report.html`

## Comparacion

Ambas corridas deben partir de colecciones de notificaciones vacias y usar los
mismos valores de VUs, duracion y URLs de API. Completar la tabla con los datos
de los summaries generados por k6.

| Metrica | Escenario A: Atlas compartido | Escenario B: Mongo local dedicado |
| --- | ---: | ---: |
| p95 global HTTP | Pendiente de corrida local | Pendiente de corrida local |
| p95 `GET /notifications` | Pendiente de corrida local | Pendiente de corrida local |
| p95 `PATCH /notifications/:id/read` | Pendiente de corrida local | Pendiente de corrida local |
| p95 `PATCH /notifications/read-all` | Pendiente de corrida local | Pendiente de corrida local |
| p95 `GET /notification-preferences/users/:userId` | Pendiente de corrida local | Pendiente de corrida local |
| tasa de error HTTP | Pendiente de corrida local | Pendiente de corrida local |
| throughput global | Pendiente de corrida local | Pendiente de corrida local |

## Salidas

Por default:

```powershell
npm run test:load:notifications
```

escribe:

- `docs/load-tests/notifications-latest-summary.json`
- `docs/load-tests/notifications-latest-report.html`

Para versionar una corrida comparable, cambiar `LOAD_NOTIFICATIONS_RESULT_PREFIX`
a `docs/load-tests/notifications-scenario-a` o
`docs/load-tests/notifications-scenario-b`.
