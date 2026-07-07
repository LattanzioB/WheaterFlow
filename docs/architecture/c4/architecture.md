# Arquitectura (modelo C4)

Documentacion evolutiva de **WeatherFlow**: plataforma distribuida con API, Notification service, Ingestion service, RabbitMQ, MongoDB y Web UI. Las fuentes principales estan en **PlantUML** con la libreria [C4-PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML); tambien se mantiene una fuente Mermaid/SVG del componente distribuido para revision rapida.

## Nivel 1 - Contexto del sistema

Fuente: [c4_level_1_context.plantuml](c4_level_1_context.plantuml).

WeatherFlow se modela como **caja negra** (`System`). El actor principal es el **Usuario**, que usa la Web UI, gestiona alertas y recibe notificaciones in-app. **Telegram Bot API** aparece solo como canal externo opcional para vinculacion y entrega cuando el usuario lo habilita. API, Web UI, Notification service, RabbitMQ y MongoDB son detalle del nivel 2.

![C4 nivel 1 - Contexto](c4_level_1_context.png)

## Nivel 2 - Contenedores

Fuente: [c4_level_2_container.plantuml](c4_level_2_container.plantuml).

El **Usuario** accede solo a **Web UI**; la Web UI consume la API y el Notification service para notificaciones in-app. El **Ingestion service** es un worker independiente que consulta OpenWeather y se comunica con la API sin acceder directamente a MongoDB ni RabbitMQ. MongoDB, OpenWeather y Telegram Bot API son servicios externos; RabbitMQ permanece dentro del limite de WeatherFlow.

![C4 nivel 2 - Contenedores](c4_level_2_container.png)

## Nivel 3 - Componentes (API)

Fuente: [c4_level_3_api.plantuml](c4_level_3_api.plantuml).

Descompone el contenedor **API service**: el **Usuario** interactua con los controladores a traves de **Web UI** (contenedor hermano). El API publica `ClimateAlertDetectedMessage` en RabbitMQ cuando una medicion dispara una alerta. Incluye los dos controllers internos que recibe desde **Ingestion service** (`InternalIngestionStationsController` para el catalogo `provider=openweather`, `InternalIngestionMeasurementsController` para el alta idempotente de mediciones) y el camino de salida hacia Ingestion: `StationTemperatureReportsController` delega en `GetCurrentTemperatureReportService`, que usa `ApiToIngestionCurrentWeatherClient` para resolver el reporte de temperatura actual en tiempo real. `TemperatureAverageReportsController` resuelve los promedios diario/semanal solo contra MongoDB, sin tocar Ingestion. `MetricsController` (compartido desde `libs/shared`) expone `/metrics` a Prometheus y la instrumentacion de OpenTelemetry exporta spans a Jaeger, igual que en Notifications e Ingestion.

![C4 nivel 3 - API](c4_level_3_api.png)

## Nivel 3 - Componentes (Notification service)

Fuente: [c4_level_3_notifications.plantuml](c4_level_3_notifications.plantuml).

Descompone el contenedor **Notification service**. Las preferencias llegan via proxy desde **API service**; el **Web UI** consume `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` y el stream SSE `GET /notifications/stream`. Incluye la coleccion `notifications`, el adaptador **InAppAlertNotifierAdapter**, el evento `notification.delivered` y el consumidor Web. Al igual que en API e Ingestion, `MetricsController` expone `/metrics` a Prometheus y la instrumentacion de OpenTelemetry exporta spans a Jaeger.

![C4 nivel 3 - Notifications](c4_level_3_notifications.png)

## Nivel 3 - Componentes (Ingestion service)

Fuente: [c4_level_3_ingestion.plantuml](c4_level_3_ingestion.plantuml).

Descompone el contenedor **Ingestion service** (Entrega III). `IngestionScheduler` dispara ciclos `scheduled` por `INGESTION_CRON`; `IngestionController` expone el trigger `manual`; ambos delegan en `RunIngestionCycleService`, que orquesta `ApiWeatherStationCatalogAdapter` (catalogo `provider=openweather`), `ResilientWeatherDataProvider` (timeout, circuit breaker, bulkhead y cache sobre `OpenWeatherMapAdapter`) y `ApiMeasurementSubmitterAdapter` (timeout, breaker, bulkhead, reintentos seguros con idempotencia hacia la API). `CurrentWeatherController` reutiliza el mismo `ResilientWeatherDataProvider` para el reporte de temperatura actual, sin el fallback de cache reservado a los ciclos programados. `ManualIngestionTokenGuard` protege los tres endpoints internos con `x-ingestion-token`. Ingestion no accede a MongoDB ni RabbitMQ directamente: siempre escribe a traves del limite REST interno de la API. `IngestionMetrics`, `OpenWeatherResilienceMetrics` y `HttpBoundaryMetrics` se registran en `MetricsController`, expuesto a Prometheus en `/metrics`; la instrumentacion de OpenTelemetry exporta spans a Jaeger.

![C4 nivel 3 - Ingestion](c4_level_3_ingestion.png)

Fuente alternativa: [weatherflow-component.mmd](weatherflow-component.mmd).

![C4 componente distribuido](weatherflow-component.svg)

---

Ver tambien [Architecture Overview](../../architecture-overview.md).
