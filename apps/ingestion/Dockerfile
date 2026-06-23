FROM node:22-alpine AS dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM dependencies AS build

COPY . .
RUN npm run build:ingestion

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 3002
CMD ["node", "dist/apps/ingestion/apps/ingestion/src/main.js"]
