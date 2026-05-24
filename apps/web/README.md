# WeatherFlow Web UI

Interfaz web (extra del enunciado) para ejecutar los casos de uso contra la API REST.

## Requisitos

- API en ejecución (`http://localhost:3000`)
- Variable `VITE_API_BASE_URL` apuntando a la API (ver `.env.example`)
- CORS habilitado en la API para `http://localhost:5174` (y `8080` en Docker).

## Desarrollo local

```bash
# Desde la raíz del monorepo
cp apps/web/.env.example apps/web/.env

npm run start:api:dev
npm run start:web:dev
```

Abrir `http://localhost:5174`.

## Script de demo (multi-usuario)

1. **Usuario A**: registrarse → crear estación en *Mis estaciones* → *Mediciones* → registrar una lectura con alerta (p. ej. temperatura 42°C).
2. **Usuario B**: cerrar sesión → registrarse o usar `collaborator@example.com` / `mockpass123` (si corriste el seed).
3. **Usuario B**: *Estaciones disponibles* → copiar ID de la estación de A → *Suscripciones* → suscribirse con tipo `EXTREME_HEAT`.
4. **Usuario A**: volver a registrar medición con alerta en la misma estación.
5. Revisar logs del servicio de notificaciones (`NOTIFICATION_DELIVERY_MODE=log`).

## Docker

Con `docker compose up --build`, la UI queda en `http://localhost:8080` y llama a la API en `http://localhost:3000` (navegador del host).
