// Crash Reports Page
const CrashesPage = {
    currentPage: 1,
    statusFilter: '',

    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Crash Reports</div>
                        <div class="card-subtitle">View and manage plugin crash reports</div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <select id="crashStatusFilter" class="form-select" style="width:auto;min-width:140px;" onchange="CrashesPage.handleFilter()">
                            <option value="">All Status</option>
                            <option value="open">Open</option>
                            <option value="resolved">Resolved</option>
                            <option value="ignored">Ignored</option>
                        </select>
                        <button class="btn btn-secondary" onclick="CrashesPage.loadData()"><i class="fas fa-sync-alt"></i></button>
                    </div>
                </div>
                <div id="crashesList"></div>
                <div id="crashesPagination"></div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        const container = document.getElementById('crashesList');
        UI.showLoading(container);

        const params = { page: this.currentPage, limit: 20 };
        if (this.statusFilter) params.status = this.statusFilter;

        const data = await API.listCrashes(params);
        if (!data.success || !data.crashes || !data.crashes.length) {
            UI.showEmpty(container, '🐛', 'No crash reports', 'Your plugins are running smoothly!');
            return;
        }

        container.innerHTML = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr><th>Plugin</th><th>Version</th><th>Error</th><th>Owner</th><th>Time</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${data.crashes.map(c => `
                            <tr>
                                <td><strong>${c.plugin_name}</strong></td>
                                <td><span class="cell-secondary">${c.plugin_version || '-'}</span></td>
                                <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                    <span style="color:var(--danger);font-size:12px;">${c.error_message ? c.error_message.substring(0, 80) + '...' : '-'}</span>
                                </td>
                                <td>${c.owner || '-'}</td>
                                <td><span class="cell-secondary">${UI.timeAgo(c.timestamp)}</span></td>
                                <td>${UI.badge(c.status)}</td>
                                <td>
                                    <div class="btn-group">
                                        <button class="btn btn-sm btn-ghost" onclick="CrashesPage.viewDetails('${c.id}')"><i class="fas fa-eye"></i></button>
                                        ${c.status !== 'resolved' ? `<button class="btn btn-sm btn-ghost" style="color:var(--success)" onclick="CrashesPage.resolve('${c.id}')"><i class="fas fa-check"></i></button>` : ''}
                                        ${c.status !== 'ignored' ? `<button class="btn btn-sm btn-ghost" style="color:var(--warning)" onclick="CrashesPage.ignore('${c.id}')"><i class="fas fa-eye-slash"></i></button>` : ''}
                                        <button class="btn btn-sm btn-ghost" style="color:var(--danger)" onclick="CrashesPage.delete('${c.id}')"><i class="fas fa-trash"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const pagination = document.getElementById('crashesPagination');
        UI.renderPagination(pagination, this.currentPage, data.total, data.limit, (page) => {
            this.currentPage = page;
            this.loadData();
        });
    },

    handleFilter() {
        this.statusFilter = document.getElementById('crashStatusFilter').value;
        this.currentPage = 1;
        this.loadData();
    },

    async viewDetails(id) {
        // Re-fetch to get all data
        const data = await API.listCrashes({ page: 1, limit: 100 });
        if (!data.success) return;
        const crash = data.crashes.find(c => c.id === id);
        if (!crash) return;

        UI.openModal(`
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Plugin</div>
                    <div class="detail-value">${crash.plugin_name}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Version</div>
                    <div class="detail-value">${crash.plugin_version || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Java Version</div>
                    <div class="detail-value">${crash.java_version || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Server Version</div>
                    <div class="detail-value">${crash.server_version || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Owner</div>
                    <div class="detail-value">${crash.owner || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">${UI.badge(crash.status)}</div>
                </div>
                <div class="detail-item full-width">
                    <div class="detail-label">Error Message</div>
                    <div class="detail-value" style="color:var(--danger);font-family:monospace;font-size:13px;">${crash.error_message || '-'}</div>
                </div>
                ${crash.stacktrace ? `
                <div class="detail-item full-width">
                    <div class="detail-label">Stacktrace</div>
                    <div class="detail-value">
                        <pre style="background:var(--bg-primary);padding:12px;border-radius:var(--radius-sm);font-size:11px;max-height:300px;overflow-y:auto;color:var(--text-muted);">${crash.stacktrace}</pre>
                    </div>
                </div>` : ''}
            </div>
        `, `Crash Report: ${crash.plugin_name}`, `
            <button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>
            ${crash.status !== 'resolved' ? `<button class="btn btn-success" onclick="CrashesPage.resolve('${crash.id}');UI.closeModal()">Resolve</button>` : ''}
            ${crash.status !== 'ignored' ? `<button class="btn btn-warning" onclick="CrashesPage.ignore('${crash.id}');UI.closeModal()">Ignore</button>` : ''}
        `);
    },

    async resolve(id) {
        const data = await API.resolveCrash(id);
        if (data.success) { UI.showToast('Crash resolved', 'success'); this.loadData(); }
        else UI.showToast(data.message, 'error');
    },

    async ignore(id) {
        const data = await API.ignoreCrash(id);
        if (data.success) { UI.showToast('Crash ignored', 'success'); this.loadData(); }
        else UI.showToast(data.message, 'error');
    },

    async delete(id) {
        if (!confirm('Delete this crash report?')) return;
        const data = await API.deleteCrash(id);
        if (data.success) { UI.showToast('Crash deleted', 'success'); this.loadData(); }
        else UI.showToast(data.message, 'error');
    }
};