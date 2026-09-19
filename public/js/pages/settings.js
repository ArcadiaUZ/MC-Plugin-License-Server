// Settings Page
const SettingsPage = {
    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div style="font-size:18px;font-weight:600;margin-bottom:20px;">Settings</div>
            <div class="tabs">
                <button class="tab active" data-tab="general" onclick="SettingsPage.switchTab('general')">General</button>
                <button class="tab" data-tab="branding" onclick="SettingsPage.switchTab('branding')">Branding</button>
                <button class="tab" data-tab="notifications" onclick="SettingsPage.switchTab('notifications')">Notifications</button>
                <button class="tab" data-tab="security" onclick="SettingsPage.switchTab('security')">Security</button>
                <button class="tab" data-tab="advanced" onclick="SettingsPage.switchTab('advanced')">Advanced</button>
            </div>
            <div id="settingsContent"></div>
        `;
        await this.loadSettings();
    },

    currentSettings: {},

    async loadSettings() {
        const data = await API.getSettings();
        if (data.success) this.currentSettings = data.settings;
        this.renderTab('general');
    },

    switchTab(tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active');
        this.renderTab(tab);
    },

    renderTab(tab) {
        const container = document.getElementById('settingsContent');
        const s = this.currentSettings;
        
        const tabs = {
            general: `
                <div class="settings-section">
                    <div class="section-title">General Settings</div>
                    <div class="section-desc">Configure basic system settings</div>
                    <div class="settings-card">
                        <div class="form-group">
                            <label class="form-label">Brand Name</label>
                            <input type="text" id="set_brand_name" class="form-input" value="${s.brand_name || 'EpicServer'}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Theme Color</label>
                            <div style="display:flex;gap:12px;align-items:center;">
                                <input type="color" id="set_theme_color" value="${s.theme_color || '#7C3AED'}" style="width:48px;height:48px;border-radius:var(--radius-md);border:1px solid var(--border-color);background:none;cursor:pointer;">
                                <input type="text" id="set_theme_color_text" class="form-input" value="${s.theme_color || '#7C3AED'}" style="flex:1;" oninput="document.getElementById('set_theme_color').value=this.value">
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="SettingsPage.saveTab('general')">Save Changes</button>
                    </div>
                </div>
            `,
            branding: `
                <div class="settings-section">
                    <div class="section-title">Branding</div>
                    <div class="section-desc">Customize your brand appearance</div>
                    <div class="settings-card">
                        <div class="form-group">
                            <label class="form-label">Brand Logo URL</label>
                            <input type="text" id="set_brand_logo" class="form-input" value="${s.brand_logo || ''}" placeholder="https://example.com/logo.png">
                            <div class="form-hint">URL to your logo image (optional)</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Brand Name</label>
                            <input type="text" id="set_brand_name2" class="form-input" value="${s.brand_name || 'EpicServer'}">
                        </div>
                        <button class="btn btn-primary" onclick="SettingsPage.saveTab('branding')">Save Changes</button>
                    </div>
                </div>
            `,
            notifications: `
                <div class="settings-section">
                    <div class="section-title">Notification Integrations</div>
                    <div class="section-desc">Configure external notification services</div>
                    <div class="settings-card">
                        <div class="form-group">
                            <label class="form-label">Discord Webhook URL</label>
                            <input type="text" id="set_discord_webhook" class="form-input" value="${s.discord_webhook || ''}" placeholder="https://discord.com/api/webhooks/...">
                            <div class="form-hint">Receive notifications in your Discord server</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Telegram Bot Token</label>
                            <input type="text" id="set_telegram_bot_token" class="form-input" value="${s.telegram_bot_token || ''}" placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11">
                            <div class="form-hint">Telegram bot token from @BotFather</div>
                        </div>
                        <button class="btn btn-primary" onclick="SettingsPage.saveTab('notifications')">Save Changes</button>
                    </div>
                </div>
            `,
            security: `
                <div class="settings-section">
                    <div class="section-title">Security Settings</div>
                    <div class="section-desc">Manage security-related options</div>
                    <div class="settings-card">
                        <div class="form-checkbox" style="margin-bottom:16px;">
                            <input type="checkbox" id="set_maintenance_mode" ${s.maintenance_mode === 'true' ? 'checked' : ''}>
                            <label style="cursor:pointer;"><strong>Maintenance Mode</strong><br><span style="font-size:13px;color:var(--text-muted);">Disable all verification requests</span></label>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Current Password</label>
                            <input type="password" id="set_current_password" class="form-input" placeholder="Enter current password">
                        </div>
                        <div class="form-group">
                            <label class="form-label">New Password</label>
                            <input type="password" id="set_new_password" class="form-input" placeholder="Enter new password (min 6 chars)">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Confirm New Password</label>
                            <input type="password" id="set_confirm_password" class="form-input" placeholder="Confirm new password">
                        </div>
                        <button class="btn btn-primary" onclick="SettingsPage.changePassword()">Change Password</button>
                    </div>
                </div>
            `,
            advanced: `
                <div class="settings-section">
                    <div class="section-title">Advanced Settings</div>
                    <div class="section-desc">System-level configurations</div>
                    <div class="settings-card">
                        <div class="form-checkbox" style="margin-bottom:16px;">
                            <input type="checkbox" id="set_auto_backup" ${s.auto_backup === 'true' ? 'checked' : ''}>
                            <label style="cursor:pointer;"><strong>Auto Backup</strong><br><span style="font-size:13px;color:var(--text-muted);">Automatically backup database periodically</span></label>
                        </div>
                        <hr style="border:none;border-top:1px solid var(--border-subtle);margin:16px 0;">
                        <div style="font-size:14px;font-weight:600;margin-bottom:12px;">SMTP Configuration</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">SMTP Host</label>
                                <input type="text" id="set_smtp_host" class="form-input" value="${s.smtp_host || ''}" placeholder="smtp.example.com">
                            </div>
                            <div class="form-group">
                                <label class="form-label">SMTP Port</label>
                                <input type="text" id="set_smtp_port" class="form-input" value="${s.smtp_port || '587'}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">SMTP Username</label>
                                <input type="text" id="set_smtp_user" class="form-input" value="${s.smtp_user || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">SMTP Password</label>
                                <input type="password" id="set_smtp_pass" class="form-input" value="${s.smtp_pass || ''}">
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="SettingsPage.saveTab('advanced')">Save Changes</button>
                    </div>
                </div>
            `
        };

        container.innerHTML = tabs[tab] || tabs.general;
    },

    async saveTab(tab) {
        const settings = {};
        
        if (tab === 'general') {
            settings.brand_name = document.getElementById('set_brand_name').value;
            settings.theme_color = document.getElementById('set_theme_color').value;
        } else if (tab === 'branding') {
            settings.brand_logo = document.getElementById('set_brand_logo').value;
            settings.brand_name = document.getElementById('set_brand_name2').value;
        } else if (tab === 'notifications') {
            settings.discord_webhook = document.getElementById('set_discord_webhook').value;
            settings.telegram_bot_token = document.getElementById('set_telegram_bot_token').value;
        } else if (tab === 'security') {
            settings.maintenance_mode = document.getElementById('set_maintenance_mode').checked ? 'true' : 'false';
        } else if (tab === 'advanced') {
            settings.auto_backup = document.getElementById('set_auto_backup').checked ? 'true' : 'false';
            settings.smtp_host = document.getElementById('set_smtp_host').value;
            settings.smtp_port = document.getElementById('set_smtp_port').value;
            settings.smtp_user = document.getElementById('set_smtp_user').value;
            settings.smtp_pass = document.getElementById('set_smtp_pass').value;
        }

        const data = await API.saveSettings(settings);
        if (data.success) {
            UI.showToast('Settings saved successfully', 'success');
            this.currentSettings = { ...this.currentSettings, ...settings };
        } else {
            UI.showToast(data.message || 'Failed to save settings', 'error');
        }
    },

    async changePassword() {
        const current = document.getElementById('set_current_password').value;
        const newP = document.getElementById('set_new_password').value;
        const confirm = document.getElementById('set_confirm_password').value;
        if (newP !== confirm) { UI.showToast('Passwords do not match', 'error'); return; }
        if (newP.length < 6) { UI.showToast('Password must be at least 6 characters', 'error'); return; }
        
        const data = await API.changePassword(current, newP);
        if (data.success) {
            UI.showToast('Password changed successfully', 'success');
            document.getElementById('set_current_password').value = '';
            document.getElementById('set_new_password').value = '';
            document.getElementById('set_confirm_password').value = '';
        } else {
            UI.showToast(data.message, 'error');
        }
    }
};