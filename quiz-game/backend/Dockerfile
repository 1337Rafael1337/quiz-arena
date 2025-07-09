# Backend Dockerfile for Quiz Arena - Production Ready
FROM oven/bun:1-alpine AS base

# Install system dependencies
RUN apk update && apk add --no-cache \
    wget \
    curl \
    postgresql-client \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Build stage
FROM base AS build
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Production stage
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S quizapp -u 1001

# Create uploads directory with proper permissions
RUN mkdir -p uploads && \
    chown -R quizapp:nodejs /app && \
    chmod -R 755 /app

USER quizapp

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start application
CMD ["bun", "run", "start"]