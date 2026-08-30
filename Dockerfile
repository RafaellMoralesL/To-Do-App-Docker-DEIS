FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --force --no-package-lock --legacy-peer-deps
COPY frontend/ .
RUN ./node_modules/.bin/vite build || npx vite build


FROM node:22-alpine AS backend-compile
WORKDIR /app/backend
RUN apk add --no-cache python3 make g++ sqlite-dev
COPY backend/package*.json ./
RUN npm install --legacy-peer-deps --no-package-lock
COPY backend/src ./src
COPY backend/tsconfig.json ./
RUN npm run build
RUN npm prune --production

FROM alpine:3.20 AS production
WORKDIR /backend


RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache nodejs libstdc++ libgcc


RUN addgroup -g 1000 node && \
    adduser -u 1000 -G node -s /bin/sh -D node


RUN mkdir -p /backend/data && chown -R node:node /backend


COPY --from=backend-compile /app/backend/node_modules ./node_modules
COPY --from=backend-compile /app/backend/dist ./dist
COPY --from=frontend-build /app/frontend/dist ./public

USER node
EXPOSE 3000
VOLUME [ "/backend/data" ]
CMD ["node", "dist/index.js"]
