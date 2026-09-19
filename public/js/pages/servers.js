// Online Servers Page
const ServersPage = {
    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
                <div>
                    <div style="font-size:18px;font-weight:600;">Online Servers</div>
                    <div style="font-size:13px;color:var(--text-muted);">Active server connections</div>
                </div>
                <button class="btn btn-secondary" onclick="ServersPage.loadData()"><i class="fas fa-sync-alt"></i> Refresh</button>
            </div>
            <div class="servers-grid" id="serversGrid"></div>
        `;
        await this.loadData();
    },

    async loadData() {
        const grid = document.getElementById('serversGrid');
        UI.showLoading(grid);
        
        const data = await API.getAllServers();
        if (!data.success || !data.servers || !data.servers.length) {
            UI.showEmpty(grid, '🖥️', 'No servers connected', 'Servers will appear here when they connect for verification.');
            return;
        }
        
        const online = data.servers.filter(s => s.status === 'online');
        const offline = data.servers.filter(s => s.status !== 'online');
        
        grid.innerHTML = `
            <div style="grid-column:1/-1;margin-bottom:8px;">
                <span style="font-size:14px;font-weight:600;color:var(--success);"><i class="fas fa-circle" style="font-size:10px;"></i> Online (${online.length})</span>
            </div>
            ${online.map(s => this.renderCard(s)).join('')}
            ${offline.length ? `
            <div style="grid-column:1/-1;margin:16px 0 8px;">
                <span style="font-size:14px;font-weight:600;color:var(--text-muted);"><i class="fas fa-circle" style="font-size:10px;"></i> Offline (${offline.length})</span>
            </div>
            ${offline.map(s => this.renderCard(s)).join('')}` : ''}
        `;
    },

    renderCard(s) {
        const isOnline = s.status === 'online';
        return `
        <div class="server-card">
            <div class="server-top">
                <span class="server-name">${s.server_name || 'Unnamed Server'}</span>
                ${UI.badge(isOnline ? 'online' : 'offline')}
            </div>
            <div class="server-details">
                <div class="server-detail">
                    <span class="detail-icon"><i class="fas fa-puzzle-piece"></i></span>
                    ${s.plugin_name || '-'} v${s.plugin_version || '-'}
                </div>
                <div class="server-detail">
                    <span class="detail-icon"><i class="fas fa-microchip"></i></span>
                    <span style="font-family:monospace;font-size:12px;">${s.hwid ? s.hwid.substring(0, 16) + '...' : '-'}</span>
                </div>
                <div class="server-detail">
                    <span class="detail-icon"><i class="fas fa-globe"></i></span>
                    ${s.country || 'Unknown'} · ${s.ip || '-'}
                </div>
                <div class="server-detail">
                    <span class="detail-icon"><i class="fas fa-users"></i></span>
                    ${s.players || 0} players
                </div>
                <div class="server-detail">
                    <span class="detail-icon"><i class="fas fa-clock"></i></span>
                    Last seen: ${UI.timeAgo(s.last_seen)}
                </div>
                <div class="server-detail">
                    <span class="detail-icon"><i class="fas fa-key"></i></span>
                    <span style="font-family:monospace;font-size:12px;color:var(--text-accent);">${s.license_key}</span>
                </div>
            </div>
        </div>`;
    }
};