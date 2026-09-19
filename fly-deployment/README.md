# EpicServer License Server - Fly.io Deployment Guide

## 📋 Requirements

- [Fly.io account](https://fly.io) (Free tier: 3 VMs, 3GB persistent volume)
- [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) installed on your machine
- Git (optional, for version control)

---

## 🚀 Step-by-Step Deployment

### 1. Install Fly CLI and Login

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# macOS / Linux
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
fly auth login
```

### 2. Launch the App

```bash
# Navigate to your project directory
cd C:\Users\Epic\Documents\MC project\EpicServer\Sources\LicenseServer

# Create a new Fly.io app (interactive)
fly launch --no-deploy
```

When prompted:
- **App name:** Choose a unique name (e.g., `epic-license-server`)
- **Region:** Pick the closest to your users (e.g., `ams` for Europe, `iad` for US East)
- **Would you like to set up a Postgresql database?** → `No` (we use SQLite)
- **Would you like to deploy now?** → `No` (we need to set secrets first)

This will create a `fly.toml` file. **Replace it with the `fly.toml` provided in this project.**

### 3. Set Sensitive Environment Variables (Secrets)

```bash
# Set admin password (REQUIRED - change to a strong password!)
fly secrets set ADMIN_PASSWORD=YourStrongAdminPassword123!

# Set JWT secret (REQUIRED - generate a random string)
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
# On Windows PowerShell:
# fly secrets set JWT_SECRET="your-random-64-char-hex-string-here"

# Optional: Override admin username
fly secrets set ADMIN_USERNAME=admin
```

> ⚠️ **IMPORTANT:** These secrets are encrypted and never exposed in logs.
> The server will FAIL TO START if `ADMIN_PASSWORD` and `JWT_SECRET` are not set.

### 4. Create Persistent Volume for SQLite Database

```bash
# Create a 1GB volume named "license_data" in your region
# Replace "ams" with your chosen region
fly volumes create license_data --region ams --size 1
```

> 💡 **Why this is needed:** SQLite stores data in a file. Without a persistent volume,
> your database would be deleted every time the app restarts or scales to zero.
> The volume is mounted at `/data` and the database is stored at `/data/licenses.db`.

### 5. Deploy the App

```bash
# Deploy using the Dockerfile
fly deploy
```

### 6. Verify Deployment

```bash
# Open the app in browser
fly open

# Check health endpoint
curl https://your-app-name.fly.dev/api/health

# View logs
fly logs
```

Expected health response:
```json
{"success":true,"status":"running","timestamp":...,"version":"1.0.0"}
```

---

## 🔐 Managing Secrets

### View all secrets
```bash
fly secrets list
```

### Update a secret
```bash
fly secrets set ADMIN_PASSWORD=new-password-here
# Then redeploy:
fly deploy
```

### Remove a secret
```bash
fly secrets unset SECRET_NAME
```

---

## 💾 SQLite Database Management

### Backup the database
```bash
# SSH into the running machine
fly ssh console

# Inside the container, backup the database
cp /data/licenses.db /data/licenses.db.backup

# Or copy to your local machine
fly ssh sftp get /data/licenses.db ./licenses_backup.db
```

### Restore the database
```bash
# Upload your backup
fly ssh sftp put ./licenses_backup.db /data/licenses.db

# Restart the app
fly deploy
```

### Check volume status
```bash
fly volumes list
```

---

## 📊 Monitoring

### View logs
```bash
# Live logs
fly logs

# Recent logs
fly logs --tail 50
```

### Check app status
```bash
fly status
fly info
```

### Scale (if needed)
```bash
# Scale to 1 machine (always running)
fly scale count 1

# Scale to 0 (auto-stop when idle - free tier friendly)
fly scale count 0
```

---

## 🛠 Common Issues & Solutions

### Issue: App fails to start
```bash
# Check logs
fly logs

# Common causes:
# 1. ADMIN_PASSWORD or JWT_SECRET not set
# 2. Volume not created
# 3. Port mismatch (Dockerfile uses 8080, fly.toml must match)
```

### Issue: Database reset after restart
```bash
# Check if volume exists
fly volumes list

# If no volume, create one:
fly volumes create license_data --region ams --size 1
```

### Issue: "Out of memory" errors
```bash
# Increase memory allocation in fly.toml:
# [[vm]]
#   size = "shared-cpu-1x"
#   memory = "512mb"
```

---

## 🔄 Updating the App

```bash
# Make your code changes, then:
fly deploy
```

---

## 💰 Free Tier Limits

| Resource | Free Tier Limit |
|----------|----------------|
| VMs | 3 shared VMs |
| RAM | 256MB per VM |
| Storage | 3GB total |
| Bandwidth | 160GB/month |
| Volume | 1GB per volume |

To stay within free tier:
- Keep `min_machines_running = 0` (auto-stops when idle)
- Use 1GB volume size
- Monitor bandwidth usage

---

## 🧹 Cleanup (if needed)

```bash
# Delete the app and all resources
fly apps destroy epic-license-server