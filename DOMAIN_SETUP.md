# Domain Setup Guide for orutest.site

## DNS Configuration

### Step 1: Configure DNS Records

Log into your domain registrar's DNS management panel and add these records:

#### A Records (Point to your VPS IP)
```
Type: A
Name: @
Value: 72.61.243.152
TTL: 3600 (or Auto)

Type: A
Name: www
Value: 72.61.243.152
TTL: 3600 (or Auto)
```

**Result:** Both `orutest.site` and `www.orutest.site` will point to your VPS.

#### Wait for DNS Propagation
DNS changes can take 5 minutes to 48 hours. Check with:
```bash
# Check if DNS is propagated
nslookup orutest.site
dig orutest.site

# Should return 72.61.243.152
```

---

## SSL Certificate Setup (Let's Encrypt)

### Step 2: SSH into VPS and Generate SSL Certificate

```bash
# SSH into your VPS
ssh root@72.61.243.152

# Navigate to project directory
cd /path/to/ERPComm

# Make sure certbot directory exists
mkdir -p certbot/conf certbot/www

# Stop Nginx temporarily (or use certbot standalone mode)
docker-compose stop nginx

# Install certbot if not already installed
apt-get update
apt-get install -y certbot

# Generate SSL certificate
certbot certonly --standalone \
  -d orutest.site \
  -d www.orutest.site \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# OR if Nginx is running, use webroot mode:
certbot certonly --webroot \
  -w ./certbot/www \
  -d orutest.site \
  -d www.orutest.site \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive
```

**Expected Output:**
```
Congratulations! Your certificate and chain have been saved at:
/etc/letsencrypt/live/orutest.site/fullchain.pem
Your key file has been saved at:
/etc/letsencrypt/live/orutest.site/privkey.pem
```

### Step 3: Update Docker Compose for SSL

The certificates are now in `/etc/letsencrypt/live/orutest.site/`. Update your `docker-compose.yml` to mount them:

```yaml
nginx:
  image: nginx:stable-alpine
  container_name: erpcomm-nginx
  restart: unless-stopped
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro  # SSL certificates
    - ./certbot/www:/var/www/certbot:ro      # ACME challenge
  depends_on:
    app:
      condition: service_healthy
  networks:
    - erpcomm-network
```

### Step 4: Restart Services

```bash
# Rebuild and restart with new nginx config
docker-compose up -d --force-recreate nginx

# Check logs
docker-compose logs -f nginx
```

---

## Verification

### Test HTTP to HTTPS Redirect

```bash
# Should redirect to HTTPS
curl -I http://orutest.site
# Look for: Location: https://orutest.site/

# Should return 200 OK
curl -I https://orutest.site
```

### Test in Browser

1. Visit `http://orutest.site` → Should redirect to `https://orutest.site`
2. Visit `https://orutest.site` → Should show your app with green padlock 🔒
3. Visit `https://www.orutest.site` → Should also work

### Test WebSocket Connection

Open browser console on `https://orutest.site` and check:
```javascript
// Should show connected
console.log('Socket.IO connection:', socket.connected);
```

### Test Authentication with Cookies

1. Login at `https://orutest.site`
2. Open DevTools → Application → Cookies
3. **Verify:** Session cookie should have:
   - `Secure` flag ✅
   - `HttpOnly` flag ✅
   - `SameSite=Lax` ✅

---

## SSL Certificate Auto-Renewal

Let's Encrypt certificates expire every 90 days. Set up auto-renewal:

```bash
# Test renewal (dry run)
certbot renew --dry-run

# Add to crontab for automatic renewal
crontab -e

# Add this line (runs twice daily)
0 0,12 * * * certbot renew --quiet && docker-compose restart nginx
```

---

## Troubleshooting

### Problem: DNS not resolving

```bash
# Check DNS propagation
dig orutest.site
nslookup orutest.site

# Clear local DNS cache (on your machine)
# Windows:
ipconfig /flushdns

# Linux:
sudo systemd-resolve --flush-caches
```

### Problem: SSL certificate error

```bash
# Check certificate files exist
ls -la /etc/letsencrypt/live/orutest.site/

# Check Nginx logs
docker-compose logs nginx

# If certificate not found, regenerate:
certbot certonly --standalone -d orutest.site -d www.orutest.site --force-renew
```

### Problem: Nginx won't start

```bash
# Test nginx config
docker-compose exec nginx nginx -t

# Check logs
docker-compose logs nginx

# Common issue: Remove intermediate HTTPS config if certs don't exist yet
# Edit nginx.conf and comment out SSL server block temporarily
```

### Problem: WebSocket connection fails

```bash
# Check if Socket.IO endpoint is accessible
curl -I https://orutest.site/socket.io/

# Should return 400 (expected for non-websocket request)
# Check browser console for actual connection errors
```

---

## Summary

✅ **DNS Setup:** Point A records to `72.61.243.152`  
✅ **SSL Certificate:** Generated with Let's Encrypt  
✅ **Nginx Config:** Updated with domain and HTTPS  
✅ **Auto-Renewal:** Configured with cron job  

Your application should now be accessible at:
- **https://orutest.site** (main)
- **https://www.orutest.site** (www subdomain)

Both HTTP URLs will automatically redirect to HTTPS for security.
