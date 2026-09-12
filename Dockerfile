FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ .
RUN npm run build


FROM node:22-alpine AS backend-compile
WORKDIR /app/backend
RUN apk add --no-cache python3 make g++ sqlite-dev
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY backend/src ./src
COPY backend/tsconfig.json ./
RUN npm run build
RUN npm prune --omit=dev


FROM node:22-alpine AS production-base
LABEL maintainer="Todo App Team"
LABEL version="2.0.0"
LABEL description="To-Do App v2 - CRUD con estados PENDIENTE/EN PROGRESO/COMPLETADA"

RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache sqlite-libs && \
    addgroup -g 1000 -S node 2>/dev/null || true && \
    adduser -u 1000 -S node -G node -s /bin/sh -D 2>/dev/null || true && \
    mkdir -p /backend/data && \
    chown -R node:node /backend

FROM production-base AS production

WORKDIR /backend

COPY --from=backend-compile /app/backend/node_modules ./node_modules
COPY --from=backend-compile /app/backend/dist ./dist
COPY --from=frontend-build /app/frontend/dist ./public

USER node
EXPOSE 3000
VOLUME [ "/backend/data" ]

ENV NODE_ENV=production
ENV PUERTO=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/tasks || exit 1

CMD ["node", "dist/index.js"]
