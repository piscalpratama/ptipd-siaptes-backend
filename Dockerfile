# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
# Install semua dependency (termasuk devDependencies, mis. nodemon utk dev)
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder

WORKDIR /app

# Copy lockfile dulu untuk cache layer yang efisien
COPY package.json package-lock.json ./

# npm ci memastikan install reproducible (exact dari package-lock.json)
RUN npm ci --include=dev

# Copy source code
COPY . .

# ─── Stage 2: Production ──────────────────────────────────────────────────────
# Image ringan tanpa devDependencies. Scaling ditangani Kubernetes, bukan PM2.
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS production

# Buat user non-root untuk keamanan
RUN apk upgrade --no-cache && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Install hanya production dependencies (reproducible)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source dari builder stage — cuma folder yang dipakai runtime
COPY --from=builder --chown=nodejs:nodejs /app/src ./src

# Short commit SHA — di-isi CI lewat --build-arg (lihat .circleci/config.yml),
# dipakai /health buat verifikasi build mana yang benar-benar jalan di prod.
ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=$GIT_COMMIT

USER nodejs

EXPOSE 3100

# Health check — pakai $PORT agar adaptif (default 3100)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:${PORT:-3100}/health || exit 1

# Satu proses Node.js per container — scaling horizontal ditangani orchestrator
CMD ["node", "src/app.js"]
