# E-03: Entrega III — Ingesta externa, resiliencia y observabilidad

Estado: en progreso

## Objetivo

Extender WeatherFlow con mediciones periódicas de OpenWeatherMap (OWM), tres
reportes de temperatura, tolerancia a fallos y observabilidad completa, sin
duplicar ni alterar el pipeline de dominio existente.

Las mediciones externas se registran en la API y atraviesan el mismo flujo que
las manuales: validación, persistencia, evaluación de alertas, publicación en
RabbitMQ y despacho de notificaciones.

## Decisiones consolidadas

- La ingesta será una tercera aplicación NestJS independiente:
  `apps/ingestion`.
- La comunicación `ingestion → api` será REST mediante un endpoint interno con
  autenticación de sistema.
- La API seguirá siendo dueña del dominio de mediciones.
- Las estaciones usan `provider: none | openweather`.
- Las mediciones usan `source: manual | openweather`.
- Las estaciones iniciales son UNQ, Buenos Aires y Bariloche, ya implementadas.
- La observabilidad se apoya en Prometheus, Grafana, Loki, OpenTelemetry,
  Jaeger y Alertmanager.

## Historias

| ID      | Historia                                              | Estado     |
| ------- | ----------------------------------------------------- | ---------- |
| S-03.1  | Modelo de estación con proveedor y origen de medición | completada |
| S-03.2  | Carga inicial de estaciones OpenWeather por defecto   | completada |
| S-03.3  | Estructura base del servicio de ingesta y Docker      | completada |
| S-03.4  | Adaptador HTTP de OpenWeatherMap                      | pendiente  |
| S-03.5  | Proceso de ingesta programada                         | pendiente  |
| S-03.6  | Registro remoto por el pipeline de dominio            | pendiente  |
| S-03.7  | Resiliencia en la frontera OpenWeatherMap             | pendiente  |
| S-03.8  | Resiliencia en la frontera ingesta → API              | pendiente  |
| S-03.9  | Reporte de temperatura actual                         | pendiente  |
| S-03.10 | Reportes de promedio diario y semanal                 | pendiente  |
| S-03.11 | Agregación de logs y métricas                         | pendiente  |
| S-03.12 | Trazabilidad distribuida hasta la cola                | pendiente  |
| S-03.13 | Pruebas de carga de consultas y reportes              | pendiente  |
| S-03.14 | Panel de monitoreo y estrategia de alertas operativas | pendiente  |
| S-03.15 | Documentación de arquitectura de la Entrega III       | pendiente  |

## Dependencias

```text
S-03.1 ──> S-03.2
   ├─────> S-03.3 ──> S-03.4 ──> S-03.5 ──> S-03.6 ──┬─> S-03.7
   │                                                  └─> S-03.8
   └─────> S-03.9 ──> S-03.10 ──────────────────────────> S-03.13

S-03.3 ──> S-03.11
S-03.6 + S-03.11 ──> S-03.12
S-03.11 + S-03.12 ──> S-03.14
Todas ──> S-03.15
```

## Definición de terminado

1. Docker Compose levanta API, notificaciones, ingesta, MongoDB, RabbitMQ y el
   stack de observabilidad.
2. OWM alimenta periódicamente las tres estaciones configuradas.
3. Las lecturas externas atraviesan el pipeline existente y pueden disparar
   alertas y notificaciones.
4. Hay al menos tres estrategias de tolerancia a fallos justificadas.
5. Los tres reportes están documentados en Swagger y cubiertos por pruebas.
6. Logs, métricas, trazas y alertas operativas son consultables.
7. Grafana muestra métricas de hardware, endpoints y negocio.
8. Existen tres escenarios k6 con umbrales y resultados documentados.
9. La documentación refleja la arquitectura final y evidencia datos OWM.
