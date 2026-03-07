# ============================================================
# Dockerfile — Dummy Server
#
# Multi-stage build for the simulated production server.
# Uses Node 20 Alpine for minimal image size.
# ============================================================

# ----- Stage 1: Builder -----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ----- Stage 2: Runner -----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3002

CMD ["node", "server.js"]
