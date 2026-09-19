// Dashboard Page
const DashboardPage = {
    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div class="stats-grid" id="statsGrid"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">Recent Activity</div>
                            <div class="card-subtitle">Latest verification events</div>
                        </div>
                    </div>
                    <div class="activity-timeline" id="recentActivity"></div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">Quick Actions</div>
                            <div class="card-subtitle">Common management tasks</div>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <button class="btn btn-primary" onclick="navigateTo('licenses')" style="padding:20px;flex-direction:column;gap:8px;height:auto;">
                            <i class="fas fa-plus" style="font-size:20px;"></i>
                            <span>Create License</span>
                        </button>
                        <button class="btn btn-secondary" onclick="navigateTo('plugins')" style="padding:20px;flex-direction:column;gap:8px;height:auto;">
                            <i class="fas fa-puzzle-piece" style="font-size:20px;"></i>
                            <span>Manage Plugins</span>
                        </button>
                        <button class="btn btn-secondary" onclick="navigateTo('analytics')" style="padding:20px;flex-direction:column;gap:8px;height:auto;">
                            <i class="fas fa-chart-bar" style="font-size:20px;"></i>
                            <span>View Analytics</span>
                        </button>
                        <button class="btn btn-secondary" onclick="navigateTo('servers')" style="padding:20px;flex-direction:column;gap:8px;height:auto;">
                            <i class="fas fa-server" style="font-size:20px;"></i>
                            <span>Online Servers</span>
                        </button>
                    </div>
                </div>
            </div>
            <div class="card" style="margin-top:20px;">
                <div class="card-header">
                    <div>
                        <div class="card-title">Licenses Expiring Soon</div>
                        <div class="card-subtitle">Next 7 days</div>
                    </div>
                </div>
                <div id="expiringLicenses"></div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        const statsData = await API.getStats();
        const recentData = await API.getRecentActivity();
        
        if (statsData.success) this.renderStats(statsData.stats);
        if (recentData.success) this.renderActivity(recentData);
    },

    renderStats(stats) {
        const grid = document.getElementById('statsGrid');
        const cards = [
            { icon: 'fa-key', color: 'accent', label: 'Total Licenses', value: stats.total, desc: 'All time licenses' },
            { icon: 'fa-check-circle', color: 'success', label: 'Active', value: stats.active, desc: 'Currently active' },
            { icon: 'fa-ban', color: 'danger', label: 'Revoked', value: stats.revoked, desc: 'Revoked licenses' },
            { icon: 'fa-clock', color: 'warning', label: 'Expired', value: stats.expired, desc: 'Expired licenses' },
            { icon: 'fa-server', color: 'info', label: 'Online Servers', value: stats.onlineServers || 0, desc: 'Currently online' },
            { icon: 'fa-calendar-day', color: 'accent', label: "Today's Verifications", value: stats.todayVerifications || 0, desc: 'Last 24 hours' },
            { icon: 'fa-chart-simple', color: 'info', label: 'Total Verifications', value: stats.totalVerifications, desc: 'All time' },
            { icon: 'fa-dollar-sign', color: 'success', label: 'Revenue', value: stats.totalRevenue || 0, desc: 'Total revenue', prefix: '$' },
            { icon: 'fa-thumbs-up', color: 'success', label: 'Successful', value: stats.successfulVerifications, desc: 'Successful verifications' },
            { icon: 'fa-thumbs-down', color: 'danger', label: 'Failed', value: stats.failedVerifications || 0, desc: 'Failed verifications' }
        ];

        grid.innerHTML = cards.map((c, i) => `
            <div class="stat-card" style="animation:fadeInUp 0.5s ease-out ${i * 0.05}s both;">
                <div class="stat-top">
                    <div class="stat-icon ${c.color}"><i class="fas ${c.icon}"></i></div>
                </div>
                <div class="stat-value" data-target="${c.value}">0</div>
                <div class="stat-label">${c.label}</div>
                <div class="stat-desc">${c.desc}</div>
            </div>
        `).join('');

        // Animate counters after render
        setTimeout(() => {
            const valueEls = grid.querySelectorAll('.stat-value');
            valueEls.forEach((el, i) => {
                const target = parseInt(el.dataset.target);
                setTimeout(() => Animator.countUp(el, target, 1200), i * 80);
            });
        }, 100);
    },

    renderActivity(data) {
        const container = document.getElementById('recentActivity');
        
        // Combine and sort recent activity
        const items = [];
        if (data.recentActivity) {
            data.recentActivity.forEach(a => {
                items.push({
                    time: a.timestamp,
                    action: a.action,
                    details: a.details,
                    result: a.result,
                    type: 'activity'
                });
            });
        }
        if (data.recentVerifications) {
            data.recentVerifications.forEach(v => {
                items.push({
                    time: v.timestamp,
                    action: v.success ? '✅ Verification successful' : '❌ Verification failed',
                    details: `${v.message} (HWID: ${(v.hwid || 'N/A').substring(0, 12)}...)`,
                    result: v.success ? 'success' : 'danger',
                    type: 'verification'
                });
            });
        }
        
        items.sort((a, b) => b.time - a.time);
        const recent = items.slice(0, 10);

        if (!recent.length) {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">No recent activity</div>';
            return;
        }

        container.innerHTML = recent.map(a => `
            <div class="activity-item">
                <div class="activity-dot ${a.result === 'success' ? 'success' : a.result === 'danger' ? 'danger' : 'info'}"></div>
                <div class="activity-content">
                    <div class="activity-header">
                        <span class="activity-action">${a.action.replace(/_/g, ' ')}</span>
                        <span class="activity-time">${UI.timeAgo(a.time)}</span>
                    </div>
                    <div class="activity-details">${a.details || ''}</div>
                </div>
            </div>
        `).join('');

        // Render expiring licenses
        const expiringContainer = document.getElementById('expiringLicenses');
        if (data.expiringSoon && data.expiringSoon.length > 0) {
            expiringContainer.innerHTML = `
                <table class="data-table">
                    <thead><tr><th>License Key</th><th>Plugin</th><th>Owner</th><th>Expires</th></tr></thead>
                    <tbody>
                        ${data.expiringSoon.map(l => `
                            <tr>
                                <td class="license-key-cell">${l.license_key}</td>
                                <td>${l.plugin_name}</td>
                                <td>${l.owner_discord || '-'}</td>
                                <td style="color:var(--warning)">${UI.timeAgo(l.expires_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            expiringContainer.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">No licenses expiring soon</div>';
        }
    }
};