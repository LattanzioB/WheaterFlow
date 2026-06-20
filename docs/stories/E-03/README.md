# E-03: Entrega III — Datos externos, resiliencia y observabilidad

Estado: borrador

## Objetivo

Extender WeatherFlow desde el sistema distribuido de la Entrega II incorporando mediciones de OpenWeatherMap (OWM), exponiendo endpoints de reportes de temperatura, y agregando resiliencia y observabilidad de nivel productivo, preservando el pipeline de dominio existente (validación, alertas, suscripciones y notificaciones).

Las mediciones de OWM deben persistir en la misma base MongoDB, atravesar el mismo flujo de detección de alertas y disparar el mismo camino RabbitMQ → servicio de notificaciones ya construido en la Entrega II. La búsqueda, el filtrado, las suscripciones y las notificaciones deben funcionar sin cambios sobre datos de origen externo.

## Dirección arquitectónica

La capacidad de ingesta se extrae como un tercer componente ejecutable de forma independiente porque satisface múltiples desintegradores de granularidad:

- **Desintegrador de capacidad de negocio**: el polling climático externo cambia por razones distintas al manejo de consultas REST o la entrega de notificaciones.
- **Aislamiento de fallos**: la latencia, los rate limits y las caídas de OWM no deben degradar la disponibilidad de la API para requests de usuarios.
- **Desintegrador de volatilidad**: el schedule de polling, el mapeo de proveedor y el parseo de respuestas OWM pueden evolucionar sin tocar la lógica de consulta de mediciones o alertas.
- **Desintegrador de despliegue**: el worker de ingesta puede escalarse, reiniciarse o limitarse de forma independiente respecto a las réplicas de API y notificaciones.

Layout objetivo recomendado (un repositorio, tres aplicaciones NestJS):

- `api`: ownership sin cambios — auth, estaciones, mediciones, detección de alertas, publicación de alertas, endpoints de reportes.
- `notifications`: ownership sin cambios — preferencias, canales, consumo de cola, despacho.
- `ingest`: nuevo — polling programado de OWM, adaptador de proveedor, resiliencia en la frontera externa, envío remoto al endpoint de mediciones de la API.

La comunicación remota entre componentes propios sigue usando REST (ingest → API) y RabbitMQ (API → notifications), consistente con la Entrega II.

Estaciones default de seed (mínimo):

1. Universidad Nacional de Quilmes (UNQ)
2. Ciudad Autónoma de Buenos Aires (CABA)
3. La Plata, Buenos Aires

Cada estación default se asocia con `OpenWeather` como proveedor climático usando sus coordenadas almacenadas.

## Historias

| ID      | Título                                                       | Estado   | Paralelizable |
| ------- | ------------------------------------------------------------ | -------- | ------------- |
| S-03.1  | Extender modelo de estación con proveedor climático          | borrador | sí (con S-03.3) |
| S-03.2  | Seed de estaciones default OpenWeather                       | borrador | sí (con S-03.4) |
| S-03.3  | Scaffold del servicio ingest y entorno Docker                | borrador | sí (con S-03.1) |
| S-03.4  | Implementar adaptador HTTP OWM y mapeo de respuesta          | borrador | no            |
| S-03.5  | Implementar job de ingesta programada                        | borrador | no            |
| S-03.6  | Enviar mediciones OWM por el pipeline de dominio existente   | borrador | no            |
| S-03.7  | Resiliencia en frontera OpenWeatherMap                       | borrador | sí (con S-03.8) |
| S-03.8  | Resiliencia en frontera ingest → API                         | borrador | sí (con S-03.7) |
| S-03.9  | Endpoint de reporte — temperatura actual                     | borrador | sí (con carril ingest) |
| S-03.10 | Endpoints de reporte — promedios diario y semanal            | borrador | no            |
| S-03.11 | Stack de agregación de logs y métricas                       | borrador | sí (parcial, desde S-03.3) |
| S-03.12 | Tracing distribuido ingest → alerta en cola                  | borrador | no            |
| S-03.13 | Tests de carga para endpoints de consulta y reportes         | borrador | no            |
| S-03.14 | Dashboard de monitoreo con métricas de negocio               | borrador | no            |
| S-03.15 | Actualizar documentación de arquitectura de la Entrega III   | borrador | no            |

### Grafo de dependencias

```
                    ┌──> S-03.9 ──> S-03.10 ──┐
S-03.1 ──┬──> S-03.2 │                         ├──> S-03.13
         │           │                         │
         └──> S-03.3 ├──> S-03.4 ──> S-03.5 ──> S-03.6 ──┬──> S-03.7
                                                          └──> S-03.8
S-03.3 ───────────────────────────────────────────────> S-03.11 ──> S-03.12 ──> S-03.14 ──> S-03.15
S-03.6 ──────────────────────────────────────────────────────────────────────> S-03.12
S-03.10 ─────────────────────────────────────────────────────────────────────> S-03.13
```

### Carriles paralelos sugeridos

| Carril | Historias | Notas |
| ------ | --------- | ----- |
| **A — Dominio API** | S-03.1 → S-03.2 → S-03.9 → S-03.10 | Reportes no dependen de ingest; pueden avanzar en paralelo al carril B. |
| **B — Ingesta** | S-03.3 → S-03.4 → S-03.5 → S-03.6 | Requiere S-03.1 para consultar estaciones con proveedor. |
| **C — Resiliencia** | S-03.7 ∥ S-03.8 | Tras S-03.6; cada frontera es independiente. |
| **D — Observabilidad** | S-03.11 → S-03.12 → S-03.14 | S-03.11 puede iniciar instrumentación básica junto con S-03.3; tracing E2E requiere S-03.6. |
| **E — Cierre** | S-03.13, S-03.15 | Load tests tras reportes; docs al final. |

| Historia | Estimación | Resultado demostrable |
| -------- | ---------- | --------------------- |
| S-03.1   | 3h         | Estaciones persisten proveedor climático opcional y coordenadas. |
| S-03.2   | 2h         | Tres estaciones default OpenWeather existen tras seed idempotente. |
| S-03.3   | 6h         | `apps/ingest` compila, arranca y corre en Docker Compose. |
| S-03.4   | 4h         | Adaptador OWM normaliza lecturas desde Current Weather API. |
| S-03.5   | 4h         | Cron configurable consulta OWM para estaciones asociadas. |
| S-03.6   | 6h         | Lecturas OWM persisten vía API y disparan alertas/notificaciones. |
| S-03.7   | 5h         | Time-out, circuit breaker y cache protegen llamadas a OWM. |
| S-03.8   | 5h         | Time-out y bulkhead protegen envío ingest → API. |
| S-03.9   | 3h         | Endpoint de temperatura actual operativo y documentado. |
| S-03.10  | 4h         | Endpoints de promedios diario y semanal operativos. |
| S-03.11  | 6h         | Logs centralizados y métricas Prometheus en los tres servicios. |
| S-03.12  | 6h         | Trace único visible desde ingest hasta publicación en RabbitMQ. |
| S-03.13  | 6h         | Tres escenarios de carga automatizados sobre consultas/reportes. |
| S-03.14  | 6h         | Dashboard Grafana con paneles hardware, endpoints y negocio. |
| S-03.15  | 8h         | Docs, diagramas, Swagger, alerting y evidencia de una semana de datos. |

## Definición de terminado

1. `docker compose up` levanta RabbitMQ, API, servicio de notificaciones, servicio ingest y stack de observabilidad (según S-03.11/S-03.14).
2. Tres estaciones default (UNQ + dos ciudades elegidas) existen y están asociadas a OpenWeather vía coordenadas.
3. El servicio ingest consulta OWM en un schedule configurable y envía mediciones remotamente a la API.
4. Las mediciones de origen OWM persisten en MongoDB y atraviesan el mismo flujo de detección de alertas y publicación RabbitMQ que las manuales.
5. Se implementan y documentan al menos tres estrategias de resiliencia con justificación de frontera (S-03.7 + S-03.8).
6. La observabilidad cubre agregación de logs (S-03.11), agregación de métricas (S-03.11), tracing distribuido ingest → alerta en cola (S-03.12) y estrategia de alerting documentada (S-03.15).
7. Tres endpoints de reportes de temperatura están expuestos y documentados en Swagger (S-03.9 + S-03.10).
8. Al menos tres tests de carga cubren endpoints de consulta/reportes (S-03.13).
9. El dashboard de monitoreo muestra métricas de hardware, por endpoint y de negocio (S-03.14).
10. Hay al menos una semana de datos OWM en la base para al menos una ubicación default (evidencia en S-03.15).
11. La documentación de arquitectura incluye diagrama evolutivo, diagramas de secuencia y justificación tecnológica (S-03.15).
