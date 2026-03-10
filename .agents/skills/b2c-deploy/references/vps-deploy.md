# VPS Deployment (Ubuntu)

## Overview

Full control deployment on a VPS server with PM2 and Nginx.

## Requirements

- Ubuntu 22.04+ VPS
- 1GB+ RAM
- Node.js 18+
- PostgreSQL 14+
- Nginx
- Domain name with DNS configured

## Step 1: Server Setup

### Connect to Server

```bash
ssh root@your-server-ip
```

### Update System

```bash
apt update && apt upgrade -y
```

### Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### Install PM2

```bash
npm install -g pm2
```

### Install PostgreSQL

```bash
apt install -y postgresql postgresql-contrib

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

```sql
CREATE USER b2cshop WITH PASSWORD 'your-secure-password';
CREATE DATABASE b2c_shop OWNER b2cshop;
GRANT ALL PRIVILEGES ON DATABASE b2c_shop TO b2cshop;
\q
```

### Install Nginx

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

## Step 2: Create Deploy User

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

## Step 3: Clone and Build Project

```bash
# Clone project
cd /home/deploy
git clone https://github.com/your-repo/b2c-shop.git
cd b2c-shop

# Install dependencies
npm install

# Create .env
nano .env
```

### .env Configuration

```env
DATABASE_URL="postgresql://b2cshop:your-secure-password@localhost:5432/b2c_shop"
AUTH_SECRET="your-super-secret-key-generate-with-openssl"
AUTH_URL="https://yourdomain.com"
NODE_ENV="production"
```

### Build

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed

# Build Next.js
npm run build
```

## Step 4: PM2 Configuration

### ecosystem.config.js

```javascript
module.exports = {
  apps: [
    {
      name: 'b2c-shop',
      script: 'npm',
      args: 'start',
      cwd: '/home/deploy/b2c-shop',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
```

### Start Application

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Step 5: Nginx Configuration

### Create Nginx Config

```bash
sudo nano /etc/nginx/sites-available/b2c-shop
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Uploads
    location /uploads {
        alias /home/deploy/b2c-shop/public/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 10M;
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/b2c-shop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 6: SSL with Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Step 7: Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Deployment Script

### deploy.sh

```bash
#!/bin/bash
set -e

echo "Pulling latest changes..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Running migrations..."
npx prisma migrate deploy

echo "Building..."
npm run build

echo "Restarting PM2..."
pm2 restart b2c-shop

echo "Deployment complete!"
```

```bash
chmod +x deploy.sh
./deploy.sh
```

## Monitoring

### PM2 Commands

```bash
pm2 status          # Check status
pm2 logs b2c-shop   # View logs
pm2 monit           # Monitor dashboard
```

### System Monitoring

```bash
htop                # System resources
df -h               # Disk usage
free -m             # Memory usage
```

## Backup Script

### backup.sh

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/deploy/backups"

mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U b2cshop b2c_shop > $BACKUP_DIR/db_$DATE.sql

# Uploads backup
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /home/deploy/b2c-shop/public/uploads

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

Add to crontab:
```bash
crontab -e
# Add: 0 2 * * * /home/deploy/backup.sh
```
