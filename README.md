# Epic License Server

Minecraft (Paper/Spigot) premium plaginlari uchun litsenziya tekshirish serveri — HWID bog'lash, admin panel, crash hisobotlar, server heartbeat kuzatuvi va Fly.io da deploy bilan.

Stek: **Node.js + Express + SQLite (better-sqlite3)** · Build shart emas · Vanilla JS dashboard (Chart.js).

## Imkoniyatlar

- **Litsenziya sikli** — yaratish (`EPIC-XXXX-...`), ro'yxat/filtr/qidiruv/saralash/sahifalash, yangilash, nusxalash, bekor qilish/faollashtirish, o'chirish
- **Tekshirish (`POST /api/verify`)** — holat tekshiruvi, muddat tekshiruvi, plagin nomi tekshiruvi, HWID avtomatik bog'lash + nomuvofiqlikni aniqlash, server sessiya kuzatuvi
- **HWID bog'lash** — birinchi tekshirishda bog'lanadi, keyingilari mos kelishi shart; admin reset qila oladi (`POST /api/license/:key/reset-hwid`)
- **Serverlar** — onlayn/barcha sessiyalar, heartbeat (`POST /api/servers/heartbeat`) bilan o'yinchi/davlat kuzatuvi
- **Crash hisobotlar** — plaginlar yuboradi (`POST /api/crashes`), admin hal qilindi/e'tiborsiz/o'chirish qiladi
- **Plaginlar reyestri** — CRUD + versiya nashr qilish (`POST /api/plugin/:name/version`) — avtomatik yangilanish uchun
- **Mijozlar, harakatlar jurnali, analitika** (30 kunlik / 12 oylik grafiklar, top plaginlar, holat taqsimoti), xavfsizlik hodisalari, bildirishnomalar, sozlamalar
- **Admin panel (`public/`)** — login (Basic Auth), qorong'u rejim, moslashuvchan sidebar, API hujjat sahifasi
- **Deployga tayyor** — `Dockerfile` (multi-stage, non-root, healthcheck), `fly.toml` + SQLite saqlanishi uchun volume
- **Env orqali sozlash** — `PORT`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`, `DB_PATH` — `config.json` ni bekor qiladi

## Loyiha tuzilmasi

```
.
├── server.js            # Express API + SQLite sxema + statik hosting
├── public/              # Admin panel (index.html, css/, js/ va js/pages/*)
├── config.example.json  # Lokal dev uchun config.json ga nusxalang
├── .env.example         # Env o'zgaruvchilar (production uchun tavsiya)
├── Dockerfile           # Fly.io / Docker deploy (8080 port, /data volume)
├── fly.toml             # Fly.io app konfiguratsiyasi
├── fly-deployment/      # Fly.io bo'yicha bosqichma-bosqich qo'llanma
├── start.sh             # Lokal ishga tushirish yordamchisi (./start.sh [port])
└── package.json
```

Ma'lumotlar bazasi jadvallari (avtomatik yaratiladi): `licenses`, `verification_log`, `admins`, `plugins`, `plugin_versions`, `activity_log`, `notifications`, `server_sessions`, `crash_reports`, `security_events`, `settings`, `customers`.

## Tezkor boshlash (lokal)

Talab: Node.js 20+.

```bash
# 1. O'rnatish
npm install

# 2. Sozlash (BITTASINI tanlang)
cp config.example.json config.json        # keyin adminPassword / jwtSecret ni tahrirlang
# ...yoki env o'zgaruvchilar (tavsiya etiladi):
# cp .env.example .env  (keyin export qiling yoki shell/host da o'rnating)

# 3. Ishga tushirish
npm start
# yoki: ./start.sh 3001
# yoki:  PORT=3001 ADMIN_USERNAME=admin ADMIN_PASSWORD=secret JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") node server.js
```

Ochish: `http://localhost:3001` (panel) · `http://localhost:3001/api/health` (holat tekshiruvi).

> Birinchi ishga tushirishda standart admin `ADMIN_USERNAME`/`ADMIN_PASSWORD` dan yaratiladi (SQLite da bcrypt bilan xeshlanadi). Parolni panel → Sozlamalar orqali o'zgartiring.

## Konfiguratsiya

| Manba | Kalit | Standart | Izoh |
|---|---|---|---|
| env `PORT` / `config.port` | port | `3001` | Fly.io Dockerfile orqali `8080` beradi |
| env `ADMIN_USERNAME` / `config.adminUsername` | admin login | `admin` | |
| env `ADMIN_PASSWORD` / `config.adminPassword` | admin parol | `admin123` ⚠️ | **Production da o'zgartirish shart** |
| env `JWT_SECRET` / `config.jwtSecret` | HWID xesh tuzi | ichki standart ⚠️ | **Production da o'zgartirish shart** |
| env `DB_PATH` | sqlite yo'li | `./licenses.db` | Fly.io da: `/data/licenses.db` |
| `config.licenseKeyPrefix` | kalit prefiksi | `EPIC` | masalan `EPIC-A1B2-...` |

## API ma'lumotnoma

Admin endpointlar Basic Auth talab qiladi: `Authorization: Basic base64(username:password)`.

### Ommaviy (plaginlar chaqiradi)

**`POST /api/verify`** — litsenziyani tekshirish:
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
Muvaffaqiyatli → `{ "success": true, "message": "...", "data": { "pluginName", "pluginVersion", "expiresAt", "maxServers" } }`.

**`POST /api/servers/heartbeat`** — `{ licenseKey, serverName, pluginName, pluginVersion, hwid, players, country }`

**`POST /api/crashes`** — `{ pluginName, pluginVersion, javaVersion, serverVersion, errorMessage, stacktrace, owner }`

**`GET /api/health`** — `{ success, status, timestamp, version }`

### Admin (Basic Auth)

| Metod | Endpoint | Tavsif |
|---|---|---|
| POST | `/api/register` | Litsenziya yaratish (`pluginName`, `pluginVersion`, `ownerDiscord`, `ownerEmail`, `maxServers`, `expiresInDays`, `notes`) |
| GET | `/api/list?status&pluginName&search&sortBy&sortOrder&page&limit` | Litsenziyalar ro'yxati |
| GET | `/api/license/:key` | Litsenziya tafsiloti + tekshirish jurnali + IP tarixi |
| PUT | `/api/license/:key` | Yangilash (`pluginVersion`, `ownerDiscord/Email/Telegram`, `maxServers`, `expiresAt`, `notes`) |
| DELETE | `/api/license/:key` | O'chirish |
| POST | `/api/license/:key/reset-hwid` | HWID bog'lanishni yechish |
| POST | `/api/license/:key/copy` | Litsenziyani dublikatlash (yangi kalit) |
| POST | `/api/revoke` / `/api/activate` | `{ licenseKey }` |
| GET/POST/PUT/DELETE | `/api/plugins`, `/api/plugins/:name` | Plaginlar reyestri |
| GET/POST | `/api/plugin/:name/versions`, `/api/plugin/:name/version` | Versiya nashr qilish (avto-yangilanish) |
| GET | `/api/servers/online`, `/api/servers/all` | Server sessiyalari |
| GET/POST | `/api/customers`, `/api/customers/:id` | Mijozlar |
| GET | `/api/activity`, `/api/activity/stats` | Jurnallar + grafik ma'lumotlar |
| GET | `/api/logs/export?format=csv` | Jurnallarni eksport qilish |
| GET | `/api/security` | Muvaffaqiyatsiz urinishlar, HWID nomuvofiqliklar, hodisalar |
| GET/POST | `/api/notifications`, `/api/notifications/read`, `/api/notifications/clear` | Bildirishnomalar |
| GET/POST | `/api/settings` | `{ settings: {...} }` |
| POST | `/api/change-password` | `{ currentPassword, newPassword }` |
| GET | `/api/stats`, `/api/dashboard/recent` | Panel statistikasi |

To'liq interaktiv ma'lumotnoma panel ichida → **API Docs** sahifasida ham bor.

### Minecraft plagin integratsiyasi (Java misol)

```java
// HWID yasang (server sxemasiga mos bo'lishi shart) va POST /api/verify qiling
String url = "https://your-server.fly.dev/api/verify";
String json = new Gson().toJson(Map.of(
  "licenseKey", getConfig().getString("license-key"),
  "hwid", computeHwid(), // SHA-256 yoki barqaror server barmoq izi
  "serverId", getServer().getServerId(),
  "serverIp", getServer().getIp(),
  "serverPort", getServer().getPort(),
  "pluginName", "EpicTools",
  "pluginVersion", getDescription().getVersion()
));
// POST json, { success, message, data } ni parse qiling. Natijani keshlang, oraliqda qayta tekshiring.
// Ishlash davomida davriy POST /api/servers/heartbeat yuboring.
// Tutib bo'lmaydigan xatolarda POST /api/crashes yuboring.
```

## Deploy (Fly.io)

To'liq qo'llanma: [`fly-deployment/README.md`](fly-deployment/README.md). Qisqacha:

```bash
fly launch --no-deploy
fly secrets set ADMIN_PASSWORD=... JWT_SECRET=$(openssl rand -hex 32)
fly volumes create license_data --region ams --size 1
fly deploy
curl https://<app>.fly.dev/api/health
```

Eslatma: SQLite persistent volume da yashaydi (`/data/licenses.db`); volume siz qayta ishga tushganda ma'lumot yo'qoladi. Bepul tarif uchun `min_machines_running = 0` qoldiring. Zaxira: `fly ssh sftp get /data/licenses.db`.

## Xavfsizlik eslatmalari

- Ommaga ochishdan oldin `ADMIN_PASSWORD` va `JWT_SECRET` ni o'zgartiring (standart qiymatda server ogohlantirish log yozadi).
- Admin API Basic Auth ishlatadi — doim HTTPS ortida ishlating (Fly.io `force_https = true` allaqachon yoqilgan).
- `licenses.db*` va `config.json` git-ignore qilingan; real parol yoki production bazani hech qachon commit qilmang.
- Muvaffaqiyatsiz tekshirishlar / noto'g'ri kalitlar / HWID nomuvofiqliklar `security_events` ga yoziladi — panel → Xavfsizlik bo'limida ko'ring.

## Litsenziya

PolyForm Noncommercial 1.0.0 — qarang [LICENSE](LICENSE).

Bu loyihadan faqat **notijorat maqsadlarda** foydalanish, o'zgartirish va ulashish mumkin.
Tijorat maqsadida foydalanish — dasturni yoki o'zgartirilgan versiyalarni sotish ham — taqiqlangan.
