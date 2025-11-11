# Medical Booking System - Deployment Guide

This guide provides step-by-step instructions for deploying the Medical Booking System to AWS EC2 using Docker and GitHub Actions.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Local Testing](#local-testing)
4. [EC2 Setup](#ec2-setup)
5. [GitHub Setup](#github-setup)
6. [Deployment](#deployment)
7. [Post-Deployment](#post-deployment)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

---

## Overview

### Architecture

```
┌─────────────────┐
│   GitHub        │
│   Actions       │
└────────┬────────┘
         │ Deploy
         ▼
┌─────────────────────────────────┐
│      EC2 Instance               │
│                                 │
│  ┌────────┐  ┌────────────┐   │
│  │ Nginx  │─▶│  Frontend  │   │
│  │ Proxy  │  │  (React)   │   │
│  └───┬────┘  └────────────┘   │
│      │                          │
│      │       ┌────────────┐    │
│      └──────▶│  Backend   │    │
│              │ (Node.js)  │    │
│              └─────┬──────┘    │
│                    │            │
│              ┌─────▼──────┐    │
│              │   SQLite   │    │
│              └────────────┘    │
└─────────────────────────────────┘
```

### Components

- **Frontend**: React application served by Nginx
- **Backend**: Node.js/Express API with Prisma ORM
- **Database**: SQLite (embedded, no separate database server needed)
- **Reverse Proxy**: Nginx for routing and load balancing
- **CI/CD**: GitHub Actions for automated deployment

---

## Prerequisites

### Local Development

- Docker Desktop installed and running
- Docker Compose v2.0 or higher
- Git
- Node.js 18+ (for local development without Docker)
- A GitHub account

### AWS Resources

- AWS Account with EC2 access
- EC2 instance (recommended: **t3.small** or larger with SQLite)
  - OS: Amazon Linux 2023 or Ubuntu 22.04+
  - Storage: 20-30GB EBS volume
  - Security Group with ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- Elastic IP (optional but recommended)

**Note**: With SQLite, you can use a smaller instance (t3.small with 2GB RAM) compared to SQL Server which requires t3.medium (4GB RAM) minimum.

---

## Local Testing

Before deploying to production, test the entire stack locally:

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/med-booking.git
cd med-booking
```

### Step 2: Build and Run Locally

#### Option A: Using the Test Script (Recommended)

```bash
chmod +x scripts/test-local.sh
./scripts/test-local.sh
```

#### Option B: Manual Setup

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Wait for services to initialize (about 60 seconds)
sleep 60

# Check service status
docker-compose ps
```

### Step 3: Verify Local Deployment

1. **Backend API**: http://localhost:8080/api/health
   ```bash
   curl http://localhost:8080/api/health
   # Expected: {"status":"OK","message":"Medical Booking API is running"}
   ```

2. **Frontend**: http://localhost:3000
   - Should show the Medical Booking System login page

3. **Nginx Proxy**: http://localhost
   - Should route to frontend and backend correctly

### Step 4: Stop Services

```bash
docker-compose down
# Or to also remove volumes:
docker-compose down -v
```

---

## EC2 Setup

### Step 1: Launch EC2 Instance

1. **Log in to AWS Console** → EC2 Dashboard
2. **Launch Instance**:
   - **Name**: `med-booking-prod`
   - **AMI**: Amazon Linux 2023 or Ubuntu 22.04 LTS
   - **Instance Type**: `t3.small` (2 vCPU, 2GB RAM) - **Recommended with SQLite**
     - Alternative: `t3.medium` (2 vCPU, 4GB RAM) for more headroom
   - **Key Pair**: Create or select an existing key pair
   - **Network Settings**:
     - Enable public IP
     - Security Group rules:
       - SSH (22) - Your IP
       - HTTP (80) - 0.0.0.0/0
       - HTTPS (443) - 0.0.0.0/0
   - **Storage**: 30GB gp3
3. **Launch Instance**

### Step 2: Connect to EC2 Instance

```bash
# Set proper permissions for your key file
chmod 400 your-key.pem

# Connect via SSH
ssh -i your-key.pem ec2-user@your-ec2-public-ip
# For Ubuntu: ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### Step 3: Install Required Software

#### For Amazon Linux 2023:

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER

# Install Git
sudo yum install -y git

# Log out and log back in for group changes to take effect
exit
```

#### For Ubuntu:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER

# Install Git
sudo apt install -y git

# Log out and log back in for group changes to take effect
exit
```

#### Or Use the Setup Script:

```bash
# Copy the setup script to EC2
scp -i your-key.pem scripts/setup-ec2.sh ec2-user@your-ec2-public-ip:~/

# Run the setup script
ssh -i your-key.pem ec2-user@your-ec2-public-ip
chmod +x setup-ec2.sh
./setup-ec2.sh

# Log out and log back in
exit
```

### Step 4: Verify Installation

```bash
# Reconnect after logging out
ssh -i your-key.pem ec2-user@your-ec2-public-ip

# Verify Docker
docker --version
# Expected: Docker version 24.x.x or higher

# Verify Docker Compose
docker-compose --version
# Expected: Docker Compose version 2.x.x or higher

# Test Docker without sudo
docker ps
# Should work without permission errors
```

### Step 5: Create Deployment Directory

```bash
# Create directory structure
mkdir -p ~/med-booking/{nginx,database,scripts}
cd ~/med-booking
```

### Step 6: Configure Environment Variables

Create a `.env` file with production credentials:

```bash
cat > ~/med-booking/.env << 'EOF'
# GitHub Container Registry
GITHUB_REPOSITORY=your-github-username/med-booking

# Backend Environment Variables
DATABASE_URL=file:/app/data/production.db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-to-something-very-secure
JWT_EXPIRES_IN=7d

# Frontend Environment Variables
REACT_APP_API_URL=http://your-ec2-public-ip/api
EOF
```

**Important**: Update the following values:
- `GITHUB_REPOSITORY`: Your GitHub repository (format: username/repository-name)
- `JWT_SECRET`: Generate a secure random string
- `REACT_APP_API_URL`: Use your EC2 instance's public IP or domain name

**Note**: With SQLite, the database is stored in `~/med-booking/database/production.db` and persists across container restarts.

```bash
# Load environment variables
source ~/med-booking/.env
```

---

## GitHub Setup

### Step 1: Enable GitHub Container Registry

1. Go to your GitHub repository
2. Click **Settings** → **Packages**
3. Enable **Container registry**

### Step 2: Configure Repository Secrets

Add the following secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add each of the following:

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `EC2_HOST` | EC2 instance public IP or domain | `34.123.456.789` |
| `EC2_USERNAME` | SSH username | `ec2-user` or `ubuntu` |
| `EC2_SSH_KEY` | Private SSH key content | Contents of your `.pem` file |
| `DATABASE_URL` | Database connection string | `file:/app/data/production.db` |
| `JWT_SECRET` | JWT secret key | `your-super-secret-jwt-key` |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `REACT_APP_API_URL` | Frontend API URL | `http://your-ec2-ip/api` |

**To add SSH key secret:**

```bash
# On your local machine
cat your-key.pem
# Copy the entire content including BEGIN and END lines
```

### Step 3: Verify GitHub Actions Workflow

The workflow file is located at `.github/workflows/deploy.yml`. It will:

1. **Build**: Create Docker images for frontend and backend
2. **Push**: Upload images to GitHub Container Registry
3. **Deploy**: SSH into EC2 and deploy the new images
4. **Verify**: Run health checks on all services

---

## Deployment

### Manual Deployment (First Time)

For the first deployment, it's recommended to deploy manually:

#### Step 1: Copy Files to EC2

```bash
# On your local machine
scp -i your-key.pem docker-compose.prod.yml ec2-user@your-ec2-public-ip:~/med-booking/
scp -i your-key.pem nginx/nginx.conf ec2-user@your-ec2-public-ip:~/med-booking/nginx/
scp -i your-key.pem scripts/deploy.sh ec2-user@your-ec2-public-ip:~/med-booking/scripts/
```

#### Step 2: Build and Push Images

```bash
# On your local machine
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Build images
docker build -t ghcr.io/your-username/med-booking-backend:latest ./backend
docker build --build-arg REACT_APP_API_URL=http://your-ec2-ip/api -t ghcr.io/your-username/med-booking-frontend:latest ./frontend

# Push images
docker push ghcr.io/your-username/med-booking-backend:latest
docker push ghcr.io/your-username/med-booking-frontend:latest
```

#### Step 3: Deploy on EC2

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-ec2-public-ip

# Navigate to deployment directory
cd ~/med-booking

# Load environment variables
source .env

# Export GitHub credentials
export GITHUB_TOKEN=your_github_personal_access_token
export GITHUB_ACTOR=your_github_username

# Make deploy script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

### Automated Deployment (GitHub Actions)

Once the manual deployment is successful, GitHub Actions will handle future deployments automatically.

#### Trigger Deployment

Push to the `main` branch:

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

Or trigger manually:

1. Go to **Actions** tab in your GitHub repository
2. Select **Build and Deploy to EC2** workflow
3. Click **Run workflow** → **Run workflow**

#### Monitor Deployment

1. Go to **Actions** tab in your GitHub repository
2. Click on the latest workflow run
3. Monitor each step:
   - ✅ Build Docker Images
   - ✅ Deploy to EC2
   - ✅ Verify deployment

---

## Post-Deployment

### Step 1: Verify Deployment

```bash
# On EC2 instance
cd ~/med-booking

# Check running containers
docker-compose -f docker-compose.prod.yml ps

# Should show all 4 services running:
# - med-booking-database
# - med-booking-backend
# - med-booking-frontend
# - med-booking-nginx
```

### Step 2: Test Services

```bash
# Test backend API
curl http://localhost:8080/api/health

# Test frontend
curl http://localhost/

# Test from external network
curl http://your-ec2-public-ip/api/health
```

### Step 3: Check Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs

# View specific service logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs database

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 4: Seed Database (Required for First-Time Setup)

⚠️ **IMPORTANT**: The database needs to be seeded with initial data before you can login.

```bash
# Option 1: Use the seed script (Recommended)
cd ~/med-booking
./scripts/seed-database.sh

# Option 2: Manual seeding
docker cp backend/prisma/seed.ts med-booking-backend:/app/prisma/seed.ts
docker exec med-booking-backend npx tsx prisma/seed.ts
```

This will create:
- **11 Users** (2 patients, 8 doctors, 1 admin)
- **8 Doctors** with different specializations
- **8 Departments** (Internal Medicine, Orthopedics, Pediatrics, etc.)
- **4 Sample Appointments**

Test credentials after seeding:
- Patient: `patient1@example.com` / `password123`
- Doctor: `doctor1@hospital.vn` / `password123`
- Admin: `admin@hospital.vn` / `password123`

**SQLite Database Location**: The database file is stored at `~/med-booking/database/production.db` on the EC2 instance.

### Step 5: Setup SSL/HTTPS (Recommended)

#### Using Let's Encrypt with Certbot

```bash
# Install Certbot
sudo yum install -y certbot  # Amazon Linux
# or
sudo apt install -y certbot  # Ubuntu

# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Certificates will be in: /etc/letsencrypt/live/your-domain.com/

# Update nginx configuration to use SSL
# (See SSL section in Troubleshooting)

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Symptoms**: Backend fails to start with database connection errors

**Solutions**:
```bash
# Check if SQLite database file exists
docker exec med-booking-backend test -f /app/data/production.db && echo "Database exists" || echo "Database missing"

# Check file permissions
docker exec med-booking-backend ls -la /app/data/

# Recreate database
docker exec med-booking-backend npx prisma db push --accept-data-loss

# Check backend logs
docker logs med-booking-backend

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

#### 2. Backend API Not Responding

**Symptoms**: Backend returns 502 or doesn't respond

**Solutions**:
```bash
# Check backend logs
docker logs med-booking-backend

# Check if backend is running
docker ps | grep backend

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend

# Check health endpoint directly
docker exec med-booking-backend curl http://localhost:8080/api/health
```

#### 3. Frontend Not Loading

**Symptoms**: Blank page or 404 errors

**Solutions**:
```bash
# Check frontend logs
docker logs med-booking-frontend

# Verify build files exist
docker exec med-booking-frontend ls -la /usr/share/nginx/html

# Check nginx configuration
docker exec med-booking-frontend cat /etc/nginx/conf.d/default.conf

# Restart frontend
docker-compose -f docker-compose.prod.yml restart frontend
```

#### 4. Port Already in Use

**Symptoms**: Error: `bind: address already in use`

**Solutions**:
```bash
# Find process using the port
sudo lsof -i :80
sudo lsof -i :8080

# Stop the process
sudo kill -9 <PID>

# Or use different ports in docker-compose
```

#### 5. Out of Disk Space

**Symptoms**: `no space left on device`

**Solutions**:
```bash
# Check disk usage
df -h

# Clean up Docker resources
docker system prune -a --volumes

# Remove old images
docker images
docker rmi <image-id>

# Remove old containers
docker ps -a
docker rm <container-id>
```

### Logs and Debugging

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs

# View logs for specific service
docker-compose -f docker-compose.prod.yml logs backend

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f

# View last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100

# Export logs to file
docker-compose -f docker-compose.prod.yml logs > deployment-logs.txt
```

### Health Checks

```bash
# Check container health status
docker ps --format "table {{.Names}}\t{{.Status}}"

# Run health check manually
curl http://localhost:8080/api/health
curl http://localhost/health
```

---

## Maintenance

### Regular Updates

#### Update Application Code

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

#### Update Docker Images

```bash
# Pull latest images from GitHub Container Registry
docker-compose -f docker-compose.prod.yml pull

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

### Database Backups

#### Create Backup

```bash
# Run backup script
cd ~/med-booking
./scripts/backup-database.sh

# Backups are stored in: ~/med-booking/backups/
# SQLite backups are just copies of the database file
```

#### Restore Backup

```bash
# Run restore script with backup file
./scripts/restore-database.sh ./backups/med_booking_db_20231111_120000.sqlite
```

#### Manual Backup (Alternative)

```bash
# Simple file copy backup
docker cp med-booking-backend:/app/data/production.db ./backup-$(date +%Y%m%d).sqlite

# Restore manually
docker cp ./backup-20231111.sqlite med-booking-backend:/app/data/production.db
docker-compose restart backend
```

#### Schedule Automatic Backups

```bash
# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * cd ~/med-booking && ./scripts/backup-database.sh >> ~/med-booking/backup.log 2>&1
```

### Monitoring

#### Check Resource Usage

```bash
# Overall system resources
docker stats

# Disk usage
df -h

# Docker disk usage
docker system df

# Container resource usage
docker stats med-booking-backend med-booking-frontend med-booking-database
```

#### View Application Metrics

```bash
# Backend health
curl http://localhost:8080/api/health

# Check uptime
docker inspect med-booking-backend | grep StartedAt
```

### Security Updates

```bash
# Update EC2 system packages
sudo yum update -y  # Amazon Linux
# or
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Rotate secrets periodically
# 1. Update .env file with new secrets
# 2. Update GitHub repository secrets
# 3. Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Scaling

#### Vertical Scaling (Increase EC2 Resources)

1. Stop services: `docker-compose -f docker-compose.prod.yml down`
2. Stop EC2 instance in AWS Console
3. Change instance type (e.g., t3.small → t3.medium)
4. Start EC2 instance
5. Restart services: `docker-compose -f docker-compose.prod.yml up -d`

**SQLite Performance Tips**:
- Enable WAL mode for better concurrency (already configured)
- Increase cache size for better read performance
- Regular VACUUM to optimize database file

#### Horizontal Scaling (Multiple Instances)

⚠️ **SQLite Limitation**: SQLite doesn't support multiple servers writing to the same database file.

For high availability with multiple instances, consider:
- **Migrate to PostgreSQL or MySQL** for multi-server support
- Application Load Balancer (ALB) with read replicas
- Amazon RDS for managed database
- Use Litestream for SQLite replication (single writer, multiple readers)

---

## Additional Resources

### Scripts

- `scripts/test-local.sh`: Test Docker setup locally
- `scripts/setup-ec2.sh`: Automated EC2 setup script
- `scripts/deploy.sh`: Deployment script
- `scripts/backup-database.sh`: Database backup script
- `scripts/restore-database.sh`: Database restore script

### Configuration Files

- `docker-compose.yml`: Local development configuration
- `docker-compose.prod.yml`: Production configuration
- `.github/workflows/deploy.yml`: CI/CD pipeline
- `nginx/nginx.conf`: Nginx reverse proxy configuration

### Useful Commands

```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker-compose.prod.yml down

# Restart services
docker-compose -f docker-compose.prod.yml restart

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Access container shell
docker exec -it med-booking-backend sh

# Clean up
docker-compose -f docker-compose.prod.yml down -v
docker system prune -a --volumes
```

---

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review Docker and service logs
- Check GitHub Issues
- Contact the development team

---

## License

[Your License Here]

