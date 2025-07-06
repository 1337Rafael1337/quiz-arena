#!/bin/bash

# Quiz Arena Setup Script
# This script sets up the entire Quiz Arena application with Docker

set -e

echo "🎯 Quiz Arena Setup Script"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Create environment file
setup_env() {
    if [ ! -f .env ]; then
        print_status "Creating .env file from template..."
        cp .env.example .env
        
        # Generate random JWT secret
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "your-super-secret-jwt-key-$(date +%s)")
        sed -i.bak "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/" .env
        rm .env.bak 2>/dev/null || true
        
        print_success ".env file created with random JWT secret"
        print_warning "Please review and update the .env file with your specific configuration"
    else
        print_success ".env file already exists"
    fi
}

# Create necessary directories
setup_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p backend/logs
    mkdir -p backups
    mkdir -p nginx/logs
    
    print_success "Directories created"
}

# Build and start services
start_services() {
    local env_file=${1:-"docker-compose.yml"}
    
    print_status "Building and starting services with $env_file..."
    
    # Pull latest images
    docker-compose -f $env_file pull
    
    # Build services
    docker-compose -f $env_file build --no-cache
    
    # Start services
    docker-compose -f $env_file up -d
    
    print_success "Services started successfully"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for database
    print_status "Waiting for database..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose exec -T postgres pg_isready -U quiz_user -d quiz_arena &> /dev/null; then
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "Database failed to start within 60 seconds"
        exit 1
    fi
    
    # Wait for backend
    print_status "Waiting for backend..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3001/health &> /dev/null; then
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_warning "Backend health check failed, but continuing..."
    fi
    
    print_success "Services are ready"
}

# Show service status
show_status() {
    print_status "Service Status:"
    docker-compose ps
    
    echo ""
    print_success "🎉 Quiz Arena is now running!"
    echo ""
    echo "📱 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:3001"
    echo "🗄️  Database: localhost:5432"
    echo "🔴 Redis: localhost:6379"
    echo ""
    echo "📋 Useful commands:"
    echo "  - View logs: docker-compose logs -f"
    echo "  - Stop services: docker-compose down"
    echo "  - Restart services: docker-compose restart"
    echo "  - Update services: ./scripts/update.sh"
    echo ""
}

# Main setup function
main() {
    local mode=${1:-"development"}
    
    echo "Setting up Quiz Arena in $mode mode..."
    echo ""
    
    check_docker
    setup_env
    setup_directories
    
    if [ "$mode" = "production" ]; then
        start_services "docker-compose.prod.yml"
    else
        start_services "docker-compose.yml"
    fi
    
    wait_for_services
    show_status
}

# Parse command line arguments
case "${1:-}" in
    "prod"|"production")
        main "production"
        ;;
    "dev"|"development"|"")
        main "development"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [mode]"
        echo ""
        echo "Modes:"
        echo "  dev, development (default) - Start in development mode"
        echo "  prod, production           - Start in production mode"
        echo "  help                       - Show this help"
        ;;
    *)
        print_error "Unknown mode: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac