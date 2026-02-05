#!/bin/sh
set -e

DOMAIN="orutest.site"
EMAIL="easyio.tech@gmail.com"
WEBROOT="/var/www/certbot"

echo "Starting Certbot manager..."

# Function to check if cert is dummy
is_dummy_cert() {
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        ISSUER=$(openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -issuer -noout)
        echo "$ISSUER" | grep -q "localhost"
        return $?
    fi
    return 1 # File doesn't exist, treat as 'needs cert' effectively
}

# Wait for Nginx to start (simple sleep)
echo "Waiting for Nginx to allow ACME challenges..."
sleep 15

# Check if we need to request a new cert
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] || is_dummy_cert; then
    echo "Certificate missing or dummy detected. Requesting new certificate..."
    
    # We use --webroot mode so we don't have to stop Nginx
    # But Nginx must be serving /.well-known/acme-challenge/ from $WEBROOT
    certbot certonly --webroot \
        -w "$WEBROOT" \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos \
        --non-interactive \
        --rsa-key-size 4096 \
        --force-renewal
        
    if [ $? -eq 0 ]; then
        echo "Certificate obtained successfully!"
    else
        echo "Failed to obtain certificate. Check logs and DNS."
    fi
else
    echo "Valid certificate validation skipped (already exists)."
fi

# Start auto-renewal loop
echo "Starting auto-renewal loop..."
trap exit TERM
while :; do
    echo "Checking for renewal..."
    certbot renew
    sleep 12h & wait ${!}
done
