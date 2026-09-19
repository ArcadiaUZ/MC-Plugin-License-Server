// Plugins Page
const PluginsPage = {
    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
                <div>
                    <div style="font-size:18px;font-weight:600;">Plugin Management</div>
                    <div style="font-size:13px;color:var(--text-muted);">Manage your plugins and versions</div>
                </div>
                <button class="btn btn-primary" onclick="PluginsPage.showCreateModal()">
                    <i class="fas fa-plus"></i> Add Plugin
                </button>
            </div>
            <div class="plugins-grid" id="pluginsGrid"></div>
        `;
        await this.loadData();
    },

    async loadData() {
        const grid = document.getElementById('pluginsGrid');
        UI.showLoading(grid);
        
        const data = await API.listPlugins();
        if (!data.success || !data.plugins || !data.plugins.length) {
            UI.showEmpty(grid, '🧩', 'No plugins registered', 'Create your first plugin to get started.');
            return;
        }
        
        grid.innerHTML = data.plugins.map(p => {
            const colors = ['#7C3AED', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#EC4899'];
            const color = colors[Math.abs(p.name.charCodeAt(0)) % colors.length];
            return `
            <div class="plugin-card">
                <div class="plugin-top">
                    <div class="plugin-icon" style="background:${color}22;color:${color}">
                        <i class="fas fa-puzzle-piece"></i>
                    </div>
                    <div class="plugin-info">
                        <div class="plugin-name">${p.display_name || p.name}</div>
                        <div class="plugin-version">v${p.latest_version} · ${p.status || 'active'}</div>
                    </div>
                    ${UI.badge(p.status || 'active')}
                </div>
                <div class="plugin-stats">
                    <div class="plugin-stat">
                        <div class="value">${p.license_count || 0}</div>
                        <div class="label">Licenses</div>
                    </div>
                    <div class="plugin-stat">
                        <div class="value">${p.downloads || 0}</div>
                        <div class="label">Downloads</div>
                    </div>
                    <div class="plugin-stat">
                        <div class="value">$${p.revenue || 0}</div>
                        <div class="label">Revenue</div>
                    </div>
                    <div class="plugin-stat">
                        <div class="value">v${p.latest_version}</div>
                        <div class="label">Latest</div>
                    </div>
                </div>
                <div class="plugin-actions">
                    <button class="btn btn-sm btn-secondary" onclick="PluginsPage.editPlugin('${p.name}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-secondary" onclick="navigateTo('analytics')"><i class="fas fa-chart-bar"></i> Analytics</button>
                    <button class="btn btn-sm btn-secondary" onclick="navigateTo('updates')"><i class="fas fa-cloud-upload-alt"></i> Update</button>
                    <button class="btn btn-sm btn-danger" onclick="PluginsPage.deletePlugin('${p.name}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    },

    showCreateModal() {
        UI.openModal(`
            <div class="form-group">
                <label class="form-label">Plugin Name</label>
                <input type="text" id="newPluginNameInput" class="form-input" placeholder="e.g., EpicTools">
            </div>
            <div class="form-group">
                <label class="form-label">Display Name</label>
                <input type="text" id="newPluginDisplayName" class="form-input" placeholder="e.g., Epic Tools">
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <textarea id="newPluginDesc" class="form-textarea" rows="3" placeholder="Plugin description..."></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Latest Version</label>
                <input type="text" id="newPluginVersion" class="form-input" placeholder="1.0.0" value="1.0.0">
            </div>
        `, 'Register New Plugin', `
            <button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="PluginsPage.createPlugin()">Create Plugin</button>
        `);
    },

    async createPlugin() {
        const name = document.getElementById('newPluginNameInput').value;
        if (!name) { UI.showToast('Plugin name is required', 'error'); return; }
        
        const data = await API.createPlugin({
            name,
            displayName: document.getElementById('newPluginDisplayName').value,
            description: document.getElementById('newPluginDesc').value,
            latestVersion: document.getElementById('newPluginVersion').value || '1.0.0'
        });
        
        if (data.success) {
            UI.closeModal();
            UI.showToast('Plugin created!', 'success');
            this.loadData();
        } else {
            UI.showToast(data.message, 'error');
        }
    },

    async editPlugin(name) {
        const data = await API.getPlugin(name);
        if (!data.success) { UI.showToast(data.message, 'error'); return; }
        const p = data.plugin;
        
        UI.openModal(`
            <div class="form-group">
                <label class="form-label">Display Name</label>
                <input type="text" id="editDisplayName" class="form-input" value="${p.display_name || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <textarea id="editDesc" class="form-textarea" rows="3">${p.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Latest Version</label>
                <input type="text" id="editVersion" class="form-input" value="${p.latest_version}">
            </div>
            <div class="form-group">
                <label class="form-label">Status</label>
                <select id="editStatus" class="form-select">
                    <option value="active" ${p.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="inactive" ${p.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                </select>
            </div>
        `, `Edit Plugin: ${name}`, `
            <button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="PluginsPage.savePlugin('${name}')">Save</button>
        `);
    },

    async savePlugin(name) {
        const data = await API.updatePlugin(name, {
            displayName: document.getElementById('editDisplayName').value,
            description: document.getElementById('editDesc').value,
            latestVersion: document.getElementById('editVersion').value,
            status: document.getElementById('editStatus').value
        });
        if (data.success) {
            UI.closeModal();
            UI.showToast('Plugin updated', 'success');
            this.loadData();
        } else {
            UI.showToast(data.message, 'error');
        }
    },

    async deletePlugin(name) {
        if (!confirm(`Delete plugin "${name}"? This cannot be undone.`)) return;
        const data = await API.deletePlugin(name);
        if (data.success) {
            UI.showToast('Plugin deleted', 'success');
            this.loadData();
        } else {
            UI.showToast(data.message, 'error');
        }
    }
};