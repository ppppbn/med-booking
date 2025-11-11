#!/bin/bash

set -e

echo "🔄 Restoring SQLite database..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Please provide backup file path${NC}"
    echo "Usage: $0 <backup_file_path>"
    echo "Example: $0 ./backups/med_booking_db_20250111_120000.sqlite"
    exit 1
fi

BACKUP_FILE=$1
CONTAINER_NAME="med-booking-backend"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Restoring from: $BACKUP_FILE${NC}"
echo -e "${YELLOW}⚠️  This will replace the current database!${NC}"

# Stop backend temporarily
echo -e "${YELLOW}🛑 Stopping backend...${NC}"
docker-compose stop backend

# Copy backup file to container
docker cp $BACKUP_FILE $CONTAINER_NAME:/app/data/production.db

# Start backend
echo -e "${YELLOW}🚀 Starting backend...${NC}"
docker-compose start backend

# Wait for backend to be healthy
echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
sleep 10

echo -e "${GREEN}✅ Database restored successfully!${NC}"

