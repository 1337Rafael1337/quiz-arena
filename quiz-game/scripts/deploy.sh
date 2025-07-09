#!/bin/bash

# Quiz Arena Deployment Script
# This script handles database migrations and application deployment

set -e  # Exit on any error

echo "🚀 Starting Quiz Arena Deployment..."

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

# Check if we're in the right directory
if [ ! -f "quiz-game/backend/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Environment setup
ENVIRONMENT=${1:-development}
print_status "Deploying to environment: $ENVIRONMENT"

# Navigate to backend directory
cd quiz-game/backend

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Please create one based on .env.example"
    if [ -f ".env.example" ]; then
        print_status "Copying .env.example to .env"
        cp .env.example .env
        print_warning "Please edit .env file with your database credentials"
    fi
fi

# Install dependencies
print_status "Installing backend dependencies..."
bun install

# Check database connection
print_status "Checking database connection..."
if ! bun run migrate:status > /dev/null 2>&1; then
    print_error "Cannot connect to database. Please check your .env configuration"
    exit 1
fi

# Run database migrations
print_status "Running database migrations..."
bun run migrate

# Build the application
print_status "Building application..."
bun run build

# Navigate to frontend directory
cd ../frontend

# Install frontend dependencies
print_status "Installing frontend dependencies..."
bun install

# Build frontend
print_status "Building frontend..."
bun run build

# Return to project root
cd ../..

print_success "Deployment completed successfully!"

# Show next steps
echo ""
echo "🎯 Next Steps:"
echo "   1. Start the backend: cd quiz-game/backend && bun run start"
echo "   2. Serve the frontend: cd quiz-game/frontend && bun run preview"
echo "   3. Or use Docker: docker-compose up -d"
echo ""
echo "📊 Database Status:"
cd quiz-game/backend
bun run migrate:status