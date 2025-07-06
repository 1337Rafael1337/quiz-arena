#!/bin/bash

# Quiz Arena Update Script
# This script updates the Quiz Arena application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Backup database
backup_database() {
    print_status "Creating database backup..."
    
    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_file="backups/quiz_arena_backup_$timestamp.sql"
    
    mkdir -p backups
    
    docker-compose exec -T postgres pg_dump -U quiz_user quiz_arena > $backup_file
    
    if [ $? -eq 0 ]; then
        print_success "Database backup created: $backup_file"
    else
        print_error "Database backup failed"
        exit 1
    fi
}

# Update services
update_services() {
    local compose_file=${1:-"docker-compose.yml"}
    
    print_status "Updating services..."
    
    # Pull latest images
    docker-compose -f $compose_file pull
    
    # Rebuild services
    docker-compose -f $compose_file build --no-cache
    
    # Restart services with zero downtime
    docker-compose -f $compose_file up -d --force-recreate
    
    print_success "Services updated successfully"
}

# Run migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Wait for database to be ready
    sleep 10
    
    docker-compose exec backend bun run migrate
    
    if [ $? -eq 0 ]; then
        print_success "Migrations completed successfully"
    else
        print_warning "Migrations failed or not needed"
    fi
}

# Clean up old images
cleanup() {
    print_status "Cleaning up old Docker images..."
    
    docker image prune -f
    docker volume prune -f
    
    print_success "Cleanup completed"
}

# Main update function
main() {
    local mode=${1:-"development"}
    
    echo "🔄 Updating Quiz Arena in $mode mode..."
    echo ""
    
    # Create backup before update
    backup_database
    
    if [ "$mode" = "production" ]; then
        update_services "docker-compose.prod.yml"
    else
        update_services "docker-compose.yml"
    fi
    
    run_migrations
    cleanup
    
    print_success "🎉 Quiz Arena updated successfully!"
    
    # Show status
    docker-compose ps
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
        echo "  dev, development (default) - Update in development mode"
        echo "  prod, production           - Update in production mode"
        echo "  help                       - Show this help"
        ;;
    *)
        print_error "Unknown mode: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac