# EpicServer License Server - Fly.io Deploy qo'llanma

## 📋 Talablar

- [Fly.io akkaunt](https://fly.io) (Bepul tarif: 3 ta VM, 3GB persistent volume)
- Kompyuteringizda o'rnatilgan [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Git (ixtiyoriy, versiya nazorati uchun)

---

## 🚀 Bosqichma-bosqich deploy

### 1. Fly CLI ni o'rnatish va login

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# macOS / Linux
curl -L https://fly.io/install.sh | sh

# Fly.io ga login
fly auth login
```

### 2. Ilovani yaratish

```bash
# Loyiha papkasiga o'ting
cd "D:\Loyihalar\MC_Loyhalar\SMP Plugins\LicenseServer"

# Yangi Fly.io app yarating (interaktiv)
fly launch --no-deploy
```

So'ralganda:
- **App nomi:** Noyob nom tanlang (masalan `epic-license-server`)
- **Region:** Foydalanuvchilarga eng yaqinini tanlang (masalan Yevropa uchun `ams`, AQSh sharqi uchun `iad`)
- **Postgresql baza kerakmi?** → `No` (biz SQLite ishlatamiz)
- **Hozir deploy qilinsinmi?** → `No` (avval secretlarni o'rnatish kerak)

Bu `fly.toml` fayl yaratadi. **Uni loyihadagi tayyor `fly.toml` bilan almashtiring.**

### 3. Maxfiy muhit o'zgaruvchilari (Secrets)

```bash
# Admin parol (MAJBURIY - kuchli parol qo'ying!)
fly secrets set ADMIN_PASSWORD=JudaKuchliParol123!

# JWT secret (MAJBURIY - tasodifiy satr yarating)
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
# Windows PowerShell da:
# fly secrets set JWT_SECRET="64-belgili-tasodifiy-hex-satr"

# Ixtiyoriy: admin loginni o'zgartirish
fly secrets set ADMIN_USERNAME=admin
```

> ⚠️ **MUHIM:** Bu secretlar shifrlanadi va loglarda ko'rinmaydi.
> Agar `ADMIN_PASSWORD` va `JWT_SECRET` o'rnatilmasa server **ISHGA TUSHMAYDI**.

### 4. SQLite uchun persistent Volume yaratish

```bash
# Tanlangan regionda 1GB "license_data" nomli volume yarating
# "ams" ni o'z regioningizga almashtiring
fly volumes create license_data --region ams --size 1
```

> 💡 **Nega kerak:** SQLite ma'lumotni faylda saqlaydi. Persistent volume bo'lmasa,
> app har qayta ishga tushganda yoki nolga scale bo'lganda baza o'chib ketadi.
> Volume `/data` ga ulanadi, baza `/data/licenses.db` da saqlanadi.

### 5. Deploy qilish

```bash
# Dockerfile orqali deploy
fly deploy
```

### 6. Tekshirish

```bash
# Brauzerda ochish
fly open

# Health endpointni tekshirish
curl https://your-app-name.fly.dev/api/health

# Loglarni ko'rish
fly logs
```

Kutilgan health javobi:
```json
{"success":true,"status":"running","timestamp":...,"version":"1.0.0"}
```

---

## 🔐 Secretlarni boshqarish

### Barcha secretlarni ko'rish
```bash
fly secrets list
```

### Secretni yangilash
```bash
fly secrets set ADMIN_PASSWORD=yangi-parol
# Keyin qayta deploy:
fly deploy
```

### Secretni o'chirish
```bash
fly secrets unset SECRET_NAME
```

---

## 💾 SQLite bazani boshqarish

### Bazani zaxiralash
```bash
# Ishlayotgan mashinaga SSH orqali kiring
fly ssh console

# Konteyner ichida zaxira oling
cp /data/licenses.db /data/licenses.db.backup

# Yoki lokal kompyuterga ko'chiring
fly ssh sftp get /data/licenses.db ./licenses_backup.db
```

### Bazani tiklash
```bash
# Zaxirani yuklang
fly ssh sftp put ./licenses_backup.db /data/licenses.db

# App ni qayta ishga tushiring
fly deploy
```

### Volume holatini tekshirish
```bash
fly volumes list
```

---

## 📊 Kuzatuv (Monitoring)

### Loglarni ko'rish
```bash
# Jonli loglar
fly logs

# So'nggi loglar
fly logs --tail 50
```

### App holati
```bash
fly status
fly info
```

### Scale (kerak bo'lsa)
```bash
# 1 ta mashina (doim ishlaydi)
fly scale count 1

# 0 ga scale (bo'sh turganda avtomatik o'chadi - bepul tarif uchun qulay)
fly scale count 0
```

---

## 🛠 Ko'p uchraydigan muammolar va yechimi

### Muammo: App ishga tushmayapti
```bash
# Loglarni tekshiring
fly logs

# Ko'p uchraydigan sabablar:
# 1. ADMIN_PASSWORD yoki JWT_SECRET o'rnatilmagan
# 2. Volume yaratilmagan
# 3. Port mos emas (Dockerfile 8080 ishlatadi, fly.toml ham mos bo'lishi shart)
```

### Muammo: Qayta ishga tushganda baza tozalanib ketdi
```bash
# Volume borligini tekshiring
fly volumes list

# Bo'lmasa yarating:
fly volumes create license_data --region ams --size 1
```

### Muammo: "Out of memory" xatolari
```bash
# fly.toml da xotirani oshiring:
# [[vm]]
#   size = "shared-cpu-1x"
#   memory = "512mb"
```

---

## 🔄 App ni yangilash

```bash
# Kodni o'zgartirgach:
fly deploy
```

---

## 💰 Bepul tarif limitlari

| Resurs | Bepul limit |
|----------|---------------|
| VM | 3 ta shared VM |
| RAM | Har bir VM ga 256MB |
| Xotira | Jami 3GB |
| Trafik | 160GB/oy |
| Volume | Har bir volume ga 1GB |

Bepul tarifda qolish uchun:
- `min_machines_running = 0` qoldiring (bo'sh turganda avtomatik o'chadi)
- 1GB volume ishlating
- Trafik sarfini kuzatib boring

---

## 🧹 Tozalash (kerak bo'lsa)

```bash
# App va barcha resurslarni o'chirish
fly apps destroy epic-license-server
```
