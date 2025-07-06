#!/bin/bash

# Quiz Arena Backup Script
# This script creates backups of the database and application data

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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
setup_backup_dir() {
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    echo "$backup_dir"
}

# Backup database
backup_database() {
    local backup_dir=$1
    
    print_status "Backing up database..."
    
    docker-compose exec -T postgres pg_dump -U quiz_user quiz_arena > "$backup_dir/database.sql"
    
    if [ $? -eq 0 ]; then
        print_success "Database backup completed"
    else
        print_error "Database backup failed"
        return 1
    fi
}

# Backup application logs
backup_logs() {
    local backup_dir=$1
    
    print_status "Backing up application logs..."
    
    if [ -d "backend/logs" ]; then
        cp -r backend/logs "$backup_dir/"
        print_success "Logs backup completed"
    else
        print_status "No logs directory found, skipping..."
    fi
}

# Backup configuration
backup_config() {
    local backup_dir=$1
    
    print_status "Backing up configuration..."
    
    # Copy environment file (without sensitive data)
    if [ -f ".env" ]; then
        grep -v "PASSWORD\|SECRET" .env > "$backup_dir/env.example" || true
    fi
    
    # Copy docker-compose files
    cp docker-compose*.yml "$backup_dir/" 2>/dev/null || true
    
    print_success "Configuration backup completed"
}

# Create compressed archive
create_archive() {
    local backup_dir=$1
    local archive_name="$backup_dir.tar.gz"
    
    print_status "Creating compressed archive..."
    
    tar -czf "$archive_name" -C "$(dirname "$backup_dir")" "$(basename "$backup_dir")"
    
    if [ $? -eq 0 ]; then
        print_success "Archive created: $archive_name"
        
        # Remove uncompressed backup directory
        rm -rf "$backup_dir"
        
        echo "$archive_name"
    else
        print_error "Archive creation failed"
        return 1
    fi
}

# Clean old backups (keep last 7 days)
cleanup_old_backups() {
    print_status "Cleaning up old backups..."
    
    find backups/ -name "*.tar.gz" -mtime +7 -delete 2>/dev/null || true
    
    print_success "Old backups cleaned up"
}

# Main backup function
main() {
    echo "💾 Creating Quiz Arena backup..."
    echo ""
    
    # Check if services are running
    if ! docker-compose ps | grep -q "Up"; then
        print_error "Services are not running. Please start them first."
        exit 1
    fi
    
    # Create backup
    backup_dir=$(setup_backup_dir)
    
    backup_database "$backup_dir"
    backup_logs "$backup_dir"
    backup_config "$backup_dir"
    
    archive=$(create_archive "$backup_dir")
    cleanup_old_backups
    
    print_success "🎉 Backup completed successfully!"
    echo "📁 Backup location: $archive"
    echo "📊 Backup size: $(du -h "$archive" | cut -f1)"
}

# Parse command line arguments
case "${1:-}" in
    ""|"create")
        main
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  create (default) - Create a new backup"
        echo "  help             - Show this help"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac