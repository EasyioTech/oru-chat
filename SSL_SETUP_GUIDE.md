# SSL/HTTPS Setup Guide for ERPComm

This guide walks you through setting up SSL/HTTPS for your application using Let's Encrypt (free SSL certificates) with Nginx.

## Prerequisites

- A domain name pointing to your VPS IP address
- Docker and Docker Compose installed
- Ports 80 and 443 open on your VPS firewall

## Option 1: Manual Certbot Setup (Recommended)

### Step 1: Install Certbot on VPS

```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### Step 2: Stop Docker Containers

```bash
cd /path/to/ERPComm
docker-compose down
```

### Step 3: Obtain SSL Certificate

Replace `your-domain.com` with your actual domain:

```bash
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

Follow the prompts:
- Enter your email address
- Agree to Terms of Service
- Choose whether to share email (optional)

Certificates will be saved to:
- Certificate: `/etc/letsencrypt/live/your-domain.com/fullchain.pem`
- Private Key: `/etc/letsencrypt/live/your-domain.com/privkey.pem`

### Step 4: Update Nginx Configuration

Create/update `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name your-domain.com www.your-domain.com;

        # SSL Certificates
        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

        # SSL Configuration (Strong Security)
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Proxy to Next.js app
        location / {
            proxy_pass http://app:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Socket.IO WebSocket Support
        location /socket.io/ {
            proxy_pass http://app:3000/socket.io/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API Rate Limiting
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://app:3000/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Stricter login rate limiting
        location /api/auth/login {
            limit_req zone=login_limit burst=3 nodelay;
            proxy_pass http://app:3000/api/auth/login;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Step 5: Update docker-compose.yml

```yaml
services:
  app:
    # ... existing config ...

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro
    depends_on:
      - app
    restart: unless-stopped

  # ... other services ...
```

### Step 6: Start Services

```bash
docker-compose up -d
```

### Step 7: Set Up Auto-Renewal

Certbot certificates expire every 90 days. Set up auto-renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e
```

Add this line to run renewal check twice daily:

```cron
0 0,12 * * * certbot renew --quiet --post-hook "docker-compose -f /path/to/ERPComm/docker-compose.yml restart nginx"
```

---

## Option 2: Certbot in Docker (Alternative)

If you prefer everything in Docker:

### Update docker-compose.yml

```yaml
services:
  app:
    # ... existing config ...

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - app
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

### Initial Certificate Generation

```bash
# Create directories
mkdir -p certbot/conf certbot/www

# Get certificate
docker-compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com -d www.your-domain.com

# Restart nginx
docker-compose restart nginx
```

---

## Option 3: Cloudflare SSL (Easiest)

If your domain uses Cloudflare:

1. **Enable SSL in Cloudflare Dashboard**:
   - Go to SSL/TLS section
   - Set encryption mode to "Full" or "Full (strict)"

2. **Update nginx.conf** (simpler version):
   ```nginx
   http {
       server {
           listen 80;
           server_name your-domain.com;
           
           location / {
               proxy_pass http://app:3000;
               proxy_set_header Host $host;
               proxy_set_header X-Real-IP $remote_addr;
               proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
               proxy_set_header X-Forwarded-Proto https;
           }
       }
   }
   ```

3. Cloudflare handles SSL termination automatically!

---

## Testing SSL Setup

After setup, test your SSL:

1. **Visit your site**: `https://your-domain.com`
2. **Check SSL certificate**: Look for padlock icon in browser
3. **SSL Labs Test**: https://www.ssllabs.com/ssltest/
4. **Check HTTP→HTTPS redirect**: Visit `http://your-domain.com`

---

## Troubleshooting

### Port 80/443 Already in Use
```bash
# Check what's using the ports
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting services
sudo systemctl stop apache2  # or nginx
```

### Certificate Not Found
```bash
# Check certificate location
sudo ls -la /etc/letsencrypt/live/

# Verify permissions
sudo chmod -R 755 /etc/letsencrypt/live/
sudo chmod -R 755 /etc/letsencrypt/archive/
```

### Nginx Won't Start
```bash
# Check nginx config syntax
docker-compose exec nginx nginx -t

# View nginx logs
docker-compose logs nginx
```

---

## Security Best Practices

1. ✅ **Always redirect HTTP to HTTPS**
2. ✅ **Use HSTS header** (included in config above)
3. ✅ **Keep certificates renewed** (auto-renewal cron)
4. ✅ **Use strong SSL protocols** (TLS 1.2+)
5. ✅ **Enable HTTP/2** for better performance
6. ⚠️ **Change default database passwords**
7. ⚠️ **Secure Redis** if exposed externally

---

## Summary

**Recommended approach:**
- **Local development**: Use `http://localhost:3000` (no SSL needed)
- **Production with domain**: Option 1 (Certbot on VPS)
- **Using Cloudflare**: Option 3 (easiest, free)

After SSL is set up, the Web Crypto API will work and encryption features will be enabled!
