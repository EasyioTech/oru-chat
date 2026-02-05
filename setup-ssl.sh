#!/bin/bash
# SSL Setup Script for orutest.site
# Run this on your VPS at 72.61.243.152

set -e  # Exit on error

echo "=========================================="
echo "SSL Certificate Setup for orutest.site"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Variables
DOMAIN="orutest.site"
WWW_DOMAIN="www.orutest.site"
EMAIL="easyio.tech@gmail.com"  # UPDATE THIS!
PROJECT_DIR="/root/oru-chat"      # UPDATE THIS if different!

echo "Configuration:"
echo "  Domain: $DOMAIN"
echo "  WWW Domain: $WWW_DOMAIN"
echo "  Email: $EMAIL"
echo "  Project Directory: $PROJECT_DIR"
echo ""

read -p "Press Enter to continue or Ctrl+C to cancel..."

# Step 1: Install Certbot if not installed
echo ""
echo "Step 1: Installing Certbot..."
if ! command -v certbot &> /dev/null; then
    apt-get update
    apt-get install -y certbot
    echo "✓ Certbot installed"
else
    echo "✓ Certbot already installed"
fi

# Step 2: Check DNS
echo ""
echo "Step 2: Verifying DNS..."
CURRENT_IP=$(dig +short $DOMAIN | head -n1)
echo "  $DOMAIN points to: $CURRENT_IP"
echo "  Expected: 72.61.243.152"

if [ "$CURRENT_IP" != "72.61.243.152" ]; then
    echo ""
    echo "⚠ WARNING: DNS is not pointing to the correct IP!"
    echo "  Update your DNS A record to point to 72.61.243.152"
    echo "  Wait 5-15 minutes for propagation, then run this script again"
    exit 1
fi
echo "✓ DNS is configured correctly"

# Step 3: Stop Nginx temporarily
echo ""
echo "Step 3: Stopping Nginx to free port 80..."
cd $PROJECT_DIR
docker-compose stop nginx || true
echo "✓ Nginx stopped"

# Step 4: Generate SSL certificate
echo ""
echo "Step 4: Generating SSL certificate..."
echo "  This may take a minute..."

if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "  Certificate already exists, renewing..."
    certbot renew --force-renewal
else
    echo "  Generating new certificate..."
    certbot certonly --standalone \
        -d $DOMAIN \
        -d $WWW_DOMAIN \
        --email $EMAIL \
        --agree-tos \
        --non-interactive \
        --preferred-challenges http
fi

if [ $? -eq 0 ]; then
    echo "✓ SSL certificate generated successfully"
    echo "  Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    echo "  Private key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
else
    echo "✗ Failed to generate certificate"
    exit 1
fi

# Step 5: Verify certificate files
echo ""
echo "Step 5: Verifying certificate files..."
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
    echo "✓ Certificate files exist"
    ls -lh /etc/letsencrypt/live/$DOMAIN/
else
    echo "✗ Certificate files not found"
    exit 1
fi

# Step 6: Start Nginx with SSL
echo ""
echo "Step 6: Starting Nginx with SSL..."
cd $PROJECT_DIR
docker-compose up -d nginx

# Wait for nginx to start
echo "  Waiting for Nginx to start..."
sleep 5

# Check if nginx is running
if docker ps | grep -q erpcomm-nginx; then
    echo "✓ Nginx is running"
else
    echo "✗ Nginx failed to start"
    echo "  Check logs with: docker-compose logs nginx"
    exit 1
fi

# Step 7: Test SSL
echo ""
echo "Step 7: Testing SSL configuration..."
sleep 2

# Test HTTP redirect
echo "  Testing HTTP redirect..."
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -L http://$DOMAIN)
if [ "$HTTP_RESPONSE" == "200" ]; then
    echo "✓ HTTP redirect working"
else
    echo "⚠ HTTP response: $HTTP_RESPONSE (expected 200)"
fi

# Test HTTPS
echo "  Testing HTTPS..."
HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -k https://$DOMAIN)
if [ "$HTTPS_RESPONSE" == "200" ]; then
    echo "✓ HTTPS working"
else
    echo "⚠ HTTPS response: $HTTPS_RESPONSE (expected 200)"
fi

# Step 8: Setup auto-renewal
echo ""
echo "Step 8: Setting up auto-renewal..."

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "certbot renew"; then
    echo "✓ Auto-renewal already configured"
else
    # Add cron job for SSL renewal (runs twice daily)
    (crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet && docker-compose -f $PROJECT_DIR/docker-compose.yml restart nginx") | crontab -
    echo "✓ Auto-renewal cron job added"
fi

# Success!
echo ""
echo "=========================================="
echo "✓ SSL SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "Your application is now accessible at:"
echo "  🔒 https://$DOMAIN"
echo "  🔒 https://$WWW_DOMAIN"
echo ""
echo "Certificate will auto-renew every 90 days."
echo ""
echo "Next steps:"
echo "  1. Visit https://$DOMAIN in your browser"
echo "  2. Verify the green padlock (🔒) appears"
echo "  3. Test login and messaging features"
echo ""
echo "If you encounter issues, check logs with:"
echo "  docker-compose logs nginx"
echo "=========================================="
