# WeatherFlow Observability Runbook

Este stack se levanta con el perfil opcional de observabilidad:

```bash
docker compose --profile observability up --build
```

URLs locales:

| Herramienta | URL | Uso |
| --- | --- | --- |
| Grafana | `http://localhost:3300` | Dashboard operativo `WeatherFlow Operaciones` |
| Prometheus | `http://localhost:9090` | Scrapes, consultas PromQL y reglas |
| Alertmanager | `http://localhost:9093` | Estado, agrupacion y silencios de alertas |
| cAdvisor | `http://localhost:8081` | Metricas de contenedores |
| Loki | `http://localhost:3100` | Logs centralizados consumidos por Grafana |
| Jaeger | `http://localhost:16686` | Trazas distribuidas |

## Dashboard

El dashboard versionado en
`observability/grafana/provisioning/dashboards/weatherflow-overview.json` se
carga automaticamente por provisioning. Incluye:

- CPU, memoria y reinicios aproximados por contenedor desde cAdvisor.
- Requests, errores 5xx y p95 por endpoint desde `/metrics`.
- Mediciones OpenWeather por minuto, errores OWM y estado de breakers.
- Alertas publicadas por la API y mensajes consumidos por Notifications.
- Alertas Prometheus activas y logs WeatherFlow desde Loki.

Interpretacion rapida:

- `Servicios scrapeados` debe mostrar `UP` para API, Notifications e Ingestion.
- `Reinicios aproximados por contenedor` usa cambios en
  `container_start_time_seconds`; valores mayores a 0 indican recreacion o
  reinicio del contenedor durante la ventana.
- `Breakers activos` debe mantenerse en 0 para estados distintos de `closed`.
- `Mediciones OWM por minuto` debe mostrar actividad cuando `INGESTION_CRON`
  ejecuta ciclos o cuando se dispara una corrida manual.

## Alertas

Las reglas viven en `observability/prometheus/rules/weatherflow-alerts.yml`.

| Alerta | Condicion | Severidad |
| --- | --- | --- |
| `WeatherFlowServiceDown` | API, Notifications o Ingestion no scrapeable por 1 minuto | critical |
| `WeatherFlowIngestionStopped` | Sin ciclos scheduled de ingesta en 15 minutos | warning |
| `WeatherFlowOpenWeatherErrorsHigh` | Mas de 25% de fallos/rechazos OWM durante 5 minutos | warning |
| `WeatherFlowHttpP95High` | p95 HTTP por endpoint mayor a 1 segundo durante 5 minutos | warning |

Alertmanager usa una ruta de demostracion en
`observability/alertmanager/alertmanager.yml`. Agrupa por alerta, servicio/job y
severidad, espera 30 segundos antes del primer envio, reagrupa cada 5 minutos y
repite cada 2 horas. Los silencios se crean desde `http://localhost:9093`; para
la demo, silenciar por `alertname` y `job` evita ruido sin ocultar otras
degradaciones.

## Probar alertas

Para ver el webhook de demostracion:

```bash
node -e "require('http').createServer((req,res)=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{console.log(b);res.end('ok')})}).listen(9099)"
```

Escenarios reproducibles:

1. Servicio caido:
   ```bash
   docker compose stop ingestion
   ```
   Esperar 1 minuto y revisar Prometheus, Alertmanager y Grafana.

2. Ingesta detenida:
   configurar temporalmente un `INGESTION_CRON` mas lento que 15 minutos o
   detener `ingestion` despues de confirmar que Prometheus conserva la serie
   `weatherflow_ingestion_cycles_total`.

3. Errores OWM elevados:
   iniciar ingesta con un `OWM_BASE_URL` invalido para acumular fallos typed en
   `weatherflow_owm_failures_total`.

4. p95 alto:
   ejecutar pruebas de carga contra endpoints de reportes y consultar
   `WeatherFlowHttpP95High` en Prometheus. El umbral operativo documentado es
   1 segundo sostenido durante 5 minutos.
