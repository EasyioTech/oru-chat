#!/bin/bash
# VPS Deployment Check Script
# Run this on your Hostinger VPS to verify everything is ready

echo "=========================================="
echo "ERPComm VPS Deployment Verification"
echo "=========================================="
echo ""

# Check current directory
echo "1. Current Directory:"
pwd
echo ""

# Check for required files
echo "2. Required Files Check:"
FILES=("docker-compose.yml" "Dockerfile" "nginx.conf" "schema.sql" ".env" "package.json" "server.ts")

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ $file MISSING"
    fi
done
echo ""

# Check nginx.conf specifically
echo "3. nginx.conf Details:"
if [ -f "nginx.conf" ]; then
    echo "   File exists: YES"
    echo "   File type: $(file nginx.conf)"
    echo "   File size: $(stat -f%z nginx.conf 2>/dev/null || stat -c%s nginx.conf 2>/dev/null) bytes"
    echo "   Permissions: $(ls -l nginx.conf | awk '{print $1}')"
else
    if [ -d "nginx.conf" ]; then
        echo "   ❌ ERROR: nginx.conf is a DIRECTORY, not a file!"
    else
        echo "   ❌ nginx.conf does not exist"
    fi
fi
echo ""

# Check .env file
echo "4. Environment Configuration:"
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
    echo "   Environment variables defined:"
    grep -E "^[A-Z_]+=" .env | cut -d= -f1 | sed 's/^/      - /'
else
    echo "   ❌ .env file missing"
fi
echo ""

# Check Docker
echo "5. Docker Status:"
if command -v docker &> /dev/null; then
    echo "   ✅ Docker installed"
    docker --version
else
    echo "   ❌ Docker not installed"
fi

if command -v docker-compose &> /dev/null; then
    echo "   ✅ Docker Compose installed"
    docker-compose --version
else
    echo "   ❌ Docker Compose not installed"
fi
echo ""

# Check running containers
echo "6. Running Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "   No running containers or Docker not accessible"
echo ""

echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo "1. If nginx.conf is missing, copy it from your local repo"
echo "2. Ensure .env has all required variables"
echo "3. Run: docker-compose up -d --build"
echo "4. Access app at: http://YOUR_VPS_IP:3008"
echo "=========================================="
