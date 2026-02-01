# Docker Setup for ERPComm

This document provides a quick reference for Docker-related operations.

## 📁 Docker Files Overview

- **`docker-compose.yml`**: Base configuration for all environments
- **`docker-compose.dev.yml`**: Development-specific overrides (hot reload, exposed ports)
- **`docker-compose.prod.yml`**: Production-specific overrides (resource limits, optimizations)
- **`Dockerfile`**: Multi-stage build for the Next.js application
- **`nginx.conf`**: Nginx reverse proxy configuration
- **`.env.example`**: Environment variables template

## 🚀 Quick Start

### Development

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env

# Start development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or in detached mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Production

```bash
# Copy environment template
cp .env.example .env

# Edit .env with production values
nano .env

# Build and start production environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# View logs
docker-compose logs -f
```

## 🏗️ Architecture

```
┌─────────────────┐
│     Nginx       │  Port 80/443 (SSL)
│  Reverse Proxy  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Next.js App   │  Port 3000
│   (ERPComm)     │
└────┬────────┬───┘
     │        │
     ▼        ▼
┌─────────┐ ┌──────────┐
│PostgreSQL│ │  Redis   │
│   DB     │ │  Cache   │
└─────────┘ └──────────┘
```

## 🔧 Services

### App (Next.js)
- **Image**: Built from Dockerfile
- **Port**: 3000
- **Health Check**: `/api/health`
- **Resources**: 2 CPU, 2GB RAM (production)

### Database (PostgreSQL)
- **Image**: postgres:15-alpine
- **Port**: 5432 (exposed in dev only)
- **Volume**: `postgres_data`
- **Health Check**: `pg_isready`

### Redis (Cache)
- **Image**: redis:7-alpine
- **Port**: 6379 (exposed in dev only)
- **Volume**: `redis_data`
- **Health Check**: `redis-cli ping`

### Nginx (Reverse Proxy)
- **Image**: nginx:stable-alpine
- **Ports**: 80, 443
- **SSL**: Let's Encrypt certificates
- **Health Check**: `/health`

## 📊 Health Checks

All services have health checks configured:

```bash
# Check all services status
docker-compose ps

# Application health
curl http://localhost:3000/api/health

# Nginx health
curl http://localhost:80/health

# Redis health
docker-compose exec redis redis-cli ping

# PostgreSQL health
docker-compose exec db pg_isready
```

## 🔍 Common Commands

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db
docker-compose logs -f redis
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100 app
```

### Managing Services

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Restart specific service
docker-compose restart app

# Rebuild and restart
docker-compose up -d --build
```

### Accessing Containers

```bash
# Execute shell in container
docker-compose exec app sh
docker-compose exec db sh

# Run one-off command
docker-compose exec app npm run build
docker-compose exec db psql -U postgres
```

### Database Operations

```bash
# Backup database
docker-compose exec db pg_dump -U postgres enterprisechat > backup.sql

# Restore database
docker-compose exec -T db psql -U postgres enterprisechat < backup.sql

# Access PostgreSQL CLI
docker-compose exec db psql -U postgres -d enterprisechat
```

### Cleanup

```bash
# Remove stopped containers
docker-compose down

# Remove containers and volumes (⚠️ deletes data)
docker-compose down -v

# Remove unused images
docker image prune -f

# Remove all unused resources
docker system prune -a
```

## 🔐 Environment Variables

Required environment variables (see `.env.example`):

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbG...` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db:5432/dbname` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `POSTGRES_USER` | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `postgres` |
| `POSTGRES_DB` | PostgreSQL database name | `enterprisechat` |

## 📈 Resource Limits

### Production (docker-compose.prod.yml)

| Service | CPU Limit | Memory Limit | CPU Reserved | Memory Reserved |
|---------|-----------|--------------|--------------|-----------------|
| App | 2 cores | 2GB | 1 core | 1GB |
| Database | 2 cores | 2GB | 0.5 cores | 512MB |
| Redis | 1 core | 1GB | 0.25 cores | 256MB |
| Nginx | 1 core | 512MB | 0.25 cores | 128MB |

### Development (docker-compose.dev.yml)

More relaxed limits for development:
- App: 4 cores, 4GB RAM

## 🐛 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs <service-name>

# Check container status
docker-compose ps

# Inspect container
docker inspect <container-name>
```

### Port conflicts

```bash
# Find process using port
sudo lsof -i :3000
sudo lsof -i :5432

# Change port in docker-compose.yml or stop conflicting service
```

### Database connection issues

```bash
# Verify DATABASE_URL
docker-compose exec app env | grep DATABASE_URL

# Test database connection
docker-compose exec db psql -U postgres -d enterprisechat -c "SELECT 1;"
```

### Out of memory

```bash
# Check resource usage
docker stats

# Adjust limits in docker-compose.prod.yml
# Or upgrade your system resources
```

## 🔄 Updates and Maintenance

### Update application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Clean up old images
docker image prune -f
```

### Update Docker images

```bash
# Pull latest base images
docker-compose pull

# Rebuild with new base images
docker-compose up -d --build
```

## 📚 Additional Resources

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Comprehensive deployment guide
- [README.md](./README.md) - Project overview
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
