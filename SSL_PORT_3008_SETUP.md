# Quick SSL Setup for Port 3008

Since you're accessing the app directly on **port 3008**, here's the simplest SSL setup:

## Current Access
- `http://72.61.243.152:3008` (no SSL)

## Goal
- `https://orutest.site:3008` (with SSL)

---

## Why Port 3008 Needs Special Configuration

Your app runs directly on port 3008 without Nginx in front. To add SSL, we have **two approaches**:

### Approach A: Add Nginx Proxy on Port 3008 (Recommended)
This adds SSL without changing your port.

### Approach B: Use Main Reverse Proxy on 80/443
This gives you `https://orutest.site` (no port needed).

---

## Approach A: SSL on Port 3008 (Quick)

Update your docker-compose to add Nginx on port 3008:

### Step 1: Update Docker Compose

```yaml
services:
  app:
    # ... existing config ...
    ports:
      - "3000:3000"  # Remove 3008:3000, only internal now
    
  nginx:
    image: nginx:stable-alpine
    container_name: erpcomm-nginx
    restart: unless-stopped
    ports:
      - "3008:443"   # SSL on your familiar port 3008
      - "3007:80"    # HTTP redirect on 3007
    volumes:
      - ./nginx-ssl.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - app
    networks:
      - erpcomm-network
```

### Step 2: Create nginx-ssl.conf

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app_server {
        server app:3000;  # Internal container port
    }

    # HTTP redirect (port 3007)
    server {
        listen 80;
        return 301 https://$host:3008$request_uri;
    }

    # HTTPS (port 3008)
    server {
        listen 443 ssl http2;
        server_name orutest.site www.orutest.site;

        ssl_certificate /etc/letsencrypt/live/orutest.site/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/orutest.site/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        client_max_body_size 50M;

        location / {
            proxy_pass http://app_server;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_cache_bypass $http_upgrade;
        }

        location /socket.io/ {
            proxy_pass http://app_server;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_read_timeout 3600s;
        }
    }
}
```

### Step 3: Generate SSL Certificate

```bash
# SSH into VPS
ssh root@72.61.243.152

# Stop any service using port 80
docker-compose -f /path/to/ERPComm/docker-compose.yml down

# Generate certificate
certbot certonly --standalone \
  -d orutest.site \
  -d www.orutest.site \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# Start services
docker-compose -f /path/to/ERPComm/docker-compose.yml up -d
```

### Step 4: Test

```bash
# Should redirect to HTTPS
curl -I http://orutest.site:3007

# Should work with SSL
curl -I https://orutest.site:3008
```

**Access your app:** `https://orutest.site:3008` ✅

---

## Approach B: Main Proxy (Clean URLs) ⭐ BETTER

Get `https://orutest.site` without any port!

### Architecture
```
Port 443 (Main Nginx) → Port 3008 (ERPComm Nginx) → Port 3000 (App)
```

### Step 1: Check Port Availability

```bash
ssh root@72.61.243.152

# Check if ports 80/443 are free
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

If **nothing is using them**, continue:

### Step 2: Create Main Nginx Proxy

```bash
# Create directory
mkdir -p /opt/nginx-main

# Create config
cat > /opt/nginx-main/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    # HTTP → HTTPS redirect
    server {
        listen 80;
        server_name orutest.site www.orutest.site;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS → ERPComm on port 3008
    server {
        listen 443 ssl http2;
        server_name orutest.site www.orutest.site;

        ssl_certificate /etc/letsencrypt/live/orutest.site/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/orutest.site/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        location / {
            # Forward to ERPComm on port 3008 (no SSL internally)
            proxy_pass http://172.17.0.1:3008;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_cache_bypass $http_upgrade;
        }

        location /socket.io/ {
            proxy_pass http://172.17.0.1:3008;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_read_timeout 3600s;
        }
    }
}
EOF

# Create docker-compose
cat > /opt/nginx-main/docker-compose.yml << 'EOF'
version: '3.8'
services:
  nginx-main:
    image: nginx:stable-alpine
    container_name: nginx-main-proxy
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro
EOF
```

### Step 3: Generate Certificate & Start

```bash
# Generate SSL
certbot certonly --standalone \
  -d orutest.site \
  -d www.orutest.site \
  --email your-email@example.com \
  --agree-tos

# Start main proxy
cd /opt/nginx-main
docker-compose up -d

# Check logs
docker-compose logs -f
```

**Access your app:** `https://orutest.site` ✅ (no port!)

---

## Comparison

| Feature | Approach A | Approach B |
|---------|-----------|-----------|
| Access URL | `https://orutest.site:3008` | `https://orutest.site` |
| Changes to ERPComm | Moderate | Minimal |
| Professional | ✅ | ✅✅ |
| Port 80/443 needed | No | Yes |
| Scalability | Medium | High |

---

## Recommendation

- **Use Approach B** if ports 80/443 are free → Clean URLs
- **Use Approach A** if ports 80/443 are occupied → Keep port 3008

Both approaches give you SSL encryption! The difference is just the URL.

---

## Testing

```bash
# Test SSL
openssl s_client -connect orutest.site:3008 -servername orutest.site
# OR (for Approach B)
openssl s_client -connect orutest.site:443 -servername orutest.site

# Test in browser
# Approach A: https://orutest.site:3008
# Approach B: https://orutest.site
```

Both should show the green padlock 🔒
