// Customers Page
const CustomersPage = {
    searchTerm: '',

    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Customers</div>
                        <div class="card-subtitle">Manage your customers and their licenses</div>
                    </div>
                    <button class="btn btn-primary" onclick="CustomersPage.showCreateModal()">
                        <i class="fas fa-plus"></i> Add Customer
                    </button>
                </div>
                <div class="search-bar">
                    <div class="search-input-wrap">
                        <span class="search-icon"><i class="fas fa-search"></i></span>
                        <input type="text" id="customerSearch" placeholder="Search by username, discord, telegram..." oninput="CustomersPage.handleSearch()">
                    </div>
                </div>
                <div id="customersList"></div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        const container = document.getElementById('customersList');
        UI.showLoading(container);

        const params = {};
        if (this.searchTerm) params.search = this.searchTerm;

        const data = await API.listCustomers(params);
        if (!data.success || !data.customers || !data.customers.length) {
            UI.showEmpty(container, '👥', 'No customers found', 'Customers will appear here as licenses are created.');
            return;
        }

        container.innerHTML = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr><th>Username</th><th>Discord</th><th>Telegram</th><th>Licenses</th><th>Revenue</th><th>Created</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${data.customers.map(c => `
                            <tr>
                                <td><strong>${c.username || 'Unknown'}</strong></td>
                                <td>${c.discord || '-'}</td>
                                <td>${c.telegram || '-'}</td>
                                <td>${c.licenseCount || 0}</td>
                                <td>$${(c.totalRevenue || 0).toFixed(2)}</td>
                                <td><span class="cell-secondary">${UI.formatDate(c.created_at)}</span></td>
                                <td>
                                    <button class="btn btn-sm btn-ghost" onclick="CustomersPage.viewDetails('${c.id}')">
                                        <i class="fas fa-eye"></i> View
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    handleSearch() {
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
            this.searchTerm = document.getElementById('customerSearch').value;
            this.loadData();
        }, 300);
    },

    showCreateModal() {
        UI.openModal(`
            <div class="form-group">
                <label class="form-label">Username</label>
                <input type="text" id="newCustUsername" class="form-input" placeholder="Username">
            </div>
            <div class="form-group">
                <label class="form-label">Discord</label>
                <input type="text" id="newCustDiscord" class="form-input" placeholder="user#1234">
            </div>
            <div class="form-group">
                <label class="form-label">Telegram</label>
                <input type="text" id="newCustTelegram" class="form-input" placeholder="@username">
            </div>
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" id="newCustEmail" class="form-input" placeholder="email@example.com">
            </div>
            <div class="form-group">
                <label class="form-label">Notes</label>
                <textarea id="newCustNotes" class="form-textarea" rows="3" placeholder="Optional notes..."></textarea>
            </div>
        `, 'Add Customer', `
            <button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="CustomersPage.createCustomer()">Create</button>
        `);
    },

    async createCustomer() {
        const data = await API.createCustomer({
            username: document.getElementById('newCustUsername').value,
            discord: document.getElementById('newCustDiscord').value,
            telegram: document.getElementById('newCustTelegram').value,
            email: document.getElementById('newCustEmail').value,
            notes: document.getElementById('newCustNotes').value
        });
        if (data.success) {
            UI.closeModal();
            UI.showToast('Customer created', 'success');
            this.loadData();
        } else {
            UI.showToast(data.message, 'error');
        }
    },

    async viewDetails(id) {
        const data = await API.getCustomer(id);
        if (!data.success) { UI.showToast(data.message, 'error'); return; }
        const c = data.customer;

        const content = `
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Username</div>
                    <div class="detail-value">${c.username || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Discord</div>
                    <div class="detail-value">${c.discord || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Telegram</div>
                    <div class="detail-value">${c.telegram || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${c.email || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Total Revenue</div>
                    <div class="detail-value" style="color:var(--success);">$${(c.totalRevenue || 0).toFixed(2)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Member Since</div>
                    <div class="detail-value">${UI.formatDate(c.created_at)}</div>
                </div>
                ${c.notes ? `<div class="detail-item full-width">
                    <div class="detail-label">Notes</div>
                    <div class="detail-value">${c.notes}</div>
                </div>` : ''}
                ${c.licenses && c.licenses.length ? `
                <div class="detail-item full-width">
                    <div class="detail-label">Licenses (${c.licenses.length})</div>
                    <div class="detail-value">
                        <div style="max-height:200px;overflow-y:auto;">
                            ${c.licenses.map(l => `
                                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle);font-size:13px;">
                                    <span style="font-family:monospace;color:var(--text-accent);">${l.license_key}</span>
                                    <span>${l.plugin_name}</span>
                                    ${UI.badge(l.status)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>` : ''}
            </div>
        `;
        UI.openModal(content, `Customer: ${c.username || c.discord || 'Unknown'}`);
    }
};