# Entrega III - arquitectura, evidencia y demo

Este documento consolida los artefactos para revisar la Entrega III de
WeatherFlow: ingesta OpenWeather, reportes, resiliencia, observabilidad,
pruebas de carga y recorrido de demostracion.

## Arquitectura final

La solucion queda separada en tres aplicaciones NestJS:

| Componente | Responsabilidad | Fronteras |
| --- | --- | --- |
| API service | Usuarios, estaciones, mediciones, reportes, alerta de dominio y publicacion RabbitMQ | Cliente -> API, API -> MongoDB, API -> RabbitMQ, API -> Notification service, API -> Ingestion service |
| Notification service | Preferencias, historial in-app, SSE, Telegram opcional y consumo de alertas | RabbitMQ -> Notifications, API -> Notifications, Web UI -> Notifications |
| Ingestion service | Cron, trigger manual, catalogo de estaciones OpenWeather, OWM Current Weather y normalizacion de lecturas | Ingestion -> API, API -> Ingestion, Ingestion -> OpenWeather |

Los desintegradores principales son:

- **Capacidad de negocio:** adquisicion externa y despacho de notificaciones
  cambian por motivos distintos al nucleo de estaciones y mediciones.
- **Propiedad de datos:** la API conserva estaciones/mediciones; Notifications
  conserva perfiles e historial; Ingestion no persiste agregados.
- **Frontera transaccional:** guardar una medicion no depende del envio de
  notificaciones ni de la disponibilidad futura de OWM.
- **Riesgo operacional:** fallas, rate limits y latencia de OpenWeather quedan
  aisladas en Ingestion.

## Diagramas

| Artefacto | Fuente |
| --- | --- |
| C4 e indice narrativo | `docs/architecture/c4/architecture.md` |
| C4 contexto | `docs/architecture/c4/c4_level_1_context.plantuml` |
| C4 contenedores | `docs/architecture/c4/c4_level_2_container.plantuml` |
| C4 componentes API | `docs/architecture/c4/c4_level_3_api.plantuml` |
| C4 componentes Notifications | `docs/architecture/c4/c4_level_3_notifications.plantuml` |
| Dominio | `docs/architecture/uml/weatherflow-domain-model.mmd` |
| Puertos y adaptadores | `docs/architecture/uml/weatherflow-ports-adapters.mmd` |
| Ingesta periodica | `docs/architecture/sequences/scheduled-ingestion-sequence.mmd` |
| Alerta por medicion OWM/manual | `docs/architecture/sequences/record-measurement-alert-sequence.mmd` |
| Temperatura actual | `docs/architecture/sequences/current-temperature-report-sequence.mmd` |
| Promedios diario/semanal | `docs/architecture/sequences/temperature-average-report-sequence.mmd` |

## Resiliencia

| Frontera | Estrategia | Evidencia documental |
| --- | --- | --- |
| Ingestion -> OpenWeather | Timeout, errores tipados, circuit breaker, bulkhead, cache de ultima lectura valida para cron | `docs/stories/E-03/S-03.7-resiliencia-frontera-openweathermap.md` |
| Ingestion -> API | Timeout, bulkhead, circuit breaker, retries seguros con backoff y clave de idempotencia estable | `docs/stories/E-03/S-03.8-resiliencia-frontera-ingesta-api.md` |
| API -> Ingestion | Timeout, bulkhead, circuit breaker y maximo un retry para reporte sincronico | `docs/stories/E-03/S-03.8-resiliencia-frontera-ingesta-api.md` |
| API -> RabbitMQ -> Notifications | Publicacion asincronica y consumo observable con ack/nack | `docs/architecture/sequences/record-measurement-alert-sequence.mmd` |

## Observabilidad

El perfil `observability` levanta Prometheus, Grafana, Loki, Promtail,
cAdvisor, Jaeger y Alertmanager.

| Tema | Artefacto |
| --- | --- |
| Dashboard versionado | `observability/grafana/provisioning/dashboards/weatherflow-overview.json` |
| Reglas Prometheus | `observability/prometheus/rules/weatherflow-alerts.yml` |
| Alertmanager | `observability/alertmanager/alertmanager.yml` |
| Runbook operativo | `observability/README.md` |
| Trazas distribuidas | `docs/stories/E-03/S-03.12-tracing-distribuido-ingesta-cola.md` |

## Evidencia de carga y datos

Las pruebas de carga versionadas viven en `scripts/load-tests/` y se documentan
en `docs/load-tests/README.md`.

| Evidencia | Ubicacion | Nota |
| --- | --- | --- |
| Baseline k6 JSON | `docs/load-tests/baseline-summary.json` | Escenarios `sustained_ramp`, `spike` y `long_run`, dataset de 72 mediciones |
| Baseline k6 HTML | `docs/load-tests/baseline-report.html` | Reporte navegable versionado |
| Salida de nueva corrida | `docs/load-tests/latest-summary.json` y `docs/load-tests/latest-report.html` | Generada por `npm run test:load` |

El dataset de carga crea 72 mediciones historicas, equivalentes a una semana de
datos cada 4 horas para la estacion bajo prueba. Para una demostracion contra
datos operativos reales, dejar `INGESTION_CRON` activo durante al menos siete
dias con `OWM_API_KEY` configurada; los promedios diario/semanal leen esas
mediciones persistidas en MongoDB sin llamar a OpenWeather.

## Recorrido de demo

1. Configurar `.env` desde `.env.example`, incluyendo `MONGODB_URI`,
   `JWT_SECRET`, `INGESTION_SYSTEM_TOKEN`, `OWM_API_KEY`, `RABBITMQ_*` y los
   endpoints OTLP por defecto.
2. Levantar la plataforma completa:

   ```bash
   docker compose --profile observability up --build
   ```

3. Verificar URLs:

   | Herramienta | URL |
   | --- | --- |
   | Web UI | `http://localhost:8080` |
   | API | `http://localhost:3000` |
   | Swagger | `http://localhost:3000/api/docs` |
   | Notifications health | `http://localhost:3001/health` |
   | Ingestion health | `http://localhost:3002/health` |
   | Grafana | `http://localhost:3300` |
   | Prometheus | `http://localhost:9090` |
   | Alertmanager | `http://localhost:9093` |
   | Jaeger | `http://localhost:16686` |
   | RabbitMQ management | `http://localhost:15672` |

4. Registrar o iniciar sesion, confirmar que existen las estaciones UNQ, Buenos
   Aires y Bariloche con `provider=openweather`.
5. Ejecutar un ciclo manual:

   ```bash
   curl -X POST http://localhost:3002/internal/ingestion/run \
     -H "x-ingestion-token: $INGESTION_SYSTEM_TOKEN"
   ```

6. Consultar en Swagger:

   - `GET /stations/:stationId/reports/temperature/current`
   - `GET /stations/:stationId/reports/temperature/daily-average`
   - `GET /stations/:stationId/reports/temperature/weekly-average`
   - `GET /measurements?stationName=...&reportedFrom=...&reportedTo=...`

7. Abrir Grafana para revisar `WeatherFlow Operaciones`, Prometheus para reglas
   activas y Jaeger para una traza con Ingestion -> API -> MongoDB -> RabbitMQ
   -> Notifications.

## Validaciones recomendadas

```bash
npm test -- --runInBand --testPathIgnorePatterns="libs/shared/src/documentation"
npm run build
docker compose config --quiet
```

Para validar carga con OWM mockeado:

```powershell
npm run test:load:owm-stub
$env:OWM_BASE_URL = "http://host.docker.internal:4010"
docker compose up --build api ingestion mongo rabbitmq
npm run test:load
```
