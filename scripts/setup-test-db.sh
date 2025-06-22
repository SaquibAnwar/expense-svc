#!/bin/bash

# Setup Test Database Script
echo "🔧 Setting up test database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop existing test database if running
echo "🛑 Stopping existing test database container..."
docker stop expense-test-db 2>/dev/null || true
docker rm expense-test-db 2>/dev/null || true

# Start test database
echo "🚀 Starting test PostgreSQL database..."
docker run --name expense-test-db \
  -e POSTGRES_USER=test_user \
  -e POSTGRES_PASSWORD=test_password \
  -e POSTGRES_DB=expense_test_db \
  -p 5433:5432 \
  -d postgres:13

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Set environment variable for local testing
export DATABASE_URL="postgresql://test_user:test_password@localhost:5433/expense_test_db"

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "✅ Test database setup complete!"
echo "📝 Database URL: postgresql://test_user:test_password@localhost:5433/expense_test_db"
echo "🧪 You can now run tests with: npm test"
echo "🛑 To stop the test database: docker stop expense-test-db" 