// Licenses Page
const LicensesPage = {
    currentPage: 1,
    pageSize: 15,
    sortBy: 'created_at',
    sortOrder: 'DESC',
    searchTerm: '',
    statusFilter: '',
    pluginFilter: '',
    licenses: [],

    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">License Management</div>
                        <div class="card-subtitle">Manage all license keys</div>
                    </div>
                    <button class="btn btn-primary" onclick="navigateTo('licenses', 'create')">
                        <i class="fas fa-plus"></i> Create License
                    </button>
                </div>
                <div class="search-bar">
                    <div class="search-input-wrap">
                        <span class="search-icon"><i class="fas fa-search"></i></span>
                        <input type="text" id="licenseSearch" placeholder="Search by license key, owner..." oninput="LicensesPage.handleSearch()">
                    </div>
                    <select id="licenseStatusFilter" class="form-select" style="width:auto;min-width:140px;" onchange="LicensesPage.handleFilter()">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="revoked">Revoked</option>
                        <option value="expired">Expired</option>
                    </select>
                    <select id="licensePluginFilter" class="form-select" style="width:auto;min-width:140px;" onchange="LicensesPage.handleFilter()">
                        <option value="">All Plugins</option>
                    </select>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th class="sortable" onclick="LicensesPage.sort('license_key')">License Key</th>
                                <th class="sortable" onclick="LicensesPage.sort('plugin_name')">Plugin</th>
                                <th>Owner</th>
                                <th>Telegram</th>
                                <th>HWID</th>
                                <th>Version</th>
                                <th class="sortable" onclick="LicensesPage.sort('created_at')">Created</th>
                                <th class="sortable" onclick="LicensesPage.sort('last_verified')">Last Seen</th>
                                <th class="sortable" onclick="LicensesPage.sort('expires_at')">Expires</th>
                                <th class="sortable" onclick="LicensesPage.sort('status')">Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="licensesTableBody"></tbody>
                    </table>
                </div>
                <div id="licensesPagination"></div>
            </div>
            <div id="createLicenseSection" class="hidden" style="margin-top:20px;">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">Create New License</div>
                            <div class="card-subtitle">Generate a new license key</div>
                        </div>
                        <button class="btn btn-ghost" onclick="LicensesPage.hideCreate()"><i class="fas fa-times"></i></button>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                        <div class="form-group">
                            <label class="form-label">Plugin Name</label>
                            <input type="text" id="newPluginName" class="form-input" placeholder="e.g., EpicTools" list="pluginList">
                            <datalist id="pluginList"></datalist>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Plugin Version</label>
                            <input type="text" id="newPluginVersion" class="form-input" placeholder="e.g., 1.0.0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Owner Discord</label>
                            <input type="text" id="newOwnerDiscord" class="form-input" placeholder="e.g., user#1234">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Owner Email</label>
                            <input type="email" id="newOwnerEmail" class="form-input" placeholder="email@example.com">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Max Servers</label>
                            <input type="number" id="newMaxServers" class="form-input" value="1" min="1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Expires In (days)</label>
                            <input type="number" id="newExpiresDays" class="form-input" placeholder="Leave empty for no expiry" min="1">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Notes</label>
                        <textarea id="newNotes" class="form-textarea" rows="3" placeholder="Optional notes..."></textarea>
                    </div>
                    <button class="btn btn-primary btn-lg" onclick="LicensesPage.createLicense()" style="width:100%;">
                        <i class="fas fa-key"></i> Generate License Key
                    </button>
                    <div id="createdLicenseResult" class="hidden" style="margin-top:16px;padding:16px;background:var(--success-light);border-radius:var(--radius-md);border:1px solid rgba(34,197,94,0.2);">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <i class="fas fa-check-circle" style="color:var(--success);font-size:24px;"></i>
                            <div style="flex:1;">
                                <div style="font-weight:600;color:var(--success);">License Created!</div>
                                <div style="font-family:monospace;font-size:18px;letter-spacing:2px;color:var(--text-primary);margin-top:4px;" id="createdKeyDisplay"></div>
                            </div>
                            <button class="btn btn-sm btn-primary" onclick="LicensesPage.copyCreatedKey()">Copy</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        await this.loadPlugins();
        await this.loadData();
        
        // Check if we should show create form
        if (window.location.hash.includes('create')) {
            this.showCreate();
        }
    },

    async loadPlugins() {
        const data = await API.listPlugins();
        if (data.success && data.plugins) {
            const select = document.getElementById('licensePluginFilter');
            const datalist = document.getElementById('pluginList');
            data.plugins.forEach(p => {
                select.innerHTML += `<option value="${p.name}">${p.name}</option>`;
                datalist.innerHTML += `<option value="${p.name}">`;
            });
        }
    },

    async loadData() {
        const params = {
            page: this.currentPage,
            limit: this.pageSize,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder
        };
        if (this.searchTerm) params.search = this.searchTerm;
        if (this.statusFilter) params.status = this.statusFilter;
        if (this.pluginFilter) params.pluginName = this.pluginFilter;

        const data = await API.listLicenses(params);
        if (data.success) {
            this.licenses = data.licenses;
            this.renderTable(data);
        }
    },

    renderTable(data) {
        const tbody = document.getElementById('licensesTableBody');
        if (!data.licenses || !data.licenses.length) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--text-muted);">No licenses found</td></tr>';
            return;
        }

        tbody.innerHTML = data.licenses.map(l => `
            <tr>
                <td class="license-key-cell">${l.license_key}</td>
                <td>${l.plugin_name} <span class="cell-secondary">v${l.plugin_version}</span></td>
                <td>${l.owner_discord || '-'}</td>
                <td>${l.owner_telegram || '-'}</td>
                <td style="font-family:monospace;font-size:12px;color:var(--text-muted);">${l.hwid ? l.hwid.substring(0, 10) + '...' : '-'}</td>
                <td><span class="cell-secondary">v${l.plugin_version}</span></td>
                <td><span class="cell-secondary">${UI.formatDate(l.created_at)}</span></td>
                <td><span class="cell-secondary">${l.last_verified ? UI.timeAgo(l.last_verified) : 'Never'}</span></td>
                <td>${l.expires_at ? `<span style="color:${l.expires_at < Date.now() ? 'var(--danger)' : 'var(--warning)'}">${UI.timeAgo(l.expires_at)}</span>` : '<span class="cell-secondary">Never</span>'}</td>
                <td>${UI.badge(l.status)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-ghost" onclick="LicensesPage.viewDetails('${l.license_key}')" title="Info"><i class="fas fa-info-circle"></i></button>
                        <button class="btn btn-sm btn-ghost" onclick="UI.copyToClipboard('${l.license_key}')" title="Copy"><i class="fas fa-copy"></i></button>
                        <button class="btn btn-sm btn-ghost" onclick="LicensesPage.resetHwid('${l.license_key}')" title="Reset HWID"><i class="fas fa-microchip"></i></button>
                        ${l.status === 'active' ? `<button class="btn btn-sm btn-ghost" style="color:var(--danger)" onclick="LicensesPage.revoke('${l.license_key}')" title="Revoke"><i class="fas fa-ban"></i></button>` : 
                        `<button class="btn btn-sm btn-ghost" style="color:var(--success)" onclick="LicensesPage.activate('${l.license_key}')" title="Activate"><i class="fas fa-check"></i></button>`}
                        <button class="btn btn-sm btn-ghost" style="color:var(--danger)" onclick="LicensesPage.delete('${l.license_key}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Pagination
        const pagination = document.getElementById('licensesPagination');
        UI.renderPagination(pagination, this.currentPage, data.total, this.pageSize, (page) => {
            this.currentPage = page;
            this.loadData();
        });
    },

    handleSearch() {
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
            this.searchTerm = document.getElementById('licenseSearch').value;
            this.currentPage = 1;
            this.loadData();
        }, 300);
    },

    handleFilter() {
        this.statusFilter = document.getElementById('licenseStatusFilter').value;
        this.pluginFilter = document.getElementById('licensePluginFilter').value;
        this.currentPage = 1;
        this.loadData();
    },

    sort(column) {
        if (this.sortBy === column) {
            this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
        } else {
            this.sortBy = column;
            this.sortOrder = 'DESC';
        }
        this.currentPage = 1;
        this.loadData();
    },

    showCreate() {
        document.getElementById('createLicenseSection').classList.remove('hidden');
        document.getElementById('createLicenseSection').scrollIntoView({ behavior: 'smooth' });
    },

    hideCreate() {
        document.getElementById('createLicenseSection').classList.add('hidden');
    },

    async createLicense() {
        const body = {
            pluginName: document.getElementById('newPluginName').value,
            pluginVersion: document.getElementById('newPluginVersion').value,
            ownerDiscord: document.getElementById('newOwnerDiscord').value,
            ownerEmail: document.getElementById('newOwnerEmail').value,
            maxServers: parseInt(document.getElementById('newMaxServers').value) || 1,
            expiresInDays: parseInt(document.getElementById('newExpiresDays').value) || null,
            notes: document.getElementById('newNotes').value
        };
        if (!body.pluginName) { UI.showToast('Plugin name is required', 'error'); return; }
        
        const data = await API.createLicense(body);
        if (data.success) {
            document.getElementById('createdKeyDisplay').textContent = data.license.licenseKey;
            document.getElementById('createdLicenseResult').classList.remove('hidden');
            UI.showToast('License created successfully!', 'success');
            this.loadData();
        } else {
            UI.showToast(data.message || 'Error creating license', 'error');
        }
    },

    copyCreatedKey() {
        const key = document.getElementById('createdKeyDisplay').textContent;
        UI.copyToClipboard(key);
    },

    async viewDetails(key) {
        const data = await API.getLicense(key);
        if (!data.success) { UI.showToast(data.message, 'error'); return; }
        const l = data.license;
        
        const content = `
            <div class="detail-grid">
                <div class="detail-item full-width">
                    <div class="detail-label">License Key</div>
                    <div class="detail-value" style="font-family:monospace;font-size:16px;color:var(--accent);letter-spacing:1px;">${l.license_key}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Plugin</div>
                    <div class="detail-value">${l.plugin_name} v${l.plugin_version}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">${UI.badge(l.status)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Owner</div>
                    <div class="detail-value">${l.owner_discord || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Telegram</div>
                    <div class="detail-value">${l.owner_telegram || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Discord</div>
                    <div class="detail-value">${l.owner_discord || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Purchase Date</div>
                    <div class="detail-value">${UI.formatDateTime(l.created_at)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Expiration</div>
                    <div class="detail-value">${l.expires_at ? UI.formatDateTime(l.expires_at) : 'Never'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">HWID</div>
                    <div class="detail-value" style="font-family:monospace;font-size:12px;">${l.hwid || 'Not bound'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Current Version</div>
                    <div class="detail-value">v${l.plugin_version}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Max Servers</div>
                    <div class="detail-value">${l.max_servers}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Verification Count</div>
                    <div class="detail-value">${data.logs ? data.logs.length : 0}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Last Verification</div>
                    <div class="detail-value">${l.last_verified ? UI.timeAgo(l.last_verified) : 'Never'}</div>
                </div>
                <div class="detail-item full-width">
                    <div class="detail-label">Notes</div>
                    <div class="detail-value">${l.notes || '-'}</div>
                </div>
                ${data.ipHistory && data.ipHistory.length ? `
                <div class="detail-item full-width">
                    <div class="detail-label">IP History</div>
                    <div class="detail-value">
                        ${data.ipHistory.map(ip => `<div style="font-family:monospace;font-size:12px;padding:2px 0;">${ip.ip} - ${UI.timeAgo(ip.timestamp)}</div>`).join('')}
                    </div>
                </div>` : ''}
                ${data.logs && data.logs.length ? `
                <div class="detail-item full-width">
                    <div class="detail-label">Recent Verification Logs</div>
                    <div class="detail-value">
                        <div style="max-height:200px;overflow-y:auto;">
                            ${data.logs.slice(0, 20).map(log => `
                                <div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;gap:8px;">
                                    <span style="color:${log.success ? 'var(--success)' : 'var(--danger)'}">${log.success ? '✅' : '❌'}</span>
                                    <span style="flex:1;">${log.message}</span>
                                    <span style="color:var(--text-muted);font-size:11px;">${UI.timeAgo(log.timestamp)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>` : ''}
            </div>
        `;
        
        UI.openModal(content, 'License Details', `
            <button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>
            <button class="btn btn-primary" onclick="UI.copyToClipboard('${l.license_key}');UI.showToast('Copied!','success')">Copy Key</button>
            ${l.status === 'active' ? `<button class="btn btn-danger" onclick="LicensesPage.revoke('${l.license_key}');UI.closeModal()">Revoke</button>` : ''}
        `);
    },

    async revoke(key) {
        if (!confirm(`Revoke license ${key}?`)) return;
        const data = await API.revokeLicense(key);
        if (data.success) { UI.showToast('License revoked', 'success'); this.loadData(); }
        else UI.showToast(data.message, 'error');
    },

    async activate(key) {
        const data = await API.activateLicense(key);
        if (data.success) { UI.showToast('License activated', 'success'); this.loadData(); }
        else UI.showToast(data.message, 'error');
    },

    async resetHwid(key) {
        if (!confirm(`Reset HWID for license ${key}?`)) return;
        const data = await API.resetHwid(key);
        if (data.success) { UI.showToast('HWID reset', 'success'); this.loadData(); }
        else UI.showToast(data.message, 'error');
    },

    async delete(key) {
        if (!confirm(`DELETE license ${key} permanently? This cannot be undone!`)) return;
        const data = await API.deleteLicense(key);
        if (data.success) { UI.showToast('License deleted', 'success'); this.loadData(); }
        else UI.showToast(data.message, 'error');
    }
};