#!/bin/sh
set -e

echo "Starting Nginx wrapper..."

# Install openssl (required for certificate generation)
if ! command -v openssl &> /dev/null; then
    echo "Installing openssl..."
    apk add --no-cache openssl
fi

DOMAIN="orutest.site"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

# Ensure directory exists
mkdir -p "$CERT_DIR"

# Check if certificates exist
if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
    echo "No SSL certificate found. Generating self-signed dummy certificate for boot..."
    openssl req -x509 -nodes -newkey rsa:2048 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -days 1 \
        -subj "/CN=orutest.site"
    echo "Dummy certificate generated."
fi

# Start Nginx in background
echo "Starting Nginx..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Watch for certificate changes and reload Nginx
# Calculate initial checksum
LAST_CHECKSUM=$(md5sum "$CERT_DIR/fullchain.pem" | awk '{print $1}')

while true; do
    sleep 10
    CURRENT_CHECKSUM=$(md5sum "$CERT_DIR/fullchain.pem" | awk '{print $1}')
    
    if [ "$LAST_CHECKSUM" != "$CURRENT_CHECKSUM" ]; then
        echo "Certificate changed! Reloading Nginx..."
        nginx -s reload
        LAST_CHECKSUM="$CURRENT_CHECKSUM"
    fi
done &

# Wait for Nginx process
wait $NGINX_PID
