#!/bin/bash

echo "🗑️  Resetting Quiz Arena Database..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_NAME=${DB_NAME:-quiz_arena}

echo "📋 Database: $DB_NAME"

# Drop existing database (ignore errors if it doesn't exist)
echo "🔥 Dropping existing database..."
dropdb $DB_NAME 2>/dev/null || echo "   (Database didn't exist, that's OK)"

# Create new database
echo "🆕 Creating new database..."
createdb $DB_NAME

if [ $? -ne 0 ]; then
    echo "❌ Failed to create database. Make sure PostgreSQL is running."
    exit 1
fi

# Load schema
echo "📊 Loading schema..."
psql -d $DB_NAME -f src/database/schema.sql

if [ $? -ne 0 ]; then
    echo "❌ Failed to load schema."
    exit 1
fi

# Load indexes
echo "⚡ Adding performance indexes..."
psql -d $DB_NAME -f src/database/add-indexes.sql

# Check if sample data files exist and load them
if [ -f "src/database/sample-questions.sql" ]; then
    echo "📝 Loading sample questions..."
    psql -d $DB_NAME -f src/database/sample-questions.sql
fi

if [ -f "src/database/sample-answers.sql" ]; then
    echo "📝 Loading sample answers..."
    psql -d $DB_NAME -f src/database/sample-answers.sql
fi

echo ""
echo "✅ Database reset complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Start the backend: bun run dev"
echo "   2. Go to http://localhost:5173/setup"
echo "   3. Create your first admin user"
echo ""
echo "📊 Database info:"
psql -d $DB_NAME -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public';"