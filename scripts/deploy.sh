#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Logging into GitHub Container Registry...${NC}"
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin

echo -e "${YELLOW}🔄 Pulling latest images...${NC}"
docker-compose -f docker-compose.prod.yml pull

echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down

echo -e "${YELLOW}🧹 Cleaning up old images...${NC}"
docker image prune -f

echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 30

# Check if all containers are running
if [ "$(docker-compose -f docker-compose.prod.yml ps -q | wc -l)" -eq "$(docker-compose -f docker-compose.prod.yml ps | grep -c 'Up')" ]; then
    echo -e "${GREEN}✅ All services are running!${NC}"
else
    echo -e "${RED}❌ Some services failed to start!${NC}"
    docker-compose -f docker-compose.prod.yml ps
    exit 1
fi

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

# Show running containers
echo -e "\n${YELLOW}📊 Running containers:${NC}"
docker-compose -f docker-compose.prod.yml ps

# Show logs
echo -e "\n${YELLOW}📝 Recent logs:${NC}"
docker-compose -f docker-compose.prod.yml logs --tail=20

