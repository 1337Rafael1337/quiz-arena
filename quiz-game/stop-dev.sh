#!/bin/bash

echo "🛑 Stopping Quiz Arena Development Environment..."

# Stop all services
docker-compose down

echo "✅ All services stopped!"
echo ""
echo "🔧 Other options:"
echo "   Remove volumes too:  docker-compose down -v"
echo "   Remove images:       docker-compose down --rmi all"
echo "   Clean everything:    docker system prune -a"