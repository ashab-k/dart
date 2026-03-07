# ============================================================
# Dockerfile — DART Frontend
#
# Multi-stage build for the Next.js frontend dashboard.
# Uses Node 20 Alpine for minimal image size.
#
# NEXT_PUBLIC_ vars must be available at build time because
# Next.js inlines them into the client JS bundle.
# ============================================================

# ----- Stage 1: Builder -----
FROM node:20-alpine AS builder

WORKDIR /app

# Accept NEXT_PUBLIC_ env vars as build args
ARG NEXT_PUBLIC_DART_BACKEND_URL=http://localhost:3001
ARG NEXT_PUBLIC_DUMMY_SERVER_URL=http://localhost:3002
ENV NEXT_PUBLIC_DART_BACKEND_URL=$NEXT_PUBLIC_DART_BACKEND_URL
ENV NEXT_PUBLIC_DUMMY_SERVER_URL=$NEXT_PUBLIC_DUMMY_SERVER_URL

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# ----- Stage 2: Runner -----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
