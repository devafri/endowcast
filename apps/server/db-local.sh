#!/bin/bash

# Local Development Database Management Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

case "$1" in
  start)
    echo "🐘 Starting local PostgreSQL database..."
    docker-compose up -d
    echo "⏳ Waiting for database to be ready..."
    sleep 3
    echo "✅ Database is running on localhost:5432"
    echo "   Database: endowcast_dev"
    echo "   User: postgres"
    echo "   Password: postgres_dev_password"
    ;;
    
  stop)
    echo "🛑 Stopping local PostgreSQL database..."
    docker-compose down
    echo "✅ Database stopped"
    ;;
    
  restart)
    echo "🔄 Restarting local PostgreSQL database..."
    docker-compose restart
    echo "✅ Database restarted"
    ;;
    
  logs)
    echo "📋 Database logs:"
    docker-compose logs -f postgres
    ;;
    
  reset)
    echo "⚠️  This will delete ALL data in your local database!"
    read -p "Are you sure? (yes/no): " -r
    if [[ $REPLY == "yes" ]]; then
      echo "🗑️  Removing database and volumes..."
      docker-compose down -v
      echo "🐘 Starting fresh database..."
      docker-compose up -d
      sleep 3
      echo "📦 Running Prisma migrations..."
      npm run migrate
      echo "✅ Database reset complete"
    else
      echo "❌ Reset cancelled"
    fi
    ;;
    
  migrate)
    echo "📦 Running Prisma migrations..."
    npm run migrate
    echo "✅ Migrations complete"
    ;;
    
  seed)
    echo "🌱 Seeding database..."
    npm run seed
    echo "✅ Seeding complete"
    ;;
    
  studio)
    echo "🎨 Opening Prisma Studio..."
    npm run studio
    ;;
    
  psql)
    echo "💻 Connecting to database with psql..."
    docker exec -it endowcast-dev-db psql -U postgres -d endowcast_dev
    ;;
    
  status)
    echo "📊 Database status:"
    docker-compose ps
    ;;
    
  *)
    echo "🗄️  Local Database Management"
    echo ""
    echo "Usage: ./db-local.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start    - Start the local PostgreSQL database"
    echo "  stop     - Stop the local PostgreSQL database"
    echo "  restart  - Restart the local PostgreSQL database"
    echo "  logs     - View database logs"
    echo "  reset    - Delete all data and reset database"
    echo "  migrate  - Run Prisma migrations"
    echo "  seed     - Seed the database with sample data"
    echo "  studio   - Open Prisma Studio"
    echo "  psql     - Connect to database with psql client"
    echo "  status   - Show database status"
    echo ""
    echo "Examples:"
    echo "  ./db-local.sh start"
    echo "  ./db-local.sh migrate"
    echo "  ./db-local.sh studio"
    ;;
esac
