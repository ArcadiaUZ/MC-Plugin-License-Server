// EpicServer License Manager - Reusable UI Components

const UI = {
    toastContainer: null,

    init() {
        this.toastContainer = document.getElementById('toastContainer');
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toastContainer';
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
        }
    },

    // Toast notifications
    showToast(message, type = 'info', title = '') {
        const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ'}</span>
            <div class="toast-content">
                <div class="toast-title">${title || type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        this.toastContainer.appendChild(toast);
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100px)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    },

    // Modal
    openModal(content, title = '', footer = '') {
        let overlay = document.querySelector('.modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = `
            <div class="modal">
                ${title ? `<div class="modal-header"><h2>${title}</h2><button class="modal-close" onclick="UI.closeModal()">×</button></div>` : ''}
                <div class="modal-body">${content}</div>
                ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
            </div>
        `;
        overlay.classList.add('active');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeModal();
        });
    },

    closeModal() {
        const overlay = document.querySelector('.modal-overlay');
        if (overlay) overlay.classList.remove('active');
    },

    // Loading states
    showLoading(container) {
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    },

    showEmpty(container, icon = '📦', title = 'Nothing here yet', message = '') {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${icon}</div>
                <h3>${title}</h3>
                ${message ? `<p>${message}</p>` : ''}
            </div>
        `;
    },

    // Badge
    badge(status) {
        const cls = status ? `badge-${status}` : 'badge-active';
        return `<span class="badge ${cls}">${status || 'unknown'}</span>`;
    },

    // Time formatting
    timeAgo(timestamp) {
        if (!timestamp) return '-';
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 30) return new Date(timestamp).toLocaleDateString();
        if (days > 0) return days + 'd ago';
        if (hours > 0) return hours + 'h ago';
        if (minutes > 0) return minutes + 'm ago';
        return 'just now';
    },

    formatDate(timestamp) {
        if (!timestamp) return '-';
        return new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    formatDateTime(timestamp) {
        if (!timestamp) return '-';
        return new Date(timestamp).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    },

    // Copy to clipboard
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Copied to clipboard!', 'success', 'Copied');
        }).catch(() => {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            this.showToast('Copied to clipboard!', 'success', 'Copied');
        });
    },

    // Confirm dialog
    confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            this.openModal(`
                <p style="font-size:15px;color:var(--text-secondary);margin-bottom:8px;">${message}</p>
            `, title, `
                <button class="btn btn-secondary" onclick="UI.closeModal(); resolve(false)">Cancel</button>
                <button class="btn btn-danger" onclick="UI.closeModal(); resolve(true)">Confirm</button>
            `);
            // Store resolve for later use
            window._confirmResolve = resolve;
        });
    },

    // Pagination
    renderPagination(container, currentPage, total, limit, callback) {
        const totalPages = Math.ceil(total / limit);
        if (totalPages <= 1) { container.innerHTML = ''; return; }
        
        let html = `<div class="pagination">
            <div class="page-info">Showing ${((currentPage - 1) * limit) + 1}-${Math.min(currentPage * limit, total)} of ${total}</div>
            <div class="page-buttons">`;
        
        html += `<button class="page-btn" onclick="(${callback})(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>&laquo;</button>`;
        
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="(${callback})(${i})">${i}</button>`;
        }
        
        html += `<button class="page-btn" onclick="(${callback})(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>&raquo;</button>`;
        html += '</div></div>';
        
        container.innerHTML = html;
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => UI.init());