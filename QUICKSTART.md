# ERPComm - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Configure Environment

```bash
# Copy the environment template
cp .env.example .env

# Edit with your values (use nano, vim, or any text editor)
nano .env
```

**Minimum required values:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### Step 2: Start the Application

```bash
# Start all services
docker-compose up -d --build

# Or without detached mode to see logs
docker-compose up --build
```

### Step 3: Verify It's Working

```bash
# Check all services are healthy
docker-compose ps

# Test the application
curl http://localhost:3000/api/health

# View logs
docker-compose logs -f app
```

## 🌐 Access the Application

- **Application**: http://localhost:3000
- **With Nginx**: http://localhost:80 (or https://yourdomain.com in production)

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Full deployment guide for production
- **[DOCKER.md](./DOCKER.md)** - Docker commands and troubleshooting
- **[README.md](./README.md)** - Project overview and features

## 🛑 Stop the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v
```

## ❓ Need Help?

Check the [troubleshooting section](./DEPLOYMENT.md#-troubleshooting) in DEPLOYMENT.md
