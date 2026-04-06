FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy source
COPY src ./src

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3001

# Run migrations then start server
CMD ["sh", "-c", "bun src/database/migrate.ts && bun src/server.ts"]
