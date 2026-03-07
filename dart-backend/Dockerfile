# ============================================================
# Dockerfile — DART Backend
#
# Multi-stage build for the Next.js backend service.
# Uses Node 20 Alpine for minimal image size.
# Outputs standalone build for Docker deployment.
# ============================================================

# ----- Stage 1: Builder -----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code and build
COPY . .

# Create data directory for alerts.json if it doesn't exist
RUN mkdir -p src/data && \
    if [ ! -f src/data/alerts.json ]; then echo "[]" > src/data/alerts.json; fi

RUN npm run build

# ----- Stage 2: Runner -----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy data directory for persistent storage
COPY --from=builder /app/src/data ./src/data

# Ensure data directory is writable
RUN chown -R nextjs:nodejs ./src/data

USER nextjs

EXPOSE 3001

CMD ["node", "server.js"]
