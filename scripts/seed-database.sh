#!/bin/bash

set -e

echo "🌱 Seeding database with test data..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backend container is running
if ! docker ps | grep -q med-booking-backend; then
    echo -e "${RED}❌ Backend container is not running!${NC}"
    echo "Please start services first: docker-compose up -d"
    exit 1
fi

# Copy the seed file to the container (in case it was updated)
echo -e "${YELLOW}📄 Copying seed file to container...${NC}"
docker cp backend/prisma/seed.ts med-booking-backend:/app/prisma/seed.ts

# Run the seed script
echo -e "${YELLOW}🌱 Running seed script...${NC}"
docker exec med-booking-backend npx tsx prisma/seed.ts

echo -e "\n${GREEN}✅ Database seeded successfully!${NC}"

# Show statistics
echo -e "\n${YELLOW}📊 Database Statistics:${NC}"
docker exec med-booking-backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.count();
  const doctors = await prisma.doctor.count();
  const departments = await prisma.department.count();
  const appointments = await prisma.appointment.count();
  
  console.log('  Total Users:', users);
  console.log('  Total Doctors:', doctors);
  console.log('  Total Departments:', departments);
  console.log('  Total Appointments:', appointments);
  
  console.log('\n👥 Users by Role:');
  const roles = await prisma.user.groupBy({
    by: ['role'],
    _count: { role: true }
  });
  roles.forEach(r => console.log('  ' + r.role + ':', r._count.role));
  
  await prisma.\$disconnect();
}

check().catch(console.error);
"

echo -e "\n${GREEN}✅ Complete!${NC}"
echo -e "\n${YELLOW}📝 Test Credentials:${NC}"
echo "  Patient: patient1@example.com / password123"
echo "  Doctor: doctor1@hospital.vn / password123"
echo "  Admin: admin@hospital.vn / password123"

