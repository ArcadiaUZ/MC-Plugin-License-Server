// Notifications Page
const NotificationsPage = {
    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Notification Center</div>
                        <div class="card-subtitle">System notifications and alerts</div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-secondary" onclick="NotificationsPage.markAllRead()"><i class="fas fa-check-double"></i> Mark All Read</button>
                        <button class="btn btn-ghost" onclick="NotificationsPage.clearAll()"><i class="fas fa-trash"></i> Clear All</button>
                    </div>
                </div>
                <div id="notificationsList"></div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        const container = document.getElementById('notificationsList');
        UI.showLoading(container);
        
        const data = await API.getNotifications();
        if (!data.success) { UI.showToast('Failed to load notifications', 'error'); return; }
        
        if (!data.notifications || !data.notifications.length) {
            UI.showEmpty(container, '🔔', 'No notifications', 'You\'re all caught up!');
            return;
        }

        const icons = {
            success: { icon: 'fa-check-circle', color: 'var(--success)' },
            warning: { icon: 'fa-exclamation-triangle', color: 'var(--warning)' },
            error: { icon: 'fa-times-circle', color: 'var(--danger)' },
            info: { icon: 'fa-info-circle', color: 'var(--info)' }
        };

        container.innerHTML = data.notifications.map(n => {
            const icon = icons[n.type] || icons.info;
            return `
            <div class="notification-item ${n.read ? '' : 'unread'}" onclick="NotificationsPage.markRead(${n.id})">
                <div class="notif-icon" style="background:${icon.color}22;color:${icon.color}">
                    <i class="fas ${icon.icon}"></i>
                </div>
                <div class="notif-content">
                    <div class="notif-title">${n.title}</div>
                    <div class="notif-message">${n.message || ''}</div>
                    <div class="notif-time">${UI.timeAgo(n.timestamp)}</div>
                </div>
                ${!n.read ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:4px;"></div>' : ''}
            </div>`;
        }).join('');

        // Update badge
        const badge = document.getElementById('notifBadge');
        const dot = document.getElementById('headerNotifDot');
        if (badge) badge.textContent = data.unread || 0;
        if (dot) dot.style.display = data.unread > 0 ? 'block' : 'none';
    },

    async markRead(id) {
        await API.markNotificationRead(id);
        this.loadData();
    },

    async markAllRead() {
        await API.markNotificationRead(null);
        UI.showToast('All marked as read', 'success');
        this.loadData();
    },

    async clearAll() {
        if (!confirm('Clear all notifications?')) return;
        await API.clearNotifications();
        UI.showToast('Notifications cleared', 'success');
        this.loadData();
    }
};