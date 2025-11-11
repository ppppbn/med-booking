# Database Seeding Guide

## Overview

The database needs to be populated with initial test data before you can use the application. The seed process creates users, doctors, departments, and sample appointments.

## What Gets Created

### Users (11 total)
- **2 Patients**
  - Nguyễn Văn An (`patient1@example.com`)
  - Trần Thị Bình (`patient2@example.com`)

- **8 Doctors**
  - PGS.TS. Lê Văn Cường - Nội khoa (Internal Medicine)
  - ThS. Phạm Thị Dung - Phẫu thuật chỉnh hình (Orthopedics)
  - TS. Nguyễn Thị Lan - Nhi khoa (Pediatrics)
  - PGS. Trần Văn Minh - Tim mạch (Cardiology)
  - ThS. Hoàng Thị Mai - Sản phụ khoa (Obstetrics)
  - TS. Võ Văn Tùng - Da liễu (Dermatology)
  - PGS.TS. Đặng Thị Linh - Mắt (Ophthalmology)
  - ThS. Lê Minh Tuấn - Tai mũi họng (ENT)

- **1 Admin**
  - Admin System (`admin@hospital.vn`)

### Departments (8 total)
1. Nội khoa (Internal Medicine)
2. Phẫu thuật chỉnh hình (Orthopedics)
3. Nhi khoa (Pediatrics)
4. Tim mạch (Cardiology)
5. Sản phụ khoa (Obstetrics)
6. Da liễu (Dermatology)
7. Mắt (Ophthalmology)
8. Tai mũi họng (ENT)

### Sample Appointments (4 total)
- Various appointments between patients and doctors
- Different dates and times
- Sample symptoms and notes

## How to Seed

### Local Development

#### Method 1: Use the Seed Script (Easiest)

```bash
# Make sure services are running
docker-compose up -d

# Run the seed script
./scripts/seed-database.sh
```

The script will:
1. Check if the backend container is running
2. Copy the seed.ts file to the container
3. Run the seed process
4. Display statistics and test credentials

#### Method 2: Quick Test Script

The test-local.sh script automatically seeds the database:

```bash
./scripts/test-local.sh
```

#### Method 3: Manual Seeding

```bash
# Copy seed file
docker cp backend/prisma/seed.ts med-booking-backend:/app/prisma/seed.ts

# Run seed
docker exec med-booking-backend npx tsx prisma/seed.ts
```

### EC2 Production Deployment

After deploying to EC2:

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Navigate to deployment directory
cd ~/med-booking

# Copy seed file from local (or git pull)
# Option 1: SCP from local
# From local: scp -i your-key.pem backend/prisma/seed.ts ec2-user@your-ec2-ip:~/med-booking/backend/prisma/

# Option 2: Git pull (if committed)
git pull origin main

# Run seed script
./scripts/seed-database.sh

# Or manual:
docker cp backend/prisma/seed.ts med-booking-backend:/app/prisma/seed.ts
docker exec med-booking-backend npx tsx prisma/seed.ts
```

## Verification

After seeding, verify the data:

```bash
# Check user count
docker exec med-booking-backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count().then(count => {
  console.log('Total users:', count);
  prisma.\$disconnect();
});
"

# View detailed statistics
./scripts/seed-database.sh
```

Expected output:
```
Total Users: 11
Total Doctors: 8
Total Departments: 8
Total Appointments: 4

Users by Role:
  ADMIN: 1
  DOCTOR: 8
  PATIENT: 2
```

## Test Credentials

All users have the same password: `password123`

### Patient Accounts
```
Email: patient1@example.com
Password: password123
Name: Nguyễn Văn An

Email: patient2@example.com
Password: password123
Name: Trần Thị Bình
```

### Doctor Accounts
```
Email: doctor1@hospital.vn (Nội khoa)
Email: doctor2@hospital.vn (Phẫu thuật chỉnh hình)
Email: doctor3@hospital.vn (Nhi khoa)
Email: doctor4@hospital.vn (Tim mạch)
Email: doctor5@hospital.vn (Sản phụ khoa)
Email: doctor6@hospital.vn (Da liễu)
Email: doctor7@hospital.vn (Mắt)
Email: doctor8@hospital.vn (Tai mũi họng)
Password: password123 (for all)
```

### Admin Account
```
Email: admin@hospital.vn
Password: password123
Name: Admin System
```

## Re-seeding

If you need to re-seed the database:

### Option 1: Clear and Re-seed

```bash
# Stop services
docker-compose down -v

# Start services (this creates fresh database)
docker-compose up -d

# Wait for services
sleep 45

# Seed
./scripts/seed-database.sh
```

### Option 2: Update Existing Data

The seed script uses `upsert`, so running it again will:
- Skip existing records (based on email/id)
- Update any changed fields
- Add any new records

```bash
./scripts/seed-database.sh
```

## Troubleshooting

### Issue: "Backend container is not running"

**Solution**: Start the services first
```bash
docker-compose up -d
sleep 45
./scripts/seed-database.sh
```

### Issue: "Cannot find module tsx"

**Solution**: The script uses npx which auto-installs tsx. If it fails:
```bash
docker exec med-booking-backend npm install -g tsx
docker exec med-booking-backend npx tsx prisma/seed.ts
```

### Issue: "Module not found: ../src/constants/roles"

**Solution**: The seed.ts file has been fixed to inline constants. Make sure you have the latest version:
```bash
git pull origin main
docker cp backend/prisma/seed.ts med-booking-backend:/app/prisma/seed.ts
```

### Issue: Seed runs but no data appears

**Solution**: Check database connection
```bash
# Check backend logs
docker logs med-booking-backend

# Test database connection
docker exec med-booking-backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => console.log('✅ Connected'))
  .catch(e => console.error('❌ Failed:', e.message));
"
```

## Customizing Seed Data

To add your own test data, edit `backend/prisma/seed.ts`:

```typescript
// Add more patients
const patient3 = await prisma.user.upsert({
  where: { email: 'patient3@example.com' },
  update: {},
  create: {
    email: 'patient3@example.com',
    password: hashedPassword,
    fullName: 'Your Name',
    phone: '0123456789',
    role: USER_ROLES.PATIENT,
  },
});

// Add more doctors, departments, etc.
```

Then run the seed script again.

## Important Notes

### Security
- **Development only**: These credentials are for testing
- **Change in production**: Never use `password123` in production
- **Use strong passwords**: Min 12 chars, mixed case, numbers, symbols

### Data Persistence
- **With volumes**: Data persists between restarts
- **Without volumes** (`docker-compose down -v`): Data is deleted
- **Backup**: Use `./scripts/backup-database.sh` before major changes

### Performance
- **First run**: Takes 5-10 seconds
- **Subsequent runs**: Faster due to upsert (skips existing records)
- **Large datasets**: May take longer with many records

## See Also

- [TEST_CREDENTIALS.md](./TEST_CREDENTIALS.md) - Complete credential reference
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide

