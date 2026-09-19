// Security Page
const SecurityPage = {
    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div style="font-size:18px;font-weight:600;margin-bottom:20px;">Security Dashboard</div>
            <div class="stats-grid" id="securityStats"></div>
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Recent Security Events</div>
                        <div class="card-subtitle">Suspicious activities and security alerts</div>
                    </div>
                </div>
                <div id="securityEvents"></div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        const data = await API.getSecurity();
        if (!data.success) { UI.showToast('Failed to load security data', 'error'); return; }

        this.renderStats(data.stats);
        this.renderEvents(data.events);
    },

    renderStats(stats) {
        const grid = document.getElementById('securityStats');
        grid.innerHTML = `
            <div class="stat-card">
                <div class="stat-top">
                    <div class="stat-icon danger"><i class="fas fa-times-circle"></i></div>
                </div>
                <div class="stat-value">${stats.failedAttempts || 0}</div>
                <div class="stat-label">Failed Attempts</div>
                <div class="stat-desc">Total failed verifications</div>
            </div>
            <div class="stat-card">
                <div class="stat-top">
                    <div class="stat-icon warning"><i class="fas fa-exclamation-triangle"></i></div>
                </div>
                <div class="stat-value">${stats.failedToday || 0}</div>
                <div class="stat-label">Failed Today</div>
                <div class="stat-desc">Last 24 hours</div>
            </div>
            <div class="stat-card">
                <div class="stat-top">
                    <div class="stat-icon danger"><i class="fas fa-ban"></i></div>
                </div>
                <div class="stat-value">${stats.invalidLicenses || 0}</div>
                <div class="stat-label">Invalid Licenses</div>
                <div class="stat-desc">Non-existent license keys</div>
            </div>
            <div class="stat-card">
                <div class="stat-top">
                    <div class="stat-icon warning"><i class="fas fa-microchip"></i></div>
                </div>
                <div class="stat-value">${stats.hwidMismatches || 0}</div>
                <div class="stat-label">HWID Mismatches</div>
                <div class="stat-desc">Hardware ID conflicts</div>
            </div>
            <div class="stat-card">
                <div class="stat-top">
                    <div class="stat-icon info"><i class="fas fa-globe"></i></div>
                </div>
                <div class="stat-value">${stats.blockedIps || 0}</div>
                <div class="stat-label">Blocked IPs</div>
                <div class="stat-desc">Suspicious IP addresses</div>
            </div>
        `;
    },

    renderEvents(events) {
        const container = document.getElementById('securityEvents');
        if (!events || !events.length) {
            UI.showEmpty(container, '🛡️', 'No security events', 'Your system is secure.');
            return;
        }

        container.innerHTML = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr><th>Time</th><th>Event Type</th><th>License</th><th>HWID</th><th>IP</th><th>Severity</th><th>Details</th></tr>
                    </thead>
                    <tbody>
                        ${events.map(e => `
                            <tr>
                                <td><span class="cell-secondary">${UI.timeAgo(e.timestamp)}</span></td>
                                <td><span style="font-weight:500;">${e.event_type.replace(/_/g, ' ')}</span></td>
                                <td style="font-family:monospace;font-size:12px;">${e.license_key ? e.license_key.substring(0, 16) + '...' : '-'}</td>
                                <td style="font-family:monospace;font-size:12px;color:var(--text-muted);">${e.hwid ? e.hwid.substring(0, 12) + '...' : '-'}</td>
                                <td style="font-family:monospace;font-size:12px;">${e.ip || '-'}</td>
                                <td>${e.severity === 'high' ? '<span style="color:var(--danger);font-weight:600;">High</span>' : e.severity === 'medium' ? '<span style="color:var(--warning);font-weight:600;">Medium</span>' : '<span style="color:var(--text-muted);">Low</span>'}</td>
                                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);font-size:12px;">${e.details || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
};