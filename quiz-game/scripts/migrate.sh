#!/bin/bash

# Database Migration Script for Quiz Arena
# Usage: ./scripts/migrate.sh [command]
# Commands: migrate, status, rollback

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[MIGRATE]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "quiz-game/backend/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Navigate to backend directory
cd quiz-game/backend

# Default command
COMMAND=${1:-migrate}

case $COMMAND in
    "migrate"|"up")
        print_status "Running database migrations..."
        bun run migrate
        ;;
    "status")
        print_status "Checking migration status..."
        bun run migrate:status
        ;;
    "rollback"|"down")
        print_status "Rolling back migrations..."
        bun run migrate:rollback $2
        ;;
    "reset")
        print_status "Resetting database..."
        read -p "Are you sure you want to reset the database? This will delete all data! (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Dropping and recreating database..."
            # This would need to be implemented based on your database setup
            print_error "Database reset not implemented yet. Please manually drop and recreate the database."
        else
            print_status "Database reset cancelled."
        fi
        ;;
    "help"|"--help"|"-h")
        echo "Database Migration Script for Quiz Arena"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  migrate, up     Run pending migrations (default)"
        echo "  status          Show migration status"
        echo "  rollback, down  Rollback migrations"
        echo "  reset           Reset database (destructive!)"
        echo "  help            Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                    # Run migrations"
        echo "  $0 status             # Check status"
        echo "  $0 rollback 001       # Rollback to version 001"
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        print_status "Use '$0 help' for usage information"
        exit 1
        ;;
esac

print_success "Migration command completed!"