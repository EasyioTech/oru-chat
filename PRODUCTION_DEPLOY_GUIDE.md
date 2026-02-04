# Production Deployment Quick Guide

## 🚨 Two Critical Issues Fixed

### 1. SES Lockdown Error (500 on Login)
**Problem:** `orchids-visual-edits` package causing "SES Removing unpermitted intrinsics" error
**Solution:** Added npm override to replace with empty module

### 2. Missing Environment Variables
**Problem:** JWT_SECRET and other vars not set on VPS
**Solution:** Created comprehensive `.env` setup guide

## 📦 Files Changed

1. **package.json** - Added npm overrides to fix SES lockdown
2. **docker-compose.yml** - Removed obsolete `version` field
3. **VPS_ENV_SETUP.md** - Complete environment setup guide

## 🚀 Deploy to VPS

### Step 1: Set Up Environment Variables

```bash
# SSH into your VPS
cd /root/oru-chat

# Create .env file
nano .env
```

**Copy this into .env** (see [VPS_ENV_SETUP.md](file:///f:/Devlopment%20Projects/ERPComm/VPS_ENV_SETUP.md) for full template):

```bash
NODE_ENV=production
PORT=3000

# CRITICAL: Generate your own secure secret
JWT_SECRET=$(openssl rand -hex 32)

DATABASE_URL=postgresql://easyio:oruchatDB@db:5432/Oruchat
POSTGRES_USER=easyio
POSTGRES_PASSWORD=oruchatDB
POSTGRES_DB=Oruchat

REDIS_URL=redis://redis:6379
REDIS_MAXMEMORY=256mb

# Optional Giphy API
NEXT_PUBLIC_GIPHY_API_KEY=vdn9eLhHvoZO5xYIypWNVtpbTYrDFahI

# Optional R2 Storage
R2_ACCOUNT_ID=621e1238055b632e52c0f8c99202cdfd
R2_ACCESS_KEY_ID=fe970967eb3e77fbc1d7823b2ba50c5e
R2_SECRET_ACCESS_KEY=a651f5fd14b1e2d66abd6ab32032062ceba1189df3b4a95ebf2cfca449337afc
R2_BUCKET_NAME=oruchat
```

### Step 2: Deploy the Fix

```bash
# Pull latest code  
git pull origin main

# Clean rebuild (fixes SES lockdown)
docker-compose down
docker system prune -f
docker-compose build --no-cache
docker-compose up -d
```

### Step 3: Monitor Startup

```bash
docker-compose logs -f app
```

**Look for:**
- ✅ No "SES Removing unpermitted intrinsics" messages
- ✅ "Server listening on port 3000"
- ✅ Database connected successfully

### Step 4: Test

1. Navigate to: `http://YOUR_VPS_IP:3008`
2. Login: `user1` / `password`
3. Verify:
   - ✅ No 500 errors
   - ✅ No SES lockdown warnings  
   - ✅ Workspaces load successfully

## 🔍 Troubleshooting

### Still seeing SES lockdown errors?

```bash
# Verify package override is applied
grep -A 3 "overrides" package.json

# Should show:
#   "overrides": {
#     "orchids-visual-edits": "npm:empty-module@^1.0.0"
#   }
```

### Still missing environment variables?

```bash
# Check if .env exists
ls -la .env

# Verify JWT_SECRET is set
grep JWT_SECRET .env

# Check inside container
docker exec erpcomm-app env | grep JWT_SECRET
```

### Clean Slate Rebuild

```bash
docker-compose down -v  # WARNING: Deletes data
docker system prune -af
rm -rf node_modules package-lock.json
docker-compose build --no-cache
docker-compose up -d
```

## 📝 Summary of Both Fixes

### Cookie Security Fix (From Earlier)
- ✅ Cookies now work on HTTP deployments
- ✅ Automatically detects HTTPS and sets secure flag
- 📄 See: [DEPLOYMENT_FIX.md](file:///f:/Devlopment%20Projects/ERPComm/DEPLOYMENT_FIX.md)

### Production Error Fixes (Current)
- ✅ SES lockdown errors eliminated
- ✅ Environment variables properly configured
- ✅ Docker warnings resolved
- 📄 See: [VPS_ENV_SETUP.md](file:///f:/Devlopment%20Projects/ERPComm/VPS_ENV_SETUP.md)

## ✅ Final Checklist

- [ ] `.env` file created on VPS
- [ ] Secure JWT_SECRET generated
- [ ] Latest code pulled
- [ ] Clean rebuild completed
- [ ] No SES lockdown errors in logs
- [ ] Login works (no 500 errors)
- [ ] Workspaces load successfully
- [ ] No environment variable warnings

---

**Need Help?** Run the diagnostic script:
```bash
npx tsx scripts/diagnose-auth.ts http://YOUR_VPS_IP:3008 user1
```
