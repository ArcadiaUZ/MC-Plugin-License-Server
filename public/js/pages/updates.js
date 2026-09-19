// Auto Updates Page
const UpdatesPage = {
    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Plugin Version Manager</div>
                        <div class="card-subtitle">Manage plugin versions and releases</div>
                    </div>
                    <button class="btn btn-primary" onclick="UpdatesPage.showPublishModal()">
                        <i class="fas fa-cloud-upload-alt"></i> Publish Version
                    </button>
                </div>
                <div id="updatesList"></div>
            </div>
        `;
        await this.loadData();
    },

    async loadData() {
        const container = document.getElementById('updatesList');
        UI.showLoading(container);

        const plugins = await API.listPlugins();
        if (!plugins.success || !plugins.plugins || !plugins.plugins.length) {
            UI.showEmpty(container, '📦', 'No plugins found', 'Create a plugin first to manage versions.');
            return;
        }

        let html = '';
        for (const p of plugins.plugins) {
            const versions = await API.getPluginVersions(p.name);
            html += `
                <div style="margin-bottom:20px;padding:20px;background:var(--bg-primary);border-radius:var(--radius-md);border:1px solid var(--border-subtle);">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                        <div>
                            <strong style="font-size:16px;">${p.display_name || p.name}</strong>
                            <span style="color:var(--text-muted);margin-left:8px;">v${p.latest_version}</span>
                        </div>
                        <button class="btn btn-sm btn-primary" onclick="UpdatesPage.showPublishModal('${p.name}')">
                            <i class="fas fa-plus"></i> New Version
                        </button>
                    </div>
                    ${versions.success && versions.versions && versions.versions.length ? `
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${versions.versions.map(v => `
                            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-card);border-radius:var(--radius-md);border:1px solid var(--border-color);">
                                <div>
                                    <span style="font-weight:600;color:var(--accent);">v${v.version}</span>
                                    <span style="color:var(--text-muted);font-size:12px;margin-left:8px;">${UI.formatDateTime(v.created_at)}</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:8px;">
                                    ${v.release_notes ? `<span style="font-size:12px;color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${v.release_notes}</span>` : ''}
                                    <span class="badge ${v.published ? 'badge-active' : 'badge-pending'}">${v.published ? 'Published' : 'Draft'}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>` : '<div style="color:var(--text-muted);font-size:13px;">No versions published yet</div>'}
                </div>
            `;
        }
        container.innerHTML = html;
    },

    showPublishModal(pluginName = '') {
        this.loadPluginSelect(pluginName);
    },

    async loadPluginSelect(selected) {
        const plugins = await API.listPlugins();
        const options = plugins.success && plugins.plugins 
            ? plugins.plugins.map(p => `<option value="${p.name}" ${p.name === selected ? 'selected' : ''}>${p.display_name || p.name}</option>`).join('')
            : '<option value="">No plugins available</option>';

        UI.openModal(`
            <div class="form-group">
                <label class="form-label">Plugin</label>
                <select id="pubPluginName" class="form-select">${options}</select>
            </div>
            <div class="form-group">
                <label class="form-label">Version</label>
                <input type="text" id="pubVersion" class="form-input" placeholder="e.g., 1.0.1">
            </div>
            <div class="form-group">
                <label class="form-label">Release Notes</label>
                <textarea id="pubReleaseNotes" class="form-textarea" rows="4" placeholder="What's new in this version..."></textarea>
            </div>
        `, 'Publish New Version', `
            <button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="UpdatesPage.publishVersion()">Publish</button>
        `);
    },

    async publishVersion() {
        const name = document.getElementById('pubPluginName').value;
        const version = document.getElementById('pubVersion').value;
        if (!name || !version) { UI.showToast('Plugin and version are required', 'error'); return; }
        
        const data = await API.publishVersion(name, {
            version,
            releaseNotes: document.getElementById('pubReleaseNotes').value
        });
        if (data.success) {
            UI.closeModal();
            UI.showToast(`Version ${version} published!`, 'success');
            this.loadData();
        } else {
            UI.showToast(data.message, 'error');
        }
    }
};