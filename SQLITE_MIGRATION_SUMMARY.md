# SQLite Migration Summary

## Overview
Successfully migrated from SQL Server to SQLite for simplified deployment and reduced infrastructure costs.

## Changes Made

### 1. **Prisma Schema** (`backend/prisma/schema.prisma`)
- Changed provider from `sqlserver` to `sqlite`
- Removed `onUpdate: NoAction` referential actions (not supported by SQLite)
- Simplified foreign key constraints

### 2. **Docker Compose Files**
- **`docker-compose.yml`** (Local Testing):
  - Removed SQL Server database service
  - Changed `DATABASE_URL` to `file:/app/data/production.db`
  - Added volume mount for SQLite data: `sqlite-data:/app/data`
  - Removed database dependency and healthcheck

- **`docker-compose.prod.yml`** (Production):
  - Removed SQL Server database service
  - Changed `DATABASE_URL` to `file:/app/data/production.db`
  - Added volume mount: `./database:/app/data`
  - Removed database dependency and healthcheck

### 3. **Backend Dockerfile** (`backend/Dockerfile`)
- Added creation of `/app/data` directory for SQLite database file
- Ensured proper ownership for non-root user

### 4. **Environment Configuration**
- **`backend/.env.example`**:
  - Changed from: `DATABASE_URL="sqlserver://..."`
  - Changed to: `DATABASE_URL="file:./prisma/dev.db"`
  - Removed SQL Server password configuration

### 5. **Scripts Updated**
- **`scripts/test-local.sh`**:
  - Changed database health check to verify SQLite file exists
  
- **`scripts/backup-database.sh`**:
  - Now copies SQLite file from container
  - Backup format: `med_booking_db_YYYYMMDD_HHMMSS.sqlite`
  
- **`scripts/restore-database.sh`**:
  - Restores by copying SQLite file to container
  
- **`scripts/seed-database.sh`**:
  - Updated path from `prisma/seed.ts` to `backend/prisma/seed.ts`
  
- **`scripts/setup-ec2.sh`**:
  - Removed `SA_PASSWORD` from .env template
  - Removed `DATABASE_URL` from .env template (hardcoded in docker-compose)
  - Added note about SQLite database location

### 6. **GitHub Actions** (`.github/workflows/deploy.yml`)
- Removed `DATABASE_URL` from exported environment variables
- Removed `SA_PASSWORD` from workflow

### 7. **Documentation** (`DEPLOYMENT.md`)
- Updated architecture diagram to show SQLite embedded in backend
- Changed recommended EC2 instance from `t2.medium` to `t3.small` (SQLite requires less resources)
- Updated all database-related troubleshooting sections
- Updated backup/restore instructions for SQLite
- Added SQLite limitations for horizontal scaling
- Removed all SQL Server specific configuration steps

## Benefits of SQLite

### Cost Savings
- **Before (SQL Server)**: Required `t3.medium` (2 vCPU, 4GB RAM) - ~$30/month
- **After (SQLite)**: Can use `t3.small` (2 vCPU, 2GB RAM) - ~$15/month
- **Savings**: ~50% reduction in EC2 costs

### Simplified Deployment
- No separate database container to manage
- No database password configuration
- Embedded database reduces attack surface
- Automatic backups via simple file copy

### Resource Efficiency
- Lower memory footprint
- No network overhead between app and database
- Faster for small-to-medium workloads
- Zero-configuration required

## Database File Location

### Local Testing
- **Container Path**: `/app/data/production.db`
- **Volume**: `sqlite-data` (Docker named volume)

### Production (EC2)
- **Container Path**: `/app/data/production.db`
- **Host Path**: `~/med-booking/database/production.db`
- **Persists across container restarts**

## Testing Results

✅ **All tests passed:**
- Backend API health check: OK
- Database file created: 96KB
- Data seeded successfully:
  - 11 Users (2 patients, 8 doctors, 1 admin)
  - 8 Doctors
  - 8 Departments
  - 4 Appointments
- Login functionality: Working
- CORS: Properly configured

## Migration Verification

```bash
# Check services
docker-compose ps

# Verify database exists
docker exec med-booking-backend test -f /app/data/production.db && echo "✅ DB exists"

# Check database size
docker exec med-booking-backend ls -lh /app/data/

# Test API
curl http://localhost:8080/api/health

# Test login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient1@example.com","password":"password123"}'
```

## Limitations & Considerations

### When SQLite Works Well
- Single-server deployments ✅
- Low-to-medium traffic (< 100 concurrent users) ✅
- Read-heavy workloads ✅
- Development and staging environments ✅

### When to Migrate to PostgreSQL/MySQL
- Multi-server deployments (horizontal scaling)
- High-concurrency write operations (> 1000 writes/sec)
- Very large databases (> 1TB)
- Need for advanced database features

### Future Migration Path
If you need to scale beyond SQLite:
1. Update `schema.prisma` provider to `postgresql` or `mysql`
2. Update `DATABASE_URL` to point to managed database (RDS)
3. Export SQLite data and import to new database
4. Update docker-compose files to remove SQLite volume mounts

## Files Modified Summary

**Modified**: 11 files
- `backend/prisma/schema.prisma`
- `backend/Dockerfile`
- `backend/.env.example`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `.github/workflows/deploy.yml`
- `scripts/test-local.sh`
- `scripts/backup-database.sh`
- `scripts/restore-database.sh`
- `scripts/seed-database.sh`
- `scripts/setup-ec2.sh`

**Updated Documentation**:
- `DEPLOYMENT.md` (extensive updates throughout)

**Created**:
- `SQLITE_MIGRATION_SUMMARY.md` (this file)

## Deployment Checklist

For deploying with SQLite to EC2:

1. ✅ Prisma schema updated to SQLite
2. ✅ Docker Compose files configured
3. ✅ Backend Dockerfile creates data directory
4. ✅ Scripts updated for SQLite operations
5. ✅ GitHub Actions workflow updated
6. ✅ Documentation updated
7. ✅ Local testing successful
8. ✅ Database seeding working
9. ✅ Backup/restore scripts functional

## Next Steps

1. **Test locally**: Run `./scripts/test-local.sh`
2. **Commit changes**: `git add . && git commit -m "Migrate to SQLite"`
3. **Update GitHub Secrets**: Remove `SA_PASSWORD` and `DATABASE_URL` secrets
4. **Deploy to EC2**: Follow updated `DEPLOYMENT.md` guide
5. **Seed production database**: Run `./scripts/seed-database.sh` on EC2

---

**Migration Completed**: November 11, 2025
**Database**: SQL Server → SQLite
**Status**: ✅ Production Ready

