#!/bin/bash

set -e

echo "💾 Backing up SQLite database..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="med_booking_db_${TIMESTAMP}.sqlite"
CONTAINER_NAME="med-booking-backend"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo -e "${YELLOW}📦 Creating backup: $BACKUP_FILE${NC}"

# Check if database file exists
if ! docker exec $CONTAINER_NAME test -f /app/data/production.db; then
    echo -e "${RED}❌ Database file not found!${NC}"
    exit 1
fi

# Copy SQLite database from container to host
docker cp $CONTAINER_NAME:/app/data/production.db $BACKUP_DIR/$BACKUP_FILE

echo -e "${GREEN}✅ Backup created successfully: $BACKUP_DIR/$BACKUP_FILE${NC}"

# Keep only last 7 backups
echo -e "${YELLOW}🧹 Cleaning up old backups (keeping last 7)...${NC}"
ls -t $BACKUP_DIR/med_booking_db_*.sqlite 2>/dev/null | tail -n +8 | xargs -r rm

# Display backup size
BACKUP_SIZE=$(du -h $BACKUP_DIR/$BACKUP_FILE | cut -f1)
echo -e "${GREEN}📊 Backup size: $BACKUP_SIZE${NC}"

echo -e "${GREEN}✅ Backup completed!${NC}"

