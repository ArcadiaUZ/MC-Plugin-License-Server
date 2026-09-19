// Analytics Page
const AnalyticsPage = {
    charts: {},

    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
                <div>
                    <div style="font-size:18px;font-weight:600;">Analytics</div>
                    <div style="font-size:13px;color:var(--text-muted);">License and verification statistics</div>
                </div>
                <button class="btn btn-secondary" onclick="AnalyticsPage.loadData()"><i class="fas fa-sync-alt"></i> Refresh</button>
            </div>
            <div class="chart-grid">
                <div class="chart-card">
                    <div class="chart-title">Daily Verifications (30 days)</div>
                    <div class="chart-container"><canvas id="dailyChart"></canvas></div>
                </div>
                <div class="chart-card">
                    <div class="chart-title">Monthly Verifications</div>
                    <div class="chart-container"><canvas id="monthlyChart"></canvas></div>
                </div>
                <div class="chart-card">
                    <div class="chart-title">License Distribution</div>
                    <div class="chart-container"><canvas id="distributionChart"></canvas></div>
                </div>
                <div class="chart-card">
                    <div class="chart-title">Top Plugins</div>
                    <div class="chart-container"><canvas id="topPluginsChart"></canvas></div>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Statistics Summary</div>
                        <div class="card-subtitle">Key metrics at a glance</div>
                    </div>
                </div>
                <div id="analyticsSummary"></div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        const data = await API.getActivityStats();
        if (!data.success) { UI.showToast('Failed to load analytics', 'error'); return; }
        
        this.destroyCharts();
        this.renderDailyChart(data.dailyData);
        this.renderMonthlyChart(data.monthlyData);
        this.renderDistributionChart(data.statusDist);
        this.renderTopPluginsChart(data.topPlugins);
        this.renderSummary(data);
    },

    destroyCharts() {
        Object.values(this.charts).forEach(c => c.destroy());
        this.charts = {};
    },

    renderDailyChart(dailyData) {
        const ctx = document.getElementById('dailyChart');
        if (!ctx) return;
        this.charts.daily = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dailyData.map(d => d.date.slice(5)),
                datasets: [
                    { label: 'Successful', data: dailyData.map(d => d.success), borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.4 },
                    { label: 'Failed', data: dailyData.map(d => d.failed), borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#9CA3AF' } } },
                scales: {
                    x: { ticks: { color: '#6B7280', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.03)' } },
                    y: { ticks: { color: '#6B7280' }, grid: { color: 'rgba(255,255,255,0.03)' } }
                }
            }
        });
    },

    renderMonthlyChart(monthlyData) {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;
        this.charts.monthly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.map(d => d.month),
                datasets: [{ label: 'Verifications', data: monthlyData.map(d => d.count), backgroundColor: '#7C3AED', borderRadius: 4 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#9CA3AF' } } },
                scales: {
                    x: { ticks: { color: '#6B7280' }, grid: { color: 'rgba(255,255,255,0.03)' } },
                    y: { ticks: { color: '#6B7280' }, grid: { color: 'rgba(255,255,255,0.03)' } }
                }
            }
        });
    },

    renderDistributionChart(statusDist) {
        const ctx = document.getElementById('distributionChart');
        if (!ctx) return;
        const colors = { active: '#22C55E', revoked: '#EF4444', expired: '#F59E0B' };
        this.charts.distribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: statusDist.map(d => d.status),
                datasets: [{
                    data: statusDist.map(d => d.count),
                    backgroundColor: statusDist.map(d => colors[d.status] || '#6B7280'),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#9CA3AF', padding: 16 } }
                }
            }
        });
    },

    renderTopPluginsChart(topPlugins) {
        const ctx = document.getElementById('topPluginsChart');
        if (!ctx) return;
        const colors = ['#7C3AED', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#8B5CF6'];
        this.charts.topPlugins = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topPlugins.map(d => d.plugin_name),
                datasets: [{
                    label: 'Licenses',
                    data: topPlugins.map(d => d.count),
                    backgroundColor: topPlugins.map((_, i) => colors[i % colors.length]),
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#6B7280' }, grid: { color: 'rgba(255,255,255,0.03)' } },
                    y: { ticks: { color: '#9CA3AF' }, grid: { display: false } }
                }
            }
        });
    },

    renderSummary(data) {
        const container = document.getElementById('analyticsSummary');
        const totalLicenses = data.statusDist.reduce((sum, d) => sum + d.count, 0);
        container.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
                <div class="stat-card" style="cursor:default;">
                    <div class="stat-label">Total Licenses</div>
                    <div class="stat-value" style="font-size:24px;">${totalLicenses}</div>
                </div>
                <div class="stat-card" style="cursor:default;">
                    <div class="stat-label">Total Verifications (30d)</div>
                    <div class="stat-value" style="font-size:24px;">${data.dailyData.reduce((s, d) => s + d.success + d.failed, 0)}</div>
                </div>
                <div class="stat-card" style="cursor:default;">
                    <div class="stat-label">Avg Daily</div>
                    <div class="stat-value" style="font-size:24px;">${Math.round(data.dailyData.reduce((s, d) => s + d.success + d.failed, 0) / 30)}</div>
                </div>
                <div class="stat-card" style="cursor:default;">
                    <div class="stat-label">Top Plugin</div>
                    <div class="stat-value" style="font-size:20px;">${data.topPlugins[0]?.plugin_name || 'N/A'}</div>
                </div>
            </div>
        `;
    }
};