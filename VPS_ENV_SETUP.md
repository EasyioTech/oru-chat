# VPS Deployment Environment Setup

## 🚨 Critical: Environment Variables

The deployment server needs a `.env` file with all required variables. The warnings you saw indicate missing variables that will cause the application to fail.

### Step 1: Create .env file on VPS

SSH into your VPS and create the `.env` file:

```bash
cd /root/oru-chat  # or wherever your project is
nano .env
```

### Step 2: Copy these environment variables

```bash
# ==============================================
# Application Configuration
# ==============================================
NODE_ENV=production
PORT=3000

# ==============================================
# Authentication - CRITICAL!
# ==============================================
# Generate a secure random string (32+ characters)
# You can generate one with: openssl rand -hex 32
JWT_SECRET=REPLACE_WITH_SECURE_RANDOM_STRING_32_PLUS_CHARS

# ==============================================
# Database Configuration
# ==============================================
# Internal Docker network uses container name 'db' and internal port 5432
DATABASE_URL=postgresql://easyio:oruchatDB@db:5432/Oruchat

# PostgreSQL Container Config
POSTGRES_USER=easyio
POSTGRES_PASSWORD=oruchatDB
POSTGRES_DB=Oruchat

# ==============================================
# Redis Configuration
# ==============================================
# Internal Docker network uses container name 'redis' and internal port 6379
REDIS_URL=redis://redis:6379
REDIS_MAXMEMORY=256mb

# ==============================================
# External Services
# ==============================================
# Giphy API (Optional - for GIF support)
NEXT_PUBLIC_GIPHY_API_KEY=vdn9eLhHvoZO5xYIypWNVtpbTYrDFahI

# Cloudflare R2 Storage (Optional - for file uploads)
# If not using file uploads, you can leave these blank
R2_ACCOUNT_ID=621e1238055b632e52c0f8c99202cdfd
R2_ACCESS_KEY_ID=fe970967eb3e77fbc1d7823b2ba50c5e
R2_SECRET_ACCESS_KEY=a651f5fd14b1e2d66abd6ab32032062ceba1189df3b4a95ebf2cfca449337afc
R2_BUCKET_NAME=oruchat
```

### Step 3: Generate Secure JWT Secret

**IMPORTANT:** Replace the JWT_SECRET with your own secure random string:

```bash
# On your VPS, generate a secure secret:
openssl rand -hex 32
```

Copy the output and replace `REPLACE_WITH_SECURE_RANDOM_STRING_32_PLUS_CHARS` in your `.env` file.

### Step 4: Save and Verify

```bash
# Save the file (Ctrl+X, Y, Enter in nano)

# Verify the file was created:
cat .env | grep JWT_SECRET
# Should NOT show "REPLACE_WITH_SECURE_RANDOM_STRING"
```

## 🔧 Deployment Steps

After setting up the `.env` file:

### 1. Pull Latest Code

```bash
cd /root/oru-chat
git pull origin main
```

### 2. Rebuild with New Package Configuration

The `package.json` now includes an override to fix the SES lockdown error:

```bash
# Remove old containers and images
docker-compose down
docker system prune -f

# Rebuild everything from scratch
docker-compose build --no-cache

# Start services
docker-compose up -d
```

### 3. Monitor Logs

```bash
# Watch for any errors
docker-compose logs -f app

# Look for successful startup messages:
# ✓ Ready in XXXms
# Server listening on port 3000
```

### 4. Test the Application

```bash
# Test from the VPS itself
curl http://localhost:3008/api/health

# Should return: OK or similar success message
```

## 🧪 Verification

### Test Login

1. Navigate to `http://YOUR_VPS_IP:3008`
2. Login with: `user1` / `password`
3. Check browser console - should NOT see:
   - "SES Removing unpermitted intrinsics" 
   - 500 errors on login
4. Workspaces should load successfully

### Run Diagnostic Script (Optional)

From your local machine with the diagnostic script:

```bash
npx tsx scripts/diagnose-auth.ts http://YOUR_VPS_IP:3008 user1
```

## 🔍 Troubleshooting

### If you still see "SES lockdown" errors:

```bash
# Ensure package override is applied
cd /root/oru-chat
grep -A 3 "overrides" package.json
# Should show the orchids-visual-edits override

# Clear npm cache and rebuild
docker-compose down
rm -rf node_modules package-lock.json
docker-compose build --no-cache
docker-compose up -d
```

### If environment variables are still missing:

```bash
# Check if .env is being loaded
docker-compose config | grep JWT_SECRET
# Should show your actual JWT_SECRET value, not blank

# If blank, verify .env file location:
ls -la /root/oru-chat/.env
# File must be in the same directory as docker-compose.yml
```

### Check Container Environment

```bash
# Verify env vars inside the container
docker exec erpcomm-app env | grep JWT_SECRET
# Should show your secret value
```

## 📋 Quick Checklist

- [ ] Created `.env` file on VPS
- [ ] Generated and set secure JWT_SECRET
- [ ] Pulled latest code
- [ ] Rebuilt containers with `--no-cache`
- [ ] Verified no SES lockdown errors in logs
- [ ] Successfully logged in
- [ ] Workspaces load correctly

## 🔐 Security Notes

> [!WARNING]
> **Environment Variable Security**
> - Never commit `.env` file to git (it's in .gitignore)
> - Use strong, unique JWT_SECRET (32+ characters)
> - Keep R2 credentials secure
> - For HTTPS deployment, generate new JWT_SECRET

> [!IMPORTANT]
> **Production Checklist**
> - [ ] Secure JWT_SECRET set
> - [ ] HTTPS configured (recommended)
> - [ ] Database password changed from default
> - [ ] Redis password set (if exposed)
> - [ ] Firewall configured (only necessary ports open)
