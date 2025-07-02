#!/bin/bash

echo "🐳 Starting Quiz Arena Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old volumes (optional - uncomment if you want fresh data)
# echo "🗑️  Removing old volumes..."
# docker-compose down -v

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker-compose ps

# Show logs
echo ""
echo "📋 Recent logs:"
docker-compose logs --tail=20

echo ""
echo "✅ Development environment started!"
echo ""
echo "🌐 Services available at:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:3001"
echo "   pgAdmin:   http://localhost:8080"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop all:      docker-compose down"
echo "   Restart:       docker-compose restart"
echo "   Fresh start:   docker-compose down -v && docker-compose up --build"
echo ""
echo "📝 First time setup:"
echo "   1. Go to http://localhost:5173/setup"
echo "   2. Create your first admin user"
echo "   3. Start creating questions and games!"