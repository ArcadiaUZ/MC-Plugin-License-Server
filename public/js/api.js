// EpicServer License Manager - API Client
const API = {
    auth: '',
    baseUrl: '',

    init() {
        const stored = localStorage.getItem('epic_auth');
        if (stored) this.auth = stored;
    },

    encodeAuth(u, p) {
        return btoa(u + ':' + p);
    },

    setAuth(auth) {
        this.auth = auth;
        localStorage.setItem('epic_auth', auth);
    },

    clearAuth() {
        this.auth = '';
        localStorage.removeItem('epic_auth');
    },

    async request(path, options = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (this.auth) headers['Authorization'] = 'Basic ' + this.auth;
        try {
            const res = await fetch(this.baseUrl + path, { ...options, headers });
            const data = await res.json();
            return data;
        } catch (e) {
            return { success: false, message: 'Network error: ' + e.message };
        }
    },

    // Auth
    async login(username, password) {
        const auth = this.encodeAuth(username, password);
        this.setAuth(auth);
        const data = await this.request('/api/stats');
        if (!data.success) {
            this.clearAuth();
        }
        return data;
    },

    logout() {
        this.clearAuth();
    },

    // Stats
    async getStats() { return this.request('/api/stats'); },
    async getRecentActivity() { return this.request('/api/dashboard/recent'); },

    // Licenses
    async listLicenses(params = {}) {
        const q = new URLSearchParams(params).toString();
        return this.request('/api/list?' + q);
    },
    async getLicense(key) { return this.request('/api/license/' + key); },
    async createLicense(data) { return this.request('/api/register', { method: 'POST', body: JSON.stringify(data) }); },
    async revokeLicense(key) { return this.request('/api/revoke', { method: 'POST', body: JSON.stringify({ licenseKey: key }) }); },
    async activateLicense(key) { return this.request('/api/activate', { method: 'POST', body: JSON.stringify({ licenseKey: key }) }); },
    async deleteLicense(key) { return this.request('/api/license/' + key, { method: 'DELETE' }); },
    async resetHwid(key) { return this.request('/api/license/' + key + '/reset-hwid', { method: 'POST' }); },
    async copyLicense(key) { return this.request('/api/license/' + key + '/copy', { method: 'POST' }); },
    async updateLicense(key, data) { return this.request('/api/license/' + key, { method: 'PUT', body: JSON.stringify(data) }); },

    // Plugins
    async listPlugins() { return this.request('/api/plugins'); },
    async getPlugin(name) { return this.request('/api/plugins/' + name); },
    async createPlugin(data) { return this.request('/api/plugins', { method: 'POST', body: JSON.stringify(data) }); },
    async updatePlugin(name, data) { return this.request('/api/plugins/' + name, { method: 'PUT', body: JSON.stringify(data) }); },
    async deletePlugin(name) { return this.request('/api/plugins/' + name, { method: 'DELETE' }); },

    // Activity / Logs
    async getActivity(params = {}) {
        const q = new URLSearchParams(params).toString();
        return this.request('/api/activity?' + q);
    },
    async getActivityStats() { return this.request('/api/activity/stats'); },
    async exportLogs(format) { return this.request('/api/logs/export?format=' + format); },

    // Servers
    async getOnlineServers() { return this.request('/api/servers/online'); },
    async getAllServers() { return this.request('/api/servers/all'); },

    // Notifications
    async getNotifications() { return this.request('/api/notifications'); },
    async markNotificationRead(id) { return this.request('/api/notifications/read', { method: 'POST', body: JSON.stringify({ id }) }); },
    async clearNotifications() { return this.request('/api/notifications/clear', { method: 'POST' }); },

    // Customers
    async listCustomers(params = {}) {
        const q = new URLSearchParams(params).toString();
        return this.request('/api/customers?' + q);
    },
    async getCustomer(id) { return this.request('/api/customers/' + id); },
    async createCustomer(data) { return this.request('/api/customers', { method: 'POST', body: JSON.stringify(data) }); },

    // Settings
    async getSettings() { return this.request('/api/settings'); },
    async saveSettings(settings) { return this.request('/api/settings', { method: 'POST', body: JSON.stringify({ settings }) }); },

    // Crashes
    async listCrashes(params = {}) {
        const q = new URLSearchParams(params).toString();
        return this.request('/api/crashes?' + q);
    },
    async resolveCrash(id) { return this.request('/api/crashes/' + id + '/resolve', { method: 'POST' }); },
    async ignoreCrash(id) { return this.request('/api/crashes/' + id + '/ignore', { method: 'POST' }); },
    async deleteCrash(id) { return this.request('/api/crashes/' + id, { method: 'DELETE' }); },

    // Security
    async getSecurity() { return this.request('/api/security'); },

    // Plugin Versions
    async getPluginVersions(name) { return this.request('/api/plugin/' + name + '/versions'); },
    async publishVersion(name, data) { return this.request('/api/plugin/' + name + '/version', { method: 'POST', body: JSON.stringify(data) }); },

    // Password
    async changePassword(current, newP) {
        return this.request('/api/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: current, newPassword: newP }) });
    },

    // Health
    async health() { return this.request('/api/health'); }
};

API.init();