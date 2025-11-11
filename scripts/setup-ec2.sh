#!/bin/bash

set -e

echo "🔧 Setting up EC2 instance for deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Update system packages
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo yum update -y

# Install Docker
echo -e "${YELLOW}🐳 Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker installed successfully${NC}"
else
    echo -e "${GREEN}✅ Docker is already installed${NC}"
fi

# Install Docker Compose
echo -e "${YELLOW}🐳 Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed successfully${NC}"
else
    echo -e "${GREEN}✅ Docker Compose is already installed${NC}"
fi

# Verify installations
echo -e "\n${YELLOW}🔍 Verifying installations...${NC}"
docker --version
docker-compose --version

# Create deployment directory
echo -e "${YELLOW}📁 Creating deployment directory...${NC}"
mkdir -p ~/med-booking/nginx
mkdir -p ~/med-booking/database
mkdir -p ~/med-booking/scripts

# Create .env file template
echo -e "${YELLOW}📝 Creating .env file template...${NC}"
cat > ~/med-booking/.env << 'EOF'
# GitHub Container Registry
GITHUB_REPOSITORY=your-github-username/med-booking
GITHUB_TOKEN=your-github-token

# Backend Environment Variables
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
JWT_EXPIRES_IN=7d

# Frontend Environment Variables
REACT_APP_API_URL=http://your-ec2-public-ip/api
FRONTEND_URL=http://your-ec2-public-ip

# Note: SQLite database is stored in ~/med-booking/database/production.db
EOF

echo -e "${GREEN}✅ EC2 setup completed!${NC}"
echo -e "\n${YELLOW}⚠️  IMPORTANT: Please edit ~/med-booking/.env with your actual values${NC}"
echo -e "${YELLOW}⚠️  After editing .env, run: source ~/med-booking/.env${NC}"
echo -e "${YELLOW}⚠️  You may need to log out and log back in for Docker group changes to take effect${NC}"

