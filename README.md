# Epic License Server

License validation server for Minecraft (Paper/Spigot) premium plugins — with HWID binding, admin dashboard, crash reports, server heartbeat tracking, and Fly.io deployment.

Stack: **Node.js + Express + SQLite (better-sqlite3)** · No build step · Vanilla JS dashboard (Chart.js).

## Features

- **License lifecycle** — create (`EPIC-XXXX-...`), list/filter/search/sort/paginate, update, copy, revoke/activate, delete
- **Verification (`POST /api/verify`)** — status check, expiry check, plugin-name check, HWID auto-bind + mismatch detection, server-session tracking
- **HWID binding** — first verify binds, later verifies must match; admin can reset (`POST /api/license/:key/reset-hwid`)
- **Servers** — online/all sessions, heartbeat (`POST /api/servers/heartbeat`) with players/country tracking
- **Crash reports** — plugins submit (`POST /api/crashes`), admin resolve/ignore/delete
- **Plugins registry** — CRUD + version publishing (`POST /api/plugin/:name/version`) for auto-updates
- **Customers, activity logs, analytics** (30-day / 12-month charts, top plugins, status distribution), security events, notifications, settings
- **Admin dashboard** (`public/`) — login (Basic Auth), dark mode, responsive sidebar, API docs page
- **Deploy-ready** — `Dockerfile` (multi-stage, non-root, healthcheck), `fly.toml` + volume for SQLite persistence
- **Env overrides** — `PORT`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`, `DB_PATH` override `config.json`

## Project structure

```
.
├── server.js            # Express API + SQLite schema + static hosting
├── public/              # Admin dashboard (index.html, css/, js/ incl. js/pages/*)
├── config.example.json  # Copy to config.json for local dev
├── .env.example         # Env-var overrides (recommended for production)
├── Dockerfile           # Fly.io / Docker deploy (port 8080, /data volume)
├── fly.toml             # Fly.io app config
├── fly-deployment/      # Step-by-step Fly.io guide
├── start.sh             # Local start helper (./start.sh [port])
└── package.json
```

Database tables (auto-created): `licenses`, `verification_log`, `admins`, `plugins`, `plugin_versions`, `activity_log`, `notifications`, `server_sessions`, `crash_reports`, `security_events`, `settings`, `customers`.

## Quick start (local)

Requirements: Node.js 20+.

```bash
# 1. Install
npm install

# 2. Configure (pick ONE)
cp config.example.json config.json        # then edit adminPassword / jwtSecret
# ...or use env vars (recommended):
# cp .env.example .env  (then export, or set in your shell/host)

# 3. Run
npm start
# or: ./start.sh 3001
# or:  PORT=3001 ADMIN_USERNAME=admin ADMIN_PASSWORD=secret JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") node server.js
```

Open: `http://localhost:3001` (dashboard) · `http://localhost:3001/api/health` (health check).

> First run creates the default admin from `ADMIN_USERNAME`/`ADMIN_PASSWORD` (bcrypt-hashed in SQLite). Change the password via dashboard → Settings.

## Configuration

| Source | Key | Default | Notes |
|---|---|---|---|
| env `PORT` / `config.port` | port | `3001` | Fly.io sets `8080` via Dockerfile |
| env `ADMIN_USERNAME` / `config.adminUsername` | admin login | `admin` | |
| env `ADMIN_PASSWORD` / `config.adminPassword` | admin password | `admin123` ⚠️ | **Must change in production** |
| env `JWT_SECRET` / `config.jwtSecret` | HWID hash salt | built-in default ⚠️ | **Must change in production** |
| env `DB_PATH` | sqlite path | `./licenses.db` | Fly.io: `/data/licenses.db` |
| `config.licenseKeyPrefix` | key prefix | `EPIC` | e.g. `EPIC-A1B2-...` |

## API reference

Admin endpoints require Basic Auth: `Authorization: Basic base64(username:password)`.

### Public (called by plugins)

**`POST /api/verify`** — verify a license:
```json
{
  "licenseKey": "EPIC-XXXX-XXXX-XXXX-XXXX",
  "hwid": "generated-hwid-hash",
  "serverId": "server-uuid",
  "serverIp": "127.0.0.1",
  "serverPort": 25565,
  "worldSeed": "optional",
  "pluginName": "EpicTools",
  "pluginVersion": "1.0.0"
}
```
Success → `{ "success": true, "message": "...", "data": { "pluginName", "pluginVersion", "expiresAt", "maxServers" } }`.

**`POST /api/servers/heartbeat`** — `{ licenseKey, serverName, pluginName, pluginVersion, hwid, players, country }`

**`POST /api/crashes`** — `{ pluginName, pluginVersion, javaVersion, serverVersion, errorMessage, stacktrace, owner }`

**`GET /api/health`** — `{ success, status, timestamp, version }`

### Admin (Basic Auth)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/register` | Create license (`pluginName`, `pluginVersion`, `ownerDiscord`, `ownerEmail`, `maxServers`, `expiresInDays`, `notes`) |
| GET | `/api/list?status&pluginName&search&sortBy&sortOrder&page&limit` | List licenses |
| GET | `/api/license/:key` | License detail + verify logs + IP history |
| PUT | `/api/license/:key` | Update (`pluginVersion`, `ownerDiscord/Email/Telegram`, `maxServers`, `expiresAt`, `notes`) |
| DELETE | `/api/license/:key` | Delete |
| POST | `/api/license/:key/reset-hwid` | Unbind HWID |
| POST | `/api/license/:key/copy` | Duplicate license (new key) |
| POST | `/api/revoke` / `/api/activate` | `{ licenseKey }` |
| GET/POST/PUT/DELETE | `/api/plugins`, `/api/plugins/:name` | Plugin registry |
| GET/POST | `/api/plugin/:name/versions`, `/api/plugin/:name/version` | Version publish (auto-update) |
| GET | `/api/servers/online`, `/api/servers/all` | Server sessions |
| GET/POST | `/api/customers`, `/api/customers/:id` | Customers |
| GET | `/api/activity`, `/api/activity/stats` | Logs + chart data |
| GET | `/api/logs/export?format=csv` | Export logs |
| GET | `/api/security` | Failed attempts, HWID mismatches, events |
| GET/POST | `/api/notifications`, `/api/notifications/read`, `/api/notifications/clear` | Notifications |
| GET/POST | `/api/settings` | `{ settings: {...} }` |
| POST | `/api/change-password` | `{ currentPassword, newPassword }` |
| GET | `/api/stats`, `/api/dashboard/recent` | Dashboard stats |

Full interactive reference is also built into the dashboard → **API Docs** page.

### Minecraft plugin integration (Java example)

```java
// Build HWID (must match server-side scheme) and POST /api/verify
String url = "https://your-server.fly.dev/api/verify";
String json = new Gson().toJson(Map.of(
  "licenseKey", getConfig().getString("license-key"),
  "hwid", computeHwid(), // SHA-256 or any stable server fingerprint
  "serverId", getServer().getServerId(),
  "serverIp", getServer().getIp(),
  "serverPort", getServer().getPort(),
  "pluginName", "EpicTools",
  "pluginVersion", getDescription().getVersion()
));
// POST json, parse { success, message, data }. Cache result, re-verify on interval.
// Send periodic POST /api/servers/heartbeat while running.
// Send POST /api/crashes on uncaught exceptions.
```

## Deployment (Fly.io)

See [`fly-deployment/README.md`](fly-deployment/README.md) for the full guide. Short version:

```bash
fly launch --no-deploy
fly secrets set ADMIN_PASSWORD=... JWT_SECRET=$(openssl rand -hex 32)
fly volumes create license_data --region ams --size 1
fly deploy
curl https://<app>.fly.dev/api/health
```

Notes: SQLite lives on the persistent volume (`/data/licenses.db`); without the volume data is lost on restart. Keep `min_machines_running = 0` for free-tier friendliness. Back up via `fly ssh sftp get /data/licenses.db`.

## Security notes

- Change `ADMIN_PASSWORD` and `JWT_SECRET` before exposing publicly (server logs a warning on defaults).
- Admin API uses Basic Auth — always serve behind HTTPS (Fly.io `force_https = true` is already set).
- `licenses.db*` and `config.json` are git-ignored; never commit real credentials or production databases.
- Failed verifies / invalid keys / HWID mismatches are logged to `security_events` — review dashboard → Security.

## License

PolyForm Noncommercial 1.0.0 — see [LICENSE](LICENSE).

You may use, modify and share this project for **noncommercial purposes only**.
Commercial use — including selling the software or modified versions — is prohibited.
