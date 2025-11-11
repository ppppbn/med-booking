#!/bin/bash

set -e

echo "🧪 Testing Docker setup locally..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${YELLOW}🔨 Building Docker images...${NC}"

# Build backend image
echo -e "${YELLOW}🔨 Building backend image...${NC}"
docker build -t med-booking-backend:test ./backend

# Build frontend image (with local API URL)
echo -e "${YELLOW}🔨 Building frontend image...${NC}"
docker build --build-arg REACT_APP_API_URL=http://localhost:8080/api -t med-booking-frontend:test ./frontend

echo -e "${GREEN}✅ Images built successfully!${NC}"

echo -e "\n${YELLOW}🚀 Starting services with docker-compose...${NC}"
docker-compose up -d

echo -e "\n${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 45

echo -e "\n${YELLOW}🌱 Seeding database with test data...${NC}"
docker cp backend/prisma/seed.ts med-booking-backend:/app/prisma/seed.ts > /dev/null 2>&1
docker exec med-booking-backend npx tsx prisma/seed.ts > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database seeded (11 users, 8 doctors, 8 departments, 4 appointments)${NC}"
else
    echo -e "${RED}⚠️  Seeding failed, but continuing...${NC}"
fi

echo -e "\n${YELLOW}🔍 Checking service health...${NC}"

# Check database (SQLite file)
echo -n "Database: "
if docker exec med-booking-backend test -f /app/data/production.db; then
    echo -e "${GREEN}✅ SQLite file exists${NC}"
else
    echo -e "${RED}❌ SQLite file not found${NC}"
fi

# Check backend
echo -n "Backend API: "
if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${RED}❌ Not healthy${NC}"
fi

# Check CORS
echo -n "CORS Configuration: "
if curl -s -H "Origin: http://localhost:3000" -X OPTIONS http://localhost:8080/api/auth/login 2>&1 | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✅ Configured${NC}"
else
    echo -e "${RED}❌ Not configured${NC}"
fi

# Check frontend
echo -n "Frontend: "
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${RED}❌ Not healthy${NC}"
fi

# Check nginx
echo -n "Nginx: "
if curl -f http://localhost > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${RED}❌ Not healthy${NC}"
fi

echo -e "\n${YELLOW}📊 Running containers:${NC}"
docker-compose ps

echo -e "\n${YELLOW}📝 Recent logs:${NC}"
echo -e "${YELLOW}Backend logs:${NC}"
docker-compose logs --tail=10 backend

echo -e "\n${YELLOW}Frontend logs:${NC}"
docker-compose logs --tail=10 frontend

echo -e "\n${GREEN}✅ Testing completed!${NC}"
echo -e "\n${YELLOW}Access the application:${NC}"
echo -e "  - Frontend (via nginx): ${GREEN}http://localhost${NC}"
echo -e "  - Frontend (direct): ${GREEN}http://localhost:3000${NC}"
echo -e "  - Backend API: ${GREEN}http://localhost:8080/api${NC}"
echo -e "  - Backend Health: ${GREEN}http://localhost:8080/api/health${NC}"
echo -e "\n${YELLOW}To stop services: ${GREEN}docker-compose down${NC}"
echo -e "${YELLOW}To view logs: ${GREEN}docker-compose logs -f [service_name]${NC}"

