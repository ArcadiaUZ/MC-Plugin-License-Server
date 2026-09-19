// Logs Page
const LogsPage = {
    currentPage: 1,
    searchTerm: '',
    actionFilter: '',
    resultFilter: '',

    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Activity Logs</div>
                        <div class="card-subtitle">Track all system activities</div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-secondary" onclick="LogsPage.exportLogs('csv')"><i class="fas fa-file-csv"></i> Export CSV</button>
                        <button class="btn btn-secondary" onclick="LogsPage.loadData()"><i class="fas fa-sync-alt"></i></button>
                    </div>
                </div>
                <div class="search-bar">
                    <div class="search-input-wrap">
                        <span class="search-icon"><i class="fas fa-search"></i></span>
                        <input type="text" id="logSearch" placeholder="Search logs..." oninput="LogsPage.handleSearch()">
                    </div>
                    <select id="logActionFilter" class="form-select" style="width:auto;min-width:160px;" onchange="LogsPage.handleFilter()">
                        <option value="">All Actions</option>
                        <option value="license_created">License Created</option>
                        <option value="license_revoked">Revoked</option>
                        <option value="license_activated">Activated</option>
                        <option value="license_deleted">Deleted</option>
                        <option value="license_copied">Copied</option>
                        <option value="hwid_reset">HWID Reset</option>
                        <option value="settings_updated">Settings Updated</option>
                        <option value="version_published">Version Published</option>
                        <option value="plugin_created">Plugin Created</option>
                        <option value="plugin_deleted">Plugin Deleted</option>
                    </select>
                    <select id="logResultFilter" class="form-select" style="width:auto;min-width:120px;" onchange="LogsPage.handleFilter()">
                        <option value="">All Results</option>
                        <option value="success">Success</option>
                        <option value="error">Error</option>
                    </select>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr><th>Time</th><th>Action</th><th>Plugin</th><th>Owner</th><th>IP</th><th>Result</th><th>Details</th></tr>
                        </thead>
                        <tbody id="logsTableBody"></tbody>
                    </table>
                </div>
                <div id="logsPagination"></div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        const params = {
            page: this.currentPage,
            limit: 25
        };
        if (this.searchTerm) params.search = this.searchTerm;
        if (this.actionFilter) params.action = this.actionFilter;
        if (this.resultFilter) params.result = this.resultFilter;

        const data = await API.getActivity(params);
        if (data.success) this.renderTable(data);
    },

    renderTable(data) {
        const tbody = document.getElementById('logsTableBody');
        if (!data.logs || !data.logs.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">No logs found</td></tr>';
            return;
        }

        tbody.innerHTML = data.logs.map(l => `
            <tr>
                <td><span class="cell-secondary">${UI.formatDateTime(l.timestamp)}</span></td>
                <td><span style="font-weight:500;">${l.action.replace(/_/g, ' ')}</span></td>
                <td>${l.plugin || '-'}</td>
                <td>${l.owner || '-'}</td>
                <td style="font-family:monospace;font-size:12px;">${l.ip || '-'}</td>
                <td>${l.result === 'success' ? '<span style="color:var(--success)">✓ Success</span>' : '<span style="color:var(--danger)">✗ Error</span>'}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);font-size:12px;">${l.details || '-'}</td>
            </tr>
        `).join('');

        const pagination = document.getElementById('logsPagination');
        UI.renderPagination(pagination, this.currentPage, data.total, data.limit, (page) => {
            this.currentPage = page;
            this.loadData();
        });
    },

    handleSearch() {
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
            this.searchTerm = document.getElementById('logSearch').value;
            this.currentPage = 1;
            this.loadData();
        }, 300);
    },

    handleFilter() {
        this.actionFilter = document.getElementById('logActionFilter').value;
        this.resultFilter = document.getElementById('logResultFilter').value;
        this.currentPage = 1;
        this.loadData();
    },

    async exportLogs(format) {
        UI.showToast('Exporting logs...', 'info');
        window.open('/api/logs/export?format=' + format, '_blank');
    }
};