# Pruebas de carga S-03.13

Los escenarios k6 versionados ejercitan consultas y reportes desde la fachada
publica de la API:

- `sustained_ramp`: rampa sostenida sobre busqueda de mediciones y promedio
  diario.
- `spike`: pico corto sobre busqueda, temperatura actual y promedio semanal.
- `long_run`: carga prolongada sobre busqueda y promedios, con lecturas
  periodicas de temperatura actual.

## Dataset

El `setup()` de k6 registra un usuario unico, crea una estacion propia con
`provider=openweather` y carga `LOAD_DATASET_SIZE` mediciones manuales
historicas. La busqueda de mediciones y los promedios quedan aislados de OWM y
Telegram porque solo consultan la API y MongoDB.

## Temperatura actual con OWM mockeado

La ruta `GET /stations/:stationId/reports/temperature/current` conserva el flujo
real API -> ingesta -> OpenWeather, pero para evitar rate limits se debe iniciar
ingesta con `OWM_BASE_URL` apuntando al stub local:

```powershell
npm run test:load:owm-stub
$env:OWM_BASE_URL = "http://host.docker.internal:4010"
docker compose up --build api ingestion mongo rabbitmq
npm run test:load
```

En ejecuciones sin Docker para la ingesta, usar:

```powershell
$env:OWM_BASE_URL = "http://localhost:4010"
```

## Configuracion

Variables principales:

| Variable            | Default                 | Uso                            |
| ------------------- | ----------------------- | ------------------------------ |
| `API_BASE_URL`      | `http://localhost:3000` | API bajo prueba                |
| `LOAD_DATASET_SIZE` | `72`                    | Mediciones creadas por corrida |
| `LOAD_RAMP_VUS`     | `10`                    | VUs del escenario sostenido    |
| `LOAD_SPIKE_VUS`    | `40`                    | VUs del pico                   |
| `LOAD_LONG_VUS`     | `8`                     | VUs de carga prolongada        |

Los umbrales versionados son p95 global menor a 750 ms, p95 por endpoint entre
650 y 900 ms segun la ruta, tasa de error menor a 2% y throughput global mayor a
15 req/s.

## Resultados

`npm run test:load` escribe:

- `docs/load-tests/latest-summary.json`
- `docs/load-tests/latest-report.html`

Los archivos `baseline-summary.json` y `baseline-report.html` documentan el
baseline inicial versionado para comparar futuras ejecuciones.

## Notificaciones con Mongo compartido vs dedicado

La historia S-03.19 agrega `npm run test:load:notifications` para comparar el
servicio de Notificaciones con la base compartida contra una base MongoDB local
dedicada. El procedimiento, las variables y la tabla comparativa viven en
`docs/load-tests/notifications-README.md`.
