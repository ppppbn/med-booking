# Test Credentials

## Default Test Accounts

After seeding the database, you can use these accounts to login:

### Patient Account
- **Email**: `patient1@example.com`
- **Password**: `password123`
- **Name**: Nguyễn Văn An
- **Role**: Patient
- **Features**: Book appointments, view medical records, manage profile

### Doctor Account
- **Email**: `doctor1@hospital.vn`
- **Password**: `password123`
- **Name**: Dr. Lê Văn Cường
- **Role**: Doctor
- **Specialization**: Nội khoa (Internal Medicine)
- **Features**: View appointments, manage schedule, access patient records

### Admin Account
- **Email**: `admin@hospital.vn`
- **Password**: `password123`
- **Name**: Admin System
- **Role**: Administrator
- **Features**: Manage doctors, manage patients, view statistics, system administration

## Database Content

After seeding, the database will contain:
- **11 Users** (2 patients, 8 doctors, 1 admin)
- **8 Departments** (Internal Medicine, Orthopedics, Pediatrics, Cardiology, Obstetrics, Dermatology, Ophthalmology, ENT)
- **8 Doctors** with different specializations and experience
- **4 Sample Appointments**

## How to Seed Database

The database needs to be seeded before you can login for the first time.

### Option 1: Use the Seed Script (Recommended)

```bash
# From the project root
./scripts/seed-database.sh
```

This script will:
1. Copy the seed.ts file to the container
2. Run the seed process
3. Display statistics about what was created

### Option 2: Manual Seeding

Run this command after starting the services:

```bash
docker exec med-booking-backend node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  // Create patient
  await prisma.user.upsert({
    where: { email: 'patient1@example.com' },
    update: {},
    create: {
      email: 'patient1@example.com',
      password: hashedPassword,
      fullName: 'Nguyễn Văn An',
      phone: '0123456789',
      address: 'Hà Nội, Việt Nam',
      role: 'PATIENT',
    },
  });
  
  // Create doctor user
  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor1@hospital.vn' },
    update: {},
    create: {
      email: 'doctor1@hospital.vn',
      password: hashedPassword,
      fullName: 'Dr. Lê Văn Cường',
      phone: '0111111111',
      role: 'DOCTOR',
    },
  });
  
  // Create doctor profile
  await prisma.doctor.upsert({
    where: { userId: doctorUser.id },
    update: {},
    create: {
      userId: doctorUser.id,
      specialization: 'Nội khoa',
      licenseNumber: 'VN2024001',
      experience: 15,
    },
  });
  
  // Create admin
  await prisma.user.upsert({
    where: { email: 'admin@hospital.vn' },
    update: {},
    create: {
      email: 'admin@hospital.vn',
      password: hashedPassword,
      fullName: 'Admin System',
      phone: '0333333333',
      role: 'ADMIN',
    },
  });
  
  console.log('✅ Database seeded!');
  await prisma.\$disconnect();
}

seed().catch(console.error);
"
```

### Or Use the Seed Script

```bash
# Copy the seed script
docker cp /path/to/seed-users.js med-booking-backend:/app/seed-users.js

# Run it
docker exec med-booking-backend node seed-users.js
```

## Verification

Check if users exist in database:

```bash
docker exec med-booking-backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count().then(count => {
  console.log('Total users:', count);
  prisma.\$disconnect();
});
"
```

## Common Issues

### Issue: 401 Unauthorized when logging in

**Cause**: Database is empty (no users)

**Solution**: Seed the database using the command above

### Issue: Invalid credentials

**Causes**:
1. Wrong email or password (check for typos)
2. Copy-pasted credentials with extra spaces
3. Database was reset/cleared

**Solution**: 
- Double-check credentials (copy from this file)
- Re-seed the database if needed

### Issue: Can't see login page

**Causes**:
1. Frontend not running
2. Wrong URL

**Solution**: 
- Check if services are running: `docker-compose ps`
- Try both URLs:
  - http://localhost:3000 (direct frontend)
  - http://localhost (via nginx)

## Testing Login

### Via Browser

1. Open http://localhost:3000 or http://localhost
2. Enter one of the test credentials above
3. Click "Login"
4. You should be redirected to the appropriate dashboard

### Via cURL

```bash
# Login as patient
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient1@example.com","password":"password123"}'

# Should return:
# {
#   "token": "eyJhbGc...",
#   "user": {
#     "id": "...",
#     "email": "patient1@example.com",
#     "fullName": "Nguyễn Văn An",
#     "role": "PATIENT"
#   }
# }
```

## Security Notes

### Development
- These credentials are for **development/testing only**
- Password: `password123` (simple for testing)
- Never use these in production!

### Production
Before deploying to production:

1. **Change all default passwords**
2. **Use strong passwords** (min 12 characters, mixed case, numbers, symbols)
3. **Enable password requirements** in the registration form
4. **Add rate limiting** to prevent brute force attacks
5. **Consider 2FA** for admin accounts
6. **Use environment variables** for admin credentials

## Quick Reference Card

```
┌─────────────────────────────────────────────┐
│        TEST CREDENTIALS                     │
├─────────────────────────────────────────────┤
│ 👤 Patient                                  │
│    patient1@example.com / password123       │
├─────────────────────────────────────────────┤
│ 👨‍⚕️ Doctor                                   │
│    doctor1@hospital.vn / password123        │
├─────────────────────────────────────────────┤
│ 🔧 Admin                                    │
│    admin@hospital.vn / password123          │
└─────────────────────────────────────────────┘
```

## Need Help?

- Check if backend is running: `docker logs med-booking-backend`
- Check if database is running: `docker ps | grep database`
- See all documentation: [QUICKSTART.md](./QUICKSTART.md)

