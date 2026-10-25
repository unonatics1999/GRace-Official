# Production image: multi-stage, non-root, Next.js standalone output.
# Build:  docker build -t downtime .
# Run:    docker run -p 3000:3000 --env-file .env -v downtime-storage:/app/storage downtime
# Migrations run on start (prisma migrate deploy). Requires the PostgreSQL provider in production.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 STORAGE_DIR=/app/storage
RUN addgroup -S app && adduser -S app -G app && mkdir -p /app/storage && chown app:app /app/storage
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/node_modules/prisma ./node_modules/prisma
COPY --from=build --chown=app:app /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
