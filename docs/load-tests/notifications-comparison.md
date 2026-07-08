# Comparacion S-03.19: base compartida vs Mongo dedicado de Notificaciones

Fecha de corrida: 2026-07-08

## Escenarios

| Escenario | Persistencia API | Persistencia Notificaciones | Artefactos |
| --- | --- | --- | --- |
| A: Atlas compartido | Atlas `weatherflow` | Atlas `weatherflow` | `notifications-scenario-a-summary.json`, `notifications-scenario-a-report.html` |
| B: Mongo dedicado | Atlas `weatherflow` | Mongo local `weatherflow-notifications` en `localhost:27018` | `notifications-scenario-b-summary.json`, `notifications-scenario-b-report.html` |

Ambas corridas usaron el mismo script k6 (`npm run test:load:notifications`),
los mismos VUs/duraciones y el pipeline real de alertas: `POST /measurements`
con `temperature > 40`, publicacion en RabbitMQ, consumo por Notificaciones y
lecturas/escrituras contra el servicio de Notificaciones.

En la corrida B se uso `LOAD_NOTIFICATION_SETTLE_SLEEP=1` para dar tiempo al
consumer de RabbitMQ antes de leer notificaciones.

## Resultado comparativo

| Metrica | A: Atlas compartido | B: Mongo dedicado | Cambio B vs A |
| --- | ---: | ---: | ---: |
| Checks | 100.00% | 100.00% | 0.00 pp |
| HTTP failed | 0.00% | 0.00% | 0.00 pp |
| Load check errors | 0.00% | 0.00% | 0.00 pp |
| Throughput global | 32.07 req/s | 22.37 req/s | -30.2% |
| p95 HTTP global | 595.20 ms | 122.94 ms | -79.3% |
| p95 `POST /measurements` | 815.05 ms | 142.90 ms | -82.5% |
| p95 `GET /notifications` | 638.45 ms | 13.97 ms | -97.8% |
| p95 `PATCH /notifications/read-all` | 134.46 ms | 16.59 ms | -87.7% |
| p95 `GET /notification-preferences/users/:userId` | 72.07 ms | 13.05 ms | -81.9% |

## Umbrales

| Escenario | Resultado |
| --- | --- |
| A | Falla `http_req_duration{endpoint:alert_measurement} p(95)<800` por 15.05 ms (`815.05 ms`). |
| B | Pasa todos los umbrales versionados. |

## Observaciones

- Separar la persistencia de Notificaciones reduce fuertemente la latencia p95
  de lecturas y escrituras propias del servicio.
- La corrida B baja el throughput global porque agrega una espera intencional de
  1 segundo por iteracion para estabilizar el consumo asincronico de RabbitMQ.
  Por eso el throughput no debe interpretarse aislado de esa espera.
- `PATCH /notifications/:id/read` no tuvo muestras reales en la corrida B:
  `GET /notifications` fue exitoso, pero no siempre encontro una notificacion
  individual disponible para marcar antes de `read-all`.

## Conclusion

El experimento favorece aislar la base de Notificaciones cuando el objetivo es
reducir latencia p95 del servicio bajo carga. La comparacion muestra mejoras
entre 81.9% y 97.8% en las rutas de Notificaciones medidas, sin errores HTTP ni
checks fallidos en el escenario B.

Antes de convertir esto en una decision permanente de arquitectura, conviene
ajustar el script para esperar/pollear una notificacion concreta y asi medir
tambien `PATCH /notifications/:id/read` de forma simetrica.
