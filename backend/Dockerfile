# Use Bun as base image
FROM oven/bun:1.1.34-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1.1.34-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bunjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=base --chown=bunjs:nodejs /app/dist ./dist
COPY --from=base --chown=bunjs:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=bunjs:nodejs /app/package.json ./package.json

# Create logs directory
RUN mkdir -p logs && chown bunjs:nodejs logs

# Switch to non-root user
USER bunjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --version || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "start"]