# Deployment Guide for VPS

This guide explains how to deploy ERPComm on a Linux VPS (Ubuntu) using Docker, Nginx, and Let's Encrypt.

## 📋 Prerequisites

- A Linux VPS (Ubuntu 22.04 recommended)
- Docker and Docker Compose installed
- A domain name pointing to your VPS IP address
- Supabase project credentials (URL, Anon Key, Service Role Key)
- At least 2GB RAM and 20GB disk space

## 🛠️ Step 1: Initial Setup

1. **Clone the repository** to your VPS:
   ```bash
   git clone <your-repo-url>
   cd ERPComm
   ```

2. **Configure Environment Variables**:
   Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your actual values:
   ```bash
   nano .env
   ```
   
   **Required variables:**
   ```env
   # Supabase Credentials
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Database Configuration
   # Option 1: Use local Docker PostgreSQL
   DATABASE_URL=postgresql://postgres:postgres@db:5432/enterprisechat
   
   # Option 2: Use Supabase hosted database
   # DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres
   
   # Redis (Handled by Docker Compose)
   REDIS_URL=redis://redis:6379
   
   # PostgreSQL (for local Docker DB)
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=enterprisechat
   ```

## 🔐 Step 2: SSL Certificate (Let's Encrypt)

1. **Install Certbot**:
   ```bash
   sudo apt update
   sudo apt install certbot
   ```

2. **Obtain SSL Certificate**:
   ```bash
   sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
   ```
   *Follow the instructions to verify domain ownership.*

3. **Link certificates** to the project directory:
   ```bash
   mkdir -p certbot/conf
   sudo ln -s /etc/letsencrypt/live/yourdomain.com certbot/conf/live/yourdomain.com
   ```

4. **Update `nginx.conf`**:
   Replace `yourdomain.com` with your actual domain name:
   ```bash
   sed -i 's/yourdomain.com/your-actual-domain.com/g' nginx.conf
   sed -i 's/server_name _;/server_name your-actual-domain.com;/g' nginx.conf
   ```

## 🚀 Step 3: Deploy with Docker Compose

### Production Deployment

1. **Build and start the containers**:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   ```

2. **Verify the deployment**:
   ```bash
   # Check all services are running and healthy
   docker-compose ps
   
   # Check logs
   docker-compose logs -f app
   ```

3. **Verify health checks**:
   ```bash
   # Check application health
   curl http://localhost:3000/api/health
   
   # Check through nginx
   curl http://localhost:80/health
   ```

### Development Deployment

For local development with hot reload:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## 🔄 Step 4: Database Migrations

If you are using the local Postgres database included in `docker-compose.yml`, the `schema.sql` will automatically run on the first start.

If you are using Supabase, ensure your schema is applied via the Supabase SQL Editor.

## 📊 Step 5: Monitoring and Logs

### View Logs

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

### Check Service Health

```bash
# Check container status
docker-compose ps

# Inspect specific service
docker inspect erpcomm-app

# Check resource usage
docker stats
```

### Health Check Endpoints

- **Application**: `http://localhost:3000/api/health`
- **Nginx**: `http://localhost:80/health`
- **Redis**: `docker-compose exec redis redis-cli ping`
- **PostgreSQL**: `docker-compose exec db pg_isready`

## 🔧 Step 6: Maintenance

### Backup Database

```bash
# Create backup
docker-compose exec db pg_dump -U postgres enterprisechat > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T db psql -U postgres enterprisechat < backup_20260128_123456.sql
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Remove old images
docker image prune -f
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart app
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

## 🛡️ Security Recommendations

### Firewall Configuration

```bash
# Allow necessary ports only
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### SSL Certificate Auto-Renewal

Set up automatic certificate renewal:
```bash
# Add to crontab
sudo crontab -e

# Add this line to renew certificates monthly
0 0 1 * * certbot renew --quiet && docker-compose restart nginx
```

### Security Best Practices

- **Change default passwords**: Update PostgreSQL and Redis passwords in `.env`
- **Regular updates**: Keep Docker images and system packages updated
- **Backups**: Schedule regular database backups
- **Monitoring**: Set up monitoring and alerting
- **Secrets**: Never commit `.env` file to version control
- **Access control**: Use SSH keys instead of passwords
- **Network isolation**: Services communicate only through Docker network

## 📈 Scaling Considerations

### Horizontal Scaling

To scale the application service:
```bash
docker-compose up -d --scale app=3
```

### Resource Limits

Resource limits are configured in `docker-compose.prod.yml`:
- **App**: 2 CPU cores, 2GB RAM
- **Database**: 2 CPU cores, 2GB RAM
- **Redis**: 1 CPU core, 1GB RAM
- **Nginx**: 1 CPU core, 512MB RAM

Adjust these based on your VPS capacity.

## ❓ Troubleshooting

### Container Failed to Start

```bash
# Check logs for errors
docker-compose logs <service-name>

# Check container status
docker-compose ps

# Restart service
docker-compose restart <service-name>
```

### Nginx Errors

```bash
# Verify nginx configuration
docker-compose exec nginx nginx -t

# Check SSL certificate paths
ls -la certbot/conf/live/yourdomain.com/

# Ensure certificates are readable
sudo chmod -R 755 certbot/conf
```

### Database Connection Issues

```bash
# Verify DATABASE_URL is correct
docker-compose exec app env | grep DATABASE_URL

# Test database connection
docker-compose exec db psql -U postgres -d enterprisechat -c "SELECT 1;"

# Check database logs
docker-compose logs db
```

### Application Not Responding

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Check if app is listening
docker-compose exec app netstat -tulpn | grep 3000

# Restart app
docker-compose restart app
```

### Redis Connection Issues

```bash
# Test Redis connection
docker-compose exec redis redis-cli ping

# Check Redis logs
docker-compose logs redis
```

### Out of Memory

```bash
# Check resource usage
docker stats

# Increase resource limits in docker-compose.prod.yml
# Or upgrade your VPS plan
```

### Port Already in Use

```bash
# Find process using port
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3000

# Stop conflicting service
sudo systemctl stop apache2  # Example
```

## 🔍 Useful Commands

```bash
# Enter container shell
docker-compose exec app sh
docker-compose exec db sh

# View environment variables
docker-compose exec app env

# Check disk usage
docker system df

# Clean up unused resources
docker system prune -a

# Export logs to file
docker-compose logs > logs_$(date +%Y%m%d).txt
```

## 📞 Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Review health checks: `docker-compose ps`
- Consult documentation: README.md
- Check GitHub issues

## 📝 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)

