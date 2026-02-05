# Multi-Project VPS Setup Guide

Your VPS hosts multiple Docker projects on different ports. This guide provides **two options** for SSL and domain setup.

---

## Current Setup (from your VPS)

**ERPComm Project:**
- **erpcomm-app**: Port **3008** → Container 3000 (direct app access)
- **erpcomm-db**: Port 5435 → Container 5432
- **erpcomm-nginx**: Port 8080 → Container 80, Port 8443 → Container 443
- **erpcomm-redis**: Port 6380 → Container 6379

**Current Access:**
- Direct app: `http://72.61.243.152:3008` ✅ (what you're using now)
- Via Nginx: `http://72.61.243.152:8080` or `https://72.61.243.152:8443` (if configured)

---

## Goal: Access via Domain

You want to access your app using `https://orutest.site` instead of `http://72.61.243.152:3008`

---

## Option 1: Domain with Port (Simplest - 5 minutes)

Access via `https://orutest.site:3008` 

### Pros
- ✅ No changes to your current port setup
- ✅ Works with your existing direct app access
- ✅ Simple SSL setup

### Cons
- ❌ Users must type port in URL

### Setup Steps

```bash
# 1. Set DNS A record
# orutest.site → 72.61.243.152

# 2. SSH into VPS
ssh root@72.61.243.152
cd /path/to/ERPComm

# Stop nginx temporarily
docker-compose stop nginx

# Generate certificate (uses port 80 temporarily)
certbot certonly --standalone \
  -d orutest.site \
  --email your-email@example.com \
  --agree-tos

# Start nginx on 8080/8443
docker-compose up -d nginx
```

**Access your app:**
- `https://orutest.site:8443` ✅
- `http://orutest.site:8080` (redirects to HTTPS)

---

## Option 2: Main Reverse Proxy (Professional Setup) ⭐ RECOMMENDED

Use a **single main Nginx** on ports 80/443 that routes different domains to different projects.

### Architecture

```
Port 80/443 (Main Nginx) 
    ├─ orutest.site      → erpcomm-nginx:8080
    ├─ project2.com      → project2:3001
    └─ project3.com      → project3:3002
```

### Pros
- ✅ Clean URLs: `https://orutest.site` (no port)
- ✅ Single SSL certificate management
- ✅ Professional setup
- ✅ Easy to add more domains

### Setup (15 minutes)

#### Step 1: Create Main Nginx Container

```bash
# SSH into VPS
ssh root@72.61.243.152

# Create directory for main proxy
mkdir -p /etc/nginx-main/conf.d
mkdir -p /etc/nginx-main/ssl

# Create main nginx config
nano /etc/nginx-main/nginx.conf
```

**Main nginx.conf:**
```nginx
events {
    worker_connections 1024;
}

http {
    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name orutest.site www.orutest.site;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # HTTPS for orutest.site
    server {
        listen 443 ssl http2;
        server_name orutest.site www.orutest.site;

        ssl_certificate /etc/letsencrypt/live/orutest.site/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/orutest.site/privkey.pem;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Proxy to ERPComm on port 8080
        location / {
            proxy_pass http://172.17.0.1:8080;  # Docker host IP
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
        
        # WebSocket support
        location /socket.io/ {
            proxy_pass http://172.17.0.1:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 3600s;
        }
    }
    
    # Add more server blocks for other projects here
    # server {
    #     listen 443 ssl http2;
    #     server_name project2.com;
    #     ssl_certificate /etc/letsencrypt/live/project2.com/fullchain.pem;
    #     ssl_certificate_key /etc/letsencrypt/live/project2.com/privkey.pem;
    #     location / {
    #         proxy_pass http://172.17.0.1:3001;
    #         ...
    #     }
    # }
}
```

#### Step 2: Create Docker Compose for Main Proxy

```bash
nano /etc/nginx-main/docker-compose.yml
```

```yaml
version: '3.8'

services:
  nginx-main:
    image: nginx:stable-alpine
    container_name: nginx-main-proxy
    restart: unless-stopped
    network_mode: host  # Access other containers via host IP
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro
    ports:
      - "80:80"
      - "443:443"
```

#### Step 3: Generate SSL and Start

```bash
# Generate SSL certificate
certbot certonly --standalone \
  -d orutest.site \
  -d www.orutest.site \
  --email your-email@example.com \
  --agree-tos

# Start main proxy
cd /etc/nginx-main
docker-compose up -d

# Check logs
docker-compose logs -f
```

#### Step 4: Update ERPComm Nginx Config

Your ERPComm nginx now only handles internal routing (no SSL needed):

```nginx
# /path/to/ERPComm/nginx.conf
events {
    worker_connections 1024;
}

http {
    gzip on;
    
    upstream app_server {
        server app:3000;
    }

    server {
        listen 80;
        
        client_max_body_size 50M;

        location / {
            proxy_pass http://app_server;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Cookie handling
            proxy_set_header Cookie $http_cookie;
            proxy_pass_header Set-Cookie;
        }
        
        location /socket.io/ {
            proxy_pass http://app_server;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 3600s;
        }
    }
}
```

**Restart ERPComm:**
```bash
cd /path/to/ERPComm
docker-compose restart nginx
```

---

## Comparison

| Feature | Option 1 (Port-based) | Option 2 (Main Proxy) |
|---------|----------------------|----------------------|
| URL | `https://orutest.site:8443` | `https://orutest.site` |
| Professional | ❌ | ✅ |
| Setup Time | 5 min | 15 min |
| SSL Management | Per-project | Centralized |
| Add More Domains | Complex | Easy |
| Port Conflicts | None | Requires 80/443 free |

---

## Recommendation

**Use Option 2** if:
- ✅ You plan to host more domains
- ✅ You want professional URLs without ports
- ✅ Ports 80/443 are available on your VPS

**Use Option 1** if:
- ✅ Ports 80/443 are already in use
- ✅ You need a quick setup
- ✅ You only have this one project

---

## Testing

### Option 1
```bash
curl -I https://orutest.site:8443
# Should return 200 OK
```

### Option 2  
```bash
curl -I https://orutest.site
# Should return 200 OK (no port needed)
```

---

## Troubleshooting

### Check if ports 80/443 are in use:
```bash
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

### If ports are in use:
- Use Option 1 (port-based)
- OR stop the service using those ports
- OR use different ports for the main proxy

### WebSocket connection issues:
Make sure the main proxy forwards WebSocket headers:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

---

## Next Steps

1. **Choose your option** (1 or 2)
2. **Set DNS A record**: `orutest.site` → `72.61.243.152`
3. **Follow the setup steps** for your chosen option
4. **Test the deployment**
5. **Add more domains** (if using Option 2)

Need help deciding? Option 2 is recommended for a professional setup!
