# ---- Build stage ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Puppeteers eigenes Chromium wird nicht gebraucht — im Container läuft System-Chromium
ENV PUPPETEER_SKIP_DOWNLOAD=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:22-bookworm-slim
WORKDIR /app

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    DATA_DIR=/app/data \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Standalone-Output enthält server.js + benötigte node_modules (inkl. better-sqlite3/sharp);
# public/ und .next/static werden laut Next-Doku manuell dazukopiert
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

VOLUME /app/data
EXPOSE 3000

CMD ["node", "server.js"]
