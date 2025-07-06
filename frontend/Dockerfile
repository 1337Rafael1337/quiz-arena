# Build stage
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN npm install -g bun
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM nginx:alpine AS production

# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create nginx user (skip if exists)
RUN addgroup -g 1001 -S nginxuser || true
RUN adduser -S nginxuser -u 1001 -G nginxuser || true

# Set proper permissions
RUN chown -R nginxuser:nginxuser /usr/share/nginx/html
RUN chown -R nginxuser:nginxuser /var/cache/nginx
RUN chown -R nginxuser:nginxuser /var/log/nginx
RUN chown -R nginxuser:nginxuser /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R nginxuser:nginxuser /var/run/nginx.pid

# Switch to non-root user
USER nginxuser

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]