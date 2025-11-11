# Quick Start Guide - Medical Booking System

Get the Medical Booking System running locally in under 5 minutes!

## Prerequisites

- Docker Desktop installed and running
- Git

## Quick Start Steps

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/med-booking.git
cd med-booking
```

### 2. Run the Test Script

```bash
chmod +x scripts/test-local.sh
./scripts/test-local.sh
```

That's it! The script will:
- Build Docker images for backend and frontend
- Start all services (database, backend, frontend, nginx)
- Run health checks
- Display access URLs

### 3. Access the Application

Once the script completes successfully:

- **Frontend (via Nginx)**: http://localhost
- **Frontend (direct)**: http://localhost:3000
- **Backend API**: http://localhost:8080/api
- **Backend Health Check**: http://localhost:8080/api/health

### 4. Stop Services

```bash
docker-compose down
```

To also remove all data:
```bash
docker-compose down -v
```

## Manual Setup (Alternative)

If you prefer to run commands manually:

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Wait for services to initialize
sleep 60

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Default Test Credentials

⚠️ **IMPORTANT**: You need to seed the database before you can login!

### Seed Database (First Time Setup)

⚠️ **Required before you can login!**

Run this command after starting services:

```bash
# Option 1: Use the seed script (Easiest)
./scripts/seed-database.sh

# Option 2: Manual seeding
docker cp backend/prisma/seed.ts med-booking-backend:/app/prisma/seed.ts
docker exec med-booking-backend npx tsx prisma/seed.ts
```

This creates:
- **11 users** (2 patients, 8 doctors, 1 admin)
- **8 departments** (Internal Medicine, Orthopedics, Pediatrics, Cardiology, Obstetrics, Dermatology, Ophthalmology, ENT)
- **8 doctors** with different specializations
- **4 sample appointments**

### Test Accounts

After seeding:

**Patient Account**
- Email: `patient1@example.com`
- Password: `password123`

**Doctor Account**
- Email: `doctor1@hospital.vn`
- Password: `password123`

**Admin Account**
- Email: `admin@hospital.vn`
- Password: `password123`

See [TEST_CREDENTIALS.md](./TEST_CREDENTIALS.md) for more details.

## Common Commands

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose down

# Remove all data and start fresh
docker-compose down -v
docker-compose up -d
```

## Troubleshooting

### CORS Errors (Login/API Requests Failing)

If you see CORS errors in the browser console:

```bash
# Rebuild backend with latest CORS fix
docker-compose build backend
docker-compose up -d

# Wait for services to be healthy
sleep 45
docker-compose ps
```

The CORS configuration now allows multiple origins (localhost, localhost:3000, etc.). See [CORS_FIX.md](./CORS_FIX.md) for details.

### Services Won't Start

```bash
# Check if ports are already in use
lsof -i :80
lsof -i :3000
lsof -i :8080
lsof -i :1433

# Clean up Docker
docker-compose down -v
docker system prune -a
docker-compose up -d
```

### Database Connection Issues

```bash
# Check database logs
docker logs med-booking-database

# Restart database
docker-compose restart database
```

### Backend Not Working

```bash
# Check backend logs
docker logs med-booking-backend

# Rebuild backend
docker-compose build backend
docker-compose up -d
```

## Next Steps

- Read the full [Deployment Guide](./DEPLOYMENT.md) for production deployment
- Check out the [README](./README.md) for project overview
- Explore the API documentation

## Need Help?

- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting
- Review container logs: `docker-compose logs`
- Check container status: `docker-compose ps`

---

**Note for Mac Users (Apple Silicon)**: 
The local setup uses Azure SQL Edge which is compatible with ARM64 architecture. For production deployment on x86_64 EC2 instances, the system will use the full SQL Server 2022 image.

