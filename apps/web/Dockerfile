FROM node:20-alpine AS build

WORKDIR /app

COPY apps/web/package.json apps/web/package-lock.json* ./apps/web/
RUN cd apps/web && npm install

COPY apps/web ./apps/web

ARG VITE_API_BASE_URL=http://localhost:3000
ARG VITE_NOTIFICATIONS_BASE_URL=http://localhost:3001
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_NOTIFICATIONS_BASE_URL=$VITE_NOTIFICATIONS_BASE_URL

RUN cd apps/web && npm run build

FROM nginx:alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
