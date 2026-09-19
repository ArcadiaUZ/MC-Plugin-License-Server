const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const config = require('./config.json');

// ============ ENVIRONMENT OVERRIDES ============
// Allow environment variables to override config.json values
// This is essential for Fly.io and other cloud deployments
const PORT = process.env.PORT ? parseInt(process.env.PORT) : (config.port || 3001);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || config.adminUsername || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || config.adminPassword || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || config.jwtSecret || 'epicserver-default-jwt-secret-2026';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'licenses.db');

// Log warning if using default credentials (not recommended for production)
if (!process.env.ADMIN_PASSWORD && !config.adminPassword) {
    console.warn('[LicenseServer] WARNING: Using default admin password (admin123). Set ADMIN_PASSWORD env var for security.');
}

if (!process.env.JWT_SECRET && !config.jwtSecret) {
    console.warn('[LicenseServer] WARNING: Using default JWT secret. Set JWT_SECRET env var for security.');
}

// Initialize database
let db;
try {
    db = require('better-sqlite3')(DB_PATH);
    db.pragma('journal_mode = WAL');
    console.log(`[LicenseServer] Database initialized at: ${DB_PATH}`);
} catch (e) {
    console.error('[LicenseServer] Failed to initialize database:', e.message);
    process.exit(1);
}

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS licenses (
        id TEXT PRIMARY KEY,
        license_key TEXT UNIQUE NOT NULL,
        plugin_name TEXT NOT NULL,
        plugin_version TEXT NOT NULL DEFAULT '1.0.0',
        hwid TEXT DEFAULT '',
        owner_discord TEXT DEFAULT '',
        owner_email TEXT DEFAULT '',
        owner_telegram TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        max_servers INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        expires_at INTEGER,
        last_verified INTEGER,
        notes TEXT DEFAULT '',
        revenue REAL DEFAULT 0,
        downloads INTEGER DEFAULT 0
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS verification_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT NOT NULL,
        hwid TEXT DEFAULT '',
        ip TEXT DEFAULT '',
        success INTEGER NOT NULL DEFAULT 0,
        message TEXT DEFAULT '',
        timestamp INTEGER NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    )
`);

// New tables for premium features
db.exec(`
    CREATE TABLE IF NOT EXISTS plugins (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT DEFAULT '',
        description TEXT DEFAULT '',
        icon TEXT DEFAULT '',
        latest_version TEXT DEFAULT '1.0.0',
        status TEXT DEFAULT 'active',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        downloads INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0,
        license_count INTEGER DEFAULT 0
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        plugin TEXT DEFAULT '',
        owner TEXT DEFAULT '',
        ip TEXT DEFAULT '',
        result TEXT DEFAULT 'success',
        details TEXT DEFAULT '',
        timestamp INTEGER NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT DEFAULT '',
        read INTEGER DEFAULT 0,
        timestamp INTEGER NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS server_sessions (
        id TEXT PRIMARY KEY,
        license_key TEXT NOT NULL,
        server_name TEXT DEFAULT '',
        plugin_name TEXT DEFAULT '',
        plugin_version TEXT DEFAULT '',
        hwid TEXT DEFAULT '',
        ip TEXT DEFAULT '',
        country TEXT DEFAULT '',
        players INTEGER DEFAULT 0,
        status TEXT DEFAULT 'online',
        last_seen INTEGER NOT NULL,
        first_seen INTEGER NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS crash_reports (
        id TEXT PRIMARY KEY,
        plugin_name TEXT NOT NULL,
        plugin_version TEXT DEFAULT '',
        java_version TEXT DEFAULT '',
        server_version TEXT DEFAULT '',
        error_message TEXT DEFAULT '',
        stacktrace TEXT DEFAULT '',
        owner TEXT DEFAULT '',
        ip TEXT DEFAULT '',
        status TEXT DEFAULT 'open',
        timestamp INTEGER NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        license_key TEXT DEFAULT '',
        hwid TEXT DEFAULT '',
        ip TEXT DEFAULT '',
        details TEXT DEFAULT '',
        severity TEXT DEFAULT 'low',
        timestamp INTEGER NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT DEFAULT ''
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS plugin_versions (
        id TEXT PRIMARY KEY,
        plugin_name TEXT NOT NULL,
        version TEXT NOT NULL,
        release_notes TEXT DEFAULT '',
        file_path TEXT DEFAULT '',
        published INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        username TEXT DEFAULT '',
        discord TEXT DEFAULT '',
        telegram TEXT DEFAULT '',
        email TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        revenue REAL DEFAULT 0,
        created_at INTEGER NOT NULL
    )
`);

// Insert default admin if not exists
const bcrypt = require('bcryptjs');
const defaultAdmin = db.prepare('SELECT id FROM admins WHERE username = ?').get(ADMIN_USERNAME);
if (!defaultAdmin) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(ADMIN_USERNAME, hash);
    console.log('[LicenseServer] Default admin created');
}

// Insert default settings
const defaultSettings = {
    'theme_color': '#7C3AED',
    'brand_name': 'EpicServer',
    'brand_logo': '',
    'discord_webhook': '',
    'telegram_bot_token': '',
    'maintenance_mode': 'false',
    'auto_backup': 'true',
    'smtp_host': '',
    'smtp_port': '587',
    'smtp_user': '',
    'smtp_pass': ''
};
for (const [key, value] of Object.entries(defaultSettings)) {
    const existing = db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
    if (!existing) {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============ HELPER FUNCTIONS ============

function generateLicenseKey() {
    const prefix = config.licenseKeyPrefix || 'EPIC';
    const segments = [];
    for (let i = 0; i < 4; i++) {
        segments.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return `${prefix}-${segments.join('-')}`;
}

function generateHWIDHash(serverId, serverIp, serverPort, worldSeed) {
    const data = `${serverId}|${serverIp}|${serverPort}|${worldSeed}|${JWT_SECRET}`;
    return crypto.createHash('sha256').update(data).digest('hex');
}

function authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    const base64 = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');
    
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    req.admin = admin;
    next();
}

function logVerification(licenseKey, hwid, ip, success, message) {
    db.prepare('INSERT INTO verification_log (license_key, hwid, ip, success, message, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
        .run(licenseKey, hwid || '', ip || '', success ? 1 : 0, message, Date.now());
}

function logActivity(action, plugin, owner, ip, result, details) {
    db.prepare('INSERT INTO activity_log (action, plugin, owner, ip, result, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(action, plugin || '', owner || '', ip || '', result || 'success', details || '', Date.now());
}

function createNotification(type, title, message) {
    db.prepare('INSERT INTO notifications (type, title, message, timestamp) VALUES (?, ?, ?, ?)')
        .run(type, title, message || '', Date.now());
}

// ============ EXISTING API ENDPOINTS (PRESERVED) ============

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        status: 'running', 
        timestamp: Date.now(),
        version: '1.0.0'
    });
});

// Register a new license (admin only)
app.post('/api/register', authenticateAdmin, (req, res) => {
    try {
        const { pluginName, pluginVersion, ownerDiscord, ownerEmail, maxServers, expiresInDays, notes } = req.body;
        
        if (!pluginName) {
            return res.status(400).json({ success: false, message: 'pluginName is required' });
        }
        
        const licenseKey = generateLicenseKey();
        const id = crypto.randomUUID();
        const createdAt = Date.now();
        const expiresAt = expiresInDays ? createdAt + (expiresInDays * 86400000) : null;
        
        db.prepare(`INSERT INTO licenses (id, license_key, plugin_name, plugin_version, owner_discord, owner_email, max_servers, created_at, expires_at, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`)
            .run(id, licenseKey, pluginName, pluginVersion || '1.0.0', ownerDiscord || '', ownerEmail || '', maxServers || 1, createdAt, expiresAt, notes || '');
        
        // Update plugin license count
        const plugin = db.prepare('SELECT id FROM plugins WHERE name = ?').get(pluginName);
        if (plugin) {
            db.prepare('UPDATE plugins SET license_count = license_count + 1, updated_at = ? WHERE name = ?').run(Date.now(), pluginName);
        }
        
        logActivity('license_created', pluginName, ownerDiscord, req.ip, 'success', `License ${licenseKey} created`);
        createNotification('success', 'License Created', `License for ${pluginName} created successfully`);
        
        res.json({
            success: true,
            message: 'License created successfully',
            license: {
                id,
                licenseKey,
                pluginName: pluginName,
                pluginVersion: pluginVersion || '1.0.0',
                ownerDiscord: ownerDiscord || '',
                ownerEmail: ownerEmail || '',
                maxServers: maxServers || 1,
                createdAt,
                expiresAt,
                status: 'active'
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Verify a license (called by plugins)
app.post('/api/verify', (req, res) => {
    try {
        const { licenseKey, hwid, serverId, serverIp, serverPort, worldSeed, pluginName, pluginVersion } = req.body;
        
        if (!licenseKey) {
            return res.status(400).json({ success: false, message: 'licenseKey is required' });
        }
        
        // Find license
        const license = db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(licenseKey);
        
        if (!license) {
            logVerification(licenseKey, hwid || '', req.ip, false, 'License key not found');
            db.prepare('INSERT INTO security_events (event_type, license_key, hwid, ip, details, severity, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .run('invalid_license', licenseKey, hwid || '', req.ip || '', 'License key not found', 'high', Date.now());
            return res.json({ success: false, message: 'Invalid license key' });
        }
        
        // Check if license is active
        if (license.status !== 'active') {
            logVerification(licenseKey, hwid || '', req.ip, false, `License status: ${license.status}`);
            db.prepare('INSERT INTO security_events (event_type, license_key, hwid, ip, details, severity, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .run('failed_verification', licenseKey, hwid || '', req.ip || '', `License status: ${license.status}`, 'medium', Date.now());
            return res.json({ success: false, message: `License is ${license.status}` });
        }
        
        // Check if license has expired
        if (license.expires_at && Date.now() > license.expires_at) {
            db.prepare('UPDATE licenses SET status = ? WHERE id = ?').run('expired', license.id);
            logVerification(licenseKey, hwid || '', req.ip, false, 'License expired');
            return res.json({ success: false, message: 'License has expired' });
        }
        
        // Check plugin name if provided
        if (pluginName && license.plugin_name !== pluginName) {
            logVerification(licenseKey, hwid || '', req.ip, false, `Plugin mismatch: expected ${license.plugin_name}, got ${pluginName}`);
            return res.json({ success: false, message: 'License is not valid for this plugin' });
        }
        
        // HWID binding check
        if (hwid) {
            if (license.hwid && license.hwid !== '') {
                // License is already bound to a HWID
                if (license.hwid !== hwid) {
                    logVerification(licenseKey, hwid, req.ip, false, 'HWID mismatch');
                    db.prepare('INSERT INTO security_events (event_type, license_key, hwid, ip, details, severity, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
                        .run('hwid_mismatch', licenseKey, hwid, req.ip || '', 'HWID mismatch', 'high', Date.now());
                    return res.json({ success: false, message: 'License is already bound to another server' });
                }
            } else {
                // First verification - bind HWID
                db.prepare('UPDATE licenses SET hwid = ? WHERE id = ?').run(hwid, license.id);
            }
        } else if (serverId && serverIp && serverPort) {
            // Generate HWID from server info
            const generatedHwid = generateHWIDHash(serverId, serverIp, serverPort, worldSeed || '');
            
            if (license.hwid && license.hwid !== '') {
                if (license.hwid !== generatedHwid) {
                    logVerification(licenseKey, generatedHwid, req.ip, false, 'HWID mismatch (generated)');
                    return res.json({ success: false, message: 'License is already bound to another server' });
                }
            } else {
                db.prepare('UPDATE licenses SET hwid = ? WHERE id = ?').run(generatedHwid, license.id);
            }
        }
        
        // Update last verified
        db.prepare('UPDATE licenses SET last_verified = ? WHERE id = ?').run(Date.now(), license.id);
        
        logVerification(licenseKey, hwid || '', req.ip, true, 'Verification successful');
        
        // Update server session
        if (serverId) {
            const existingSession = db.prepare('SELECT id FROM server_sessions WHERE license_key = ? AND hwid = ?').get(licenseKey, hwid || generatedHwid || '');
            if (existingSession) {
                db.prepare('UPDATE server_sessions SET last_seen = ?, status = ?, ip = ?, plugin_version = ? WHERE id = ?')
                    .run(Date.now(), 'online', req.ip || '', pluginVersion || '', existingSession.id);
            } else {
                db.prepare('INSERT INTO server_sessions (id, license_key, server_name, plugin_name, plugin_version, hwid, ip, status, last_seen, first_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                    .run(crypto.randomUUID(), licenseKey, serverId || '', pluginName || license.plugin_name, pluginVersion || license.plugin_version, hwid || generatedHwid || '', req.ip || '', 'online', Date.now(), Date.now());
            }
        }
        
        res.json({
            success: true,
            message: 'License verified successfully',
            data: {
                pluginName: license.plugin_name,
                pluginVersion: license.plugin_version,
                expiresAt: license.expires_at,
                maxServers: license.max_servers
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Revoke a license (admin only)
app.post('/api/revoke', authenticateAdmin, (req, res) => {
    try {
        const { licenseKey } = req.body;
        
        if (!licenseKey) {
            return res.status(400).json({ success: false, message: 'licenseKey is required' });
        }
        
        const license = db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(licenseKey);
        if (!license) {
            return res.status(404).json({ success: false, message: 'License not found' });
        }
        
        const result = db.prepare('UPDATE licenses SET status = ? WHERE license_key = ?').run('revoked', licenseKey);
        
        logActivity('license_revoked', license.plugin_name, license.owner_discord, req.ip, 'success', `License ${licenseKey} revoked`);
        createNotification('warning', 'License Revoked', `License ${licenseKey} for ${license.plugin_name} was revoked`);
        
        res.json({ success: true, message: 'License revoked successfully' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Activate a license (admin only)
app.post('/api/activate', authenticateAdmin, (req, res) => {
    try {
        const { licenseKey } = req.body;
        
        if (!licenseKey) {
            return res.status(400).json({ success: false, message: 'licenseKey is required' });
        }
        
        const license = db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(licenseKey);
        if (!license) {
            return res.status(404).json({ success: false, message: 'License not found' });
        }
        
        const result = db.prepare('UPDATE licenses SET status = ? WHERE license_key = ?').run('active', licenseKey);
        
        logActivity('license_activated', license.plugin_name, license.owner_discord, req.ip, 'success', `License ${licenseKey} activated`);
        
        res.json({ success: true, message: 'License activated successfully' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// List all licenses (admin only)
app.get('/api/list', authenticateAdmin, (req, res) => {
    try {
        const { status, pluginName, search, sortBy, sortOrder, page, limit } = req.query;
        let query = 'SELECT * FROM licenses';
        const params = [];
        const conditions = [];
        
        if (status) {
            conditions.push('status = ?');
            params.push(status);
        }
        if (pluginName) {
            conditions.push('plugin_name = ?');
            params.push(pluginName);
        }
        if (search) {
            conditions.push('(license_key LIKE ? OR owner_discord LIKE ? OR owner_email LIKE ? OR owner_telegram LIKE ?)');
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        // Sorting
        const allowedSorts = ['created_at', 'license_key', 'plugin_name', 'status', 'expires_at', 'last_verified'];
        const sortCol = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
        const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortCol} ${order}`;
        
        // Pagination
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const offset = (pageNum - 1) * limitNum;
        
        const total = db.prepare(query.replace('SELECT *', 'SELECT COUNT(*) as count')).get(...params);
        query += ` LIMIT ? OFFSET ?`;
        params.push(limitNum, offset);
        
        const licenses = db.prepare(query).all(...params);
        res.json({ success: true, licenses, total: total.count, page: pageNum, limit: limitNum });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get license details
app.get('/api/license/:key', authenticateAdmin, (req, res) => {
    try {
        const license = db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(req.params.key);
        if (!license) {
            return res.status(404).json({ success: false, message: 'License not found' });
        }
        
        const logs = db.prepare('SELECT * FROM verification_log WHERE license_key = ? ORDER BY timestamp DESC LIMIT 50').all(req.params.key);
        const ipHistory = db.prepare('SELECT DISTINCT ip, timestamp FROM verification_log WHERE license_key = ? AND ip != "" ORDER BY timestamp DESC LIMIT 20').all(req.params.key);
        
        res.json({ success: true, license, logs, ipHistory });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Delete a license (admin only)
app.delete('/api/license/:key', authenticateAdmin, (req, res) => {
    try {
        const license = db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(req.params.key);
        if (!license) {
            return res.status(404).json({ success: false, message: 'License not found' });
        }
        db.prepare('DELETE FROM licenses WHERE license_key = ?').run(req.params.key);
        logActivity('license_deleted', license.plugin_name, license.owner_discord, req.ip, 'success', `License ${req.params.key} deleted`);
        res.json({ success: true, message: 'License deleted' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Change admin password
app.post('/api/change-password', authenticateAdmin, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
        }
        
        if (!bcrypt.compareSync(currentPassword, req.admin.password_hash)) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }
        
        const hash = bcrypt.hashSync(newPassword, 10);
        db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, req.admin.id);
        
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get statistics
app.get('/api/stats', authenticateAdmin, (req, res) => {
    try {
        const totalLicenses = db.prepare('SELECT COUNT(*) as count FROM licenses').get();
        const activeLicenses = db.prepare("SELECT COUNT(*) as count FROM licenses WHERE status = 'active'").get();
        const revokedLicenses = db.prepare("SELECT COUNT(*) as count FROM licenses WHERE status = 'revoked'").get();
        const expiredLicenses = db.prepare("SELECT COUNT(*) as count FROM licenses WHERE status = 'expired'").get();
        const totalVerifications = db.prepare('SELECT COUNT(*) as count FROM verification_log').get();
        const successfulVerifications = db.prepare('SELECT COUNT(*) as count FROM verification_log WHERE success = 1').get();
        const failedVerifications = db.prepare('SELECT COUNT(*) as count FROM verification_log WHERE success = 0').get();
        const onlineServers = db.prepare("SELECT COUNT(*) as count FROM server_sessions WHERE status = 'online'").get();
        const todayVerifications = db.prepare('SELECT COUNT(*) as count FROM verification_log WHERE timestamp > ?').get(Date.now() - 86400000);
        const totalRevenue = db.prepare('SELECT SUM(revenue) as total FROM licenses').get();
        const totalDownloads = db.prepare('SELECT SUM(downloads) as total FROM licenses').get();
        
        res.json({
            success: true,
            stats: {
                total: totalLicenses.count,
                active: activeLicenses.count,
                revoked: revokedLicenses.count,
                expired: expiredLicenses.count,
                totalVerifications: totalVerifications.count,
                successfulVerifications: successfulVerifications.count,
                failedVerifications: failedVerifications.count,
                onlineServers: onlineServers.count,
                todayVerifications: todayVerifications.count,
                totalRevenue: totalRevenue.total || 0,
                totalDownloads: totalDownloads.total || 0
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ============ NEW API ENDPOINTS ============

// Reset HWID
app.post('/api/license/:key/reset-hwid', authenticateAdmin, (req, res) => {
    try {
        const license = db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(req.params.key);
        if (!license) return res.status(404).json({ success: false, message: 'License not found' });
        
        db.prepare('UPDATE licenses SET hwid = ? WHERE license_key = ?').run('', req.params.key);
        logActivity('hwid_reset', license.plugin_name, license.owner_discord, req.ip, 'success', `HWID reset for ${req.params.key}`);
        createNotification('info', 'HWID Reset', `HWID was reset for license ${req.params.key}`);
        
        res.json({ success: true, message: 'HWID reset successfully' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Copy license (duplicate)
app.post('/api/license/:key/copy', authenticateAdmin, (req, res) => {
    try {
        const original = db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(req.params.key);
        if (!original) return res.status(404).json({ success: false, message: 'License not found' });
        
        const newKey = generateLicenseKey();
        const id = crypto.randomUUID();
        const now = Date.now();
        
        db.prepare(`INSERT INTO licenses (id, license_key, plugin_name, plugin_version, owner_discord, owner_email, max_servers, created_at, expires_at, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`)
            .run(id, newKey, original.plugin_name, original.plugin_version, original.owner_discord, original.owner_email, original.max_servers, now, original.expires_at, original.notes);
        
        logActivity('license_copied', original.plugin_name, original.owner_discord, req.ip, 'success', `License ${newKey} copied from ${req.params.key}`);
        
        res.json({ success: true, message: 'License copied', licenseKey: newKey });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Update license
app.put('/api/license/:key', authenticateAdmin, (req, res) => {
    try {
        const { pluginVersion, ownerDiscord, ownerEmail, ownerTelegram, maxServers, expiresAt, notes } = req.body;
        const license = db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(req.params.key);
        if (!license) return res.status(404).json({ success: false, message: 'License not found' });
        
        const updates = [];
        const params = [];
        
        if (pluginVersion !== undefined) { updates.push('plugin_version = ?'); params.push(pluginVersion); }
        if (ownerDiscord !== undefined) { updates.push('owner_discord = ?'); params.push(ownerDiscord); }
        if (ownerEmail !== undefined) { updates.push('owner_email = ?'); params.push(ownerEmail); }
        if (ownerTelegram !== undefined) { updates.push('owner_telegram = ?'); params.push(ownerTelegram); }
        if (maxServers !== undefined) { updates.push('max_servers = ?'); params.push(maxServers); }
        if (expiresAt !== undefined) { updates.push('expires_at = ?'); params.push(expiresAt); }
        if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
        
        if (updates.length > 0) {
            params.push(req.params.key);
            db.prepare(`UPDATE licenses SET ${updates.join(', ')} WHERE license_key = ?`).run(...params);
            logActivity('license_updated', license.plugin_name, license.owner_discord, req.ip, 'success', `License ${req.params.key} updated`);
        }
        
        res.json({ success: true, message: 'License updated' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ============ PLUGINS ============

app.get('/api/plugins', authenticateAdmin, (req, res) => {
    try {
        const plugins = db.prepare('SELECT * FROM plugins ORDER BY name ASC').all();
        res.json({ success: true, plugins });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get('/api/plugins/:name', authenticateAdmin, (req, res) => {
    try {
        const plugin = db.prepare('SELECT * FROM plugins WHERE name = ?').get(req.params.name);
        if (!plugin) return res.status(404).json({ success: false, message: 'Plugin not found' });
        
        const licenses = db.prepare('SELECT COUNT(*) as count FROM licenses WHERE plugin_name = ?').get(req.params.name);
        const activeLicenses = db.prepare("SELECT COUNT(*) as count FROM licenses WHERE plugin_name = ? AND status = 'active'").get(req.params.name);
        const versions = db.prepare('SELECT * FROM plugin_versions WHERE plugin_name = ? ORDER BY created_at DESC').all(req.params.name);
        
        res.json({ success: true, plugin: { ...plugin, licenseCount: licenses.count, activeLicenseCount: activeLicenses.count, versions } });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/plugins', authenticateAdmin, (req, res) => {
    try {
        const { name, displayName, description, icon, latestVersion } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'name is required' });
        
        const existing = db.prepare('SELECT id FROM plugins WHERE name = ?').get(name);
        if (existing) return res.status(400).json({ success: false, message: 'Plugin already exists' });
        
        const id = crypto.randomUUID();
        const now = Date.now();
        db.prepare('INSERT INTO plugins (id, name, display_name, description, icon, latest_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(id, name, displayName || name, description || '', icon || '', latestVersion || '1.0.0', now, now);
        
        logActivity('plugin_created', name, '', req.ip, 'success', `Plugin ${name} created`);
        
        res.json({ success: true, message: 'Plugin created', plugin: { id, name } });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.put('/api/plugins/:name', authenticateAdmin, (req, res) => {
    try {
        const { displayName, description, icon, latestVersion, status } = req.body;
        const plugin = db.prepare('SELECT * FROM plugins WHERE name = ?').get(req.params.name);
        if (!plugin) return res.status(404).json({ success: false, message: 'Plugin not found' });
        
        const updates = [];
        const params = [];
        if (displayName !== undefined) { updates.push('display_name = ?'); params.push(displayName); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description); }
        if (icon !== undefined) { updates.push('icon = ?'); params.push(icon); }
        if (latestVersion !== undefined) { updates.push('latest_version = ?'); params.push(latestVersion); }
        if (status !== undefined) { updates.push('status = ?'); params.push(status); }
        updates.push('updated_at = ?'); params.push(Date.now());
        
        if (updates.length > 1) {
            params.push(req.params.name);
            db.prepare(`UPDATE plugins SET ${updates.join(', ')} WHERE name = ?`).run(...params);
        }
        
        res.json({ success: true, message: 'Plugin updated' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.delete('/api/plugins/:name', authenticateAdmin, (req, res) => {
    try {
        db.prepare('DELETE FROM plugins WHERE name = ?').run(req.params.name);
        logActivity('plugin_deleted', req.params.name, '', req.ip, 'success', `Plugin ${req.params.name} deleted`);
        res.json({ success: true, message: 'Plugin deleted' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ============ ACTIVITY / LOGS ============

app.get('/api/activity', authenticateAdmin, (req, res) => {
    try {
        const { action, plugin, result, search, page, limit } = req.query;
        let query = 'SELECT * FROM activity_log';
        const params = [];
        const conditions = [];
        
        if (action) { conditions.push('action = ?'); params.push(action); }
        if (plugin) { conditions.push('plugin = ?'); params.push(plugin); }
        if (result) { conditions.push('result = ?'); params.push(result); }
        if (search) { conditions.push('(action LIKE ? OR plugin LIKE ? OR owner LIKE ? OR ip LIKE ?)'); const s = `%${search}%`; params.push(s, s, s, s); }
        
        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY timestamp DESC';
        
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const offset = (pageNum - 1) * limitNum;
        const total = db.prepare(query.replace('SELECT *', 'SELECT COUNT(*) as count')).get(...params);
        
        params.push(limitNum, offset);
        const logs = db.prepare(query + ' LIMIT ? OFFSET ?').all(...params);
        
        res.json({ success: true, logs, total: total.count, page: pageNum, limit: limitNum });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get('/api/activity/stats', authenticateAdmin, (req, res) => {
    try {
        const now = Date.now();
        const dailyData = [];
        for (let i = 29; i >= 0; i--) {
            const start = now - (i * 86400000);
            const end = start + 86400000;
            const count = db.prepare('SELECT COUNT(*) as count FROM verification_log WHERE timestamp >= ? AND timestamp < ? AND success = 1').get(start, end);
            const failed = db.prepare('SELECT COUNT(*) as count FROM verification_log WHERE timestamp >= ? AND timestamp < ? AND success = 0').get(start, end);
            dailyData.push({
                date: new Date(start).toISOString().split('T')[0],
                success: count.count,
                failed: failed.count
            });
        }
        
        const monthlyData = [];
        for (let i = 11; i >= 0; i--) {
            const start = now - (i * 30 * 86400000);
            const end = start + (30 * 86400000);
            const count = db.prepare('SELECT COUNT(*) as count FROM verification_log WHERE timestamp >= ? AND timestamp < ?').get(start, end);
            monthlyData.push({
                month: new Date(start).toLocaleString('default', { month: 'short', year: 'numeric' }),
                count: count.count
            });
        }
        
        // Top plugins
        const topPlugins = db.prepare("SELECT plugin_name, COUNT(*) as count FROM licenses GROUP BY plugin_name ORDER BY count DESC LIMIT 10").all();
        
        // License distribution
        const statusDist = db.prepare("SELECT status, COUNT(*) as count FROM licenses GROUP BY status").all();
        
        res.json({ success: true, dailyData, monthlyData, topPlugins, statusDist });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ============ SERVERS ============

app.get('/api/servers/online', authenticateAdmin, (req, res) => {
    try {
        const servers = db.prepare("SELECT * FROM server_sessions WHERE status = 'online' ORDER BY last_seen DESC").all();
        res.json({ success: true, servers });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get('/api/servers/all', authenticateAdmin, (req, res) => {
    try {
        const servers = db.prepare('SELECT * FROM server_sessions ORDER BY last_seen DESC').all();
        res.json({ success: true, servers });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/servers/heartbeat', (req, res) => {
    try {
        const { licenseKey, serverName, pluginName, pluginVersion, hwid, players, country } = req.body;
        if (!licenseKey) return res.status(400).json({ success: false, message: 'licenseKey required' });
        
        const existing = db.prepare('SELECT id FROM server_sessions WHERE license_key = ? AND hwid = ?').get(licenseKey, hwid || '');
        if (existing) {
            db.prepare('UPDATE server_sessions SET last_seen = ?, status = ?, players = ?, country = ?, server_name = ?, plugin_version = ? WHERE id = ?')
                .run(Date.now(), 'online', players || 0, country || '', serverName || '', pluginVersion || '', existing.id);
        } else {
            db.prepare('INSERT INTO server_sessions (id, license_key, server_name, plugin_name, plugin_version, hwid, ip, country, players, status, last_seen, first_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .run(crypto.randomUUID(), licenseKey, serverName || '', pluginName || '', pluginVersion || '', hwid || '', req.ip || '', country || '', players || 0, 'online', Date.now(), Date.now());
        }
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ============ NOTIFICATIONS ============

app.get('/api/notifications', authenticateAdmin, (req, res) => {
    try {
        const notifications = db.prepare('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 50').all();
        const unread = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE read = 0').get();
        res.json({ success: true, notifications, unread: unread.count });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/notifications/read', authenticateAdmin, (req, res) => {
    try {
        const { id } = req.body;
        if (id) {
            db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
        } else {
            db.prepare('UPDATE notifications SET read = 1').run();
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/notifications/clear', authenticateAdmin, (req, res) => {
    try {
        db.prepare('DELETE FROM notifications').run();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ============ CUSTOMERS ============

app.get('/api/customers', authenticateAdmin, (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT * FROM customers';
        const params = [];
        if (search) {
            query += ' WHERE (username LIKE ? OR discord LIKE ? OR telegram LIKE ? OR email LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }
        query += ' ORDER BY created_at DESC';
        const customers = db.prepare(query).all(...params);
        
        // Enrich with license data
        const enriched = customers.map(c => {
            const licenses = db.prepare('SELECT * FROM licenses WHERE owner_discord = ? OR owner_email = ?').all(c.discord, c.email);
            const totalRevenue = licenses.reduce((sum, l) => sum + (l.revenue || 0), 0);
            return { ...c, licenses, totalRevenue, licenseCount: licenses.length };
        });
        
        res.json({ success: true, customers: enriched });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get('/api/customers/:id', authenticateAdmin, (req, res) => {
    try {
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
        if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
        
        const licenses = db.prepare('SELECT * FROM licenses WHERE owner_discord = ? OR owner_email = ? ORDER BY created_at DESC').all(customer.discord, customer.email);
        const activity = db.prepare("SELECT * FROM activity_log WHERE owner = ? OR owner = ? ORDER BY timestamp DESC LIMIT 20").all(customer.discord, customer.username);
        
        res.json({ success: true, customer: { ...customer, licenses, activity } });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/customers', authenticateAdmin, (req, res) => {
    try {
        const { username, discord, telegram, email, notes } = req.body;
        const id = crypto.randomUUID();
        db.prepare('INSERT INTO customers (id, username, discord, telegram, email, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(id, username || '', discord || '', telegram || '', email || '', notes || '', Date.now());
        res.json({ success: true, message: 'Customer created', customer: { id } });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ============ SETTINGS ============

app.get('/api/settings', authenticateAdmin, (req, res) => {
    try {
        const settings = db.prepare('SELECT * FROM settings').all();
        const result = {};
        settings.forEach(s => result[s.key] = s.value);
        res.json({ success: true, settings: result });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/settings', authenticateAdmin, (req, res) => {
    try {
        const { settings } = req.body;
        if (!settings) return res.status(400).json({ success: false, message: 'settings required' });
        
        for (const [key, value] of Object.entries(settings)) {
            db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
        }
        
        logActivity('settings_updated', '', '', req.ip, 'success', 'Settings updated');
        res.json({ success: true, message: 'Settings saved' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ============ CRASH REPORTS ============

app.get('/api/crashes', authenticateAdmin, (req, res) => {
    try {
        const { status, plugin, page, limit } = req.query;
        let query = 'SELECT * FROM crash_reports';
        const params = [];
        const conditions = [];
        
        if (status) { conditions.push('status = ?'); params.push(status); }
        if (plugin) { conditions.push('plugin_name = ?'); params.push(plugin); }
        
        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY timestamp DESC';
        
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const offset = (pageNum - 1) * limitNum;
        const total = db.prepare(query.replace('SELECT *', 'SELECT COUNT(*) as count')).get(...params);
        
        params.push(limitNum, offset);
        const crashes = db.prepare(query + ' LIMIT ? OFFSET ?').all(...params);
        
        res.json({ success: true, crashes, total: total.count, page: pageNum, limit: limitNum });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/crashes', (req, res) => {
    try {
        const { pluginName, pluginVersion, javaVersion, serverVersion, errorMessage, stacktrace, owner } = req.body;
        if (!pluginName || !errorMessage) return res.status(400).json({ success: false, message: 'pluginName and errorMessage required' });
        
        const id = crypto.randomUUID();
        db.prepare('INSERT INTO crash_reports (id, plugin_name, plugin_version, java_version, server_version, error_message, stacktrace, owner, ip, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(id, pluginName, pluginVersion || '', javaVersion || '', serverVersion || '', errorMessage, stacktrace || '', owner || '', req.ip || '', 'open', Date.now());
        
        createNotification('error', 'Crash Report', `${pluginName} v${pluginVersion} crashed: ${errorMessage.substring(0, 100)}`);
        
        res.json({ success: true, message: 'Crash report submitted', id });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/crashes/:id/resolve', authenticateAdmin, (req, res) => {
    try {
        db.prepare("UPDATE crash_reports SET status = 'resolved' WHERE id = ?").run(req.params.id);
        res.json({ success: true, message: 'Crash resolved' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/crashes/:id/ignore', authenticateAdmin, (req, res) => {
    try {
        db.prepare("UPDATE crash_reports SET status = 'ignored' WHERE id = ?").run(req.params.id);
        res.json({ success: true, message: 'Crash ignored' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.delete('/api/crashes/:id', authenticateAdmin, (req, res) => {
    try {
        db.prepare('DELETE FROM crash_reports WHERE id = ?').run(req.params.id);
        res.json({ success: true, message: 'Crash deleted' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ============ SECURITY ============

app.get('/api/security', authenticateAdmin, (req, res) => {
    try {
        const failedAttempts = db.prepare('SELECT COUNT(*) as count FROM verification_log WHERE success = 0').get();
        const failedToday = db.prepare('SELECT COUNT(*) as count FROM verification_log WHERE success = 0 AND timestamp > ?').get(Date.now() - 86400000);
        const invalidLicenses = db.prepare("SELECT COUNT(*) as count FROM security_events WHERE event_type = 'invalid_license'").get();
        const hwidMismatches = db.prepare("SELECT COUNT(*) as count FROM security_events WHERE event_type = 'hwid_mismatch'").get();
        const blockedIps = db.prepare("SELECT COUNT(DISTINCT ip) as count FROM security_events WHERE severity = 'high'").get();
        
        const recentEvents = db.prepare('SELECT * FROM security_events ORDER BY timestamp DESC LIMIT 50').all();
        
        res.json({
            success: true,
            stats: {
                failedAttempts: failedAttempts.count,
                failedToday: failedToday.count,
                invalidLicenses: invalidLicenses.count,
                hwidMismatches: hwidMismatches.count,
                blockedIps: blockedIps.count
            },
            events: recentEvents
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ============ PLUGIN VERSIONS (AUTO UPDATE) ============

app.get('/api/plugin/:name/versions', authenticateAdmin, (req, res) => {
    try {
        const versions = db.prepare('SELECT * FROM plugin_versions WHERE plugin_name = ? ORDER BY created_at DESC').all(req.params.name);
        res.json({ success: true, versions });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/plugin/:name/version', authenticateAdmin, (req, res) => {
    try {
        const { version, releaseNotes, fileData } = req.body;
        if (!version) return res.status(400).json({ success: false, message: 'version required' });
        
        const id = crypto.randomUUID();
        const filePath = fileData ? `uploads/${req.params.name}_${version}.jar` : '';
        
        db.prepare('INSERT INTO plugin_versions (id, plugin_name, version, release_notes, file_path, published, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(id, req.params.name, version, releaseNotes || '', filePath, 1, Date.now());
        
        // Update plugin latest version
        db.prepare('UPDATE plugins SET latest_version = ?, updated_at = ? WHERE name = ?').run(version, Date.now(), req.params.name);
        
        logActivity('version_published', req.params.name, '', req.ip, 'success', `Version ${version} published`);
        createNotification('info', 'New Version', `${req.params.name} v${version} published`);
        
        res.json({ success: true, message: 'Version published', id });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ============ EXPORT LOGS ============

app.get('/api/logs/export', authenticateAdmin, (req, res) => {
    try {
        const { format } = req.query;
        const logs = db.prepare('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 1000').all();
        
        if (format === 'csv') {
            let csv = 'Timestamp,Action,Plugin,Owner,IP,Result,Details\n';
            logs.forEach(l => {
                csv += `${new Date(l.timestamp).toISOString()},${l.action},${l.plugin},${l.owner},${l.ip},${l.result},"${(l.details || '').replace(/"/g, '""')}"\n`;
            });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=logs.csv');
            return res.send(csv);
        }
        
        res.json({ success: true, logs });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ============ DASHBOARD RECENT ACTIVITY ============

app.get('/api/dashboard/recent', authenticateAdmin, (req, res) => {
    try {
        const recentVerifications = db.prepare('SELECT * FROM verification_log ORDER BY timestamp DESC LIMIT 10').all();
        const recentActivity = db.prepare('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 10').all();
        const expiringSoon = db.prepare("SELECT * FROM licenses WHERE expires_at IS NOT NULL AND expires_at > ? AND expires_at < ? AND status = 'active' ORDER BY expires_at ASC LIMIT 5")
            .get(Date.now(), Date.now() + 7 * 86400000);
        
        res.json({ success: true, recentVerifications, recentActivity, expiringSoon });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ============ START SERVER ============

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LicenseServer] Running on port ${PORT}`);
    console.log(`[LicenseServer] Admin panel: http://0.0.0.0:${PORT}`);
    console.log(`[LicenseServer] API: http://0.0.0.0:${PORT}/api`);
});
