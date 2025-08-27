#!/bin/bash

# AI-Powered Resume Builder - Development Setup Script
# This script sets up the development environment with all required services

set -e

echo "🚀 Setting up AI-Powered Resume Builder development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start the infrastructure services
echo "📦 Starting Docker services (PostgreSQL, Redis, NATS, MinIO)..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Generate TLS certificates for Redis and NATS
echo "🔐 Generating TLS certificates..."
if ! ./scripts/generate-certs.sh; then
    echo "⚠️  Certificate generation failed, but continuing..."
fi

# Check if PostgreSQL is ready
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "⏳ Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env 2>/dev/null || echo "⚠️  No .env.example found. Please create .env manually."
fi

# Run database migrations (if using a migration tool)
# echo "🗄️  Running database migrations..."
# pnpm run migrate

# Initialize S3 buckets
echo "📦 Initializing S3 buckets..."
pnpm run init:s3

# Seed the database with initial data (optional)
# echo "🌱 Seeding database..."
# pnpm run seed

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "Services running:"
echo "  • PostgreSQL: localhost:5432"
echo "  • Redis: localhost:6379"
echo "  • NATS: localhost:4222"
echo "  • MinIO: localhost:9000 (admin:minioadmin)"
echo ""
echo "Next steps:"
echo "  1. Update .env file with your API keys"
echo "  2. Run 'pnpm run dev' to start the development servers"
echo "  3. Visit http://localhost:3000 for the frontend"
echo "  4. API will be available at http://localhost:3001"
echo ""
echo "To stop services: docker-compose down"
