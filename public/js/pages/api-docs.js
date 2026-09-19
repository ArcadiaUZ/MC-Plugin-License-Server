// API Documentation Page
const ApiDocsPage = {
    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div style="font-size:18px;font-weight:600;margin-bottom:8px;">API Documentation</div>
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:24px;">REST API reference for the EpicServer License Server</div>

            <div class="api-endpoint">
                <div class="endpoint-header">
                    <span class="method-badge get">GET</span>
                    <span class="endpoint-url">/api/health</span>
                </div>
                <div class="endpoint-desc">Check if the license server is running and healthy.</div>
                <div class="code-block">
                    <button class="copy-code-btn" onclick="UI.copyToClipboard(this.parentElement.textContent.replace('Copy','').trim())">Copy</button>
                    <pre>{
    "success": true,
    "status": "running",
    "timestamp": 1700000000000,
    "version": "1.0.0"
}</pre>
                </div>
            </div>

            <div class="api-endpoint">
                <div class="endpoint-header">
                    <span class="method-badge post">POST</span>
                    <span class="endpoint-url">/api/verify</span>
                </div>
                <div class="endpoint-desc">Verify a license key. Called by plugins during authentication.</div>
                <div class="endpoint-header" style="margin-top:12px;">
                    <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">Request Body:</span>
                </div>
                <div class="code-block">
                    <button class="copy-code-btn" onclick="UI.copyToClipboard(this.parentElement.textContent.replace('Copy','').trim())">Copy</button>
                    <pre>{
    "licenseKey": "EPIC-XXXX-XXXX-XXXX-XXXX",
    "hwid": "generated-hwid-hash",
    "serverId": "server-uuid",
    "serverIp": "127.0.0.1",
    "serverPort": 25565,
    "worldSeed": "optional-seed",
    "pluginName": "EpicTools",
    "pluginVersion": "1.0.0"
}</pre>
                </div>
                <div class="endpoint-header" style="margin-top:12px;">
                    <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">Response (Success):</span>
                </div>
                <div class="code-block">
                    <button class="copy-code-btn" onclick="UI.copyToClipboard(this.parentElement.textContent.replace('Copy','').trim())">Copy</button>
                    <pre>{
    "success": true,
    "message": "License verified successfully",
    "data": {
        "pluginName": "EpicTools",
        "pluginVersion": "1.0.0",
        "expiresAt": 1735689600000,
        "maxServers": 1
    }
}</pre>
                </div>
            </div>

            <div class="api-endpoint">
                <div class="endpoint-header">
                    <span class="method-badge post">POST</span>
                    <span class="endpoint-url">/api/register</span>
                </div>
                <div class="endpoint-desc">Register a new license key. Requires admin authentication.</div>
                <div class="endpoint-header" style="margin-top:12px;">
                    <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">Request Body:</span>
                </div>
                <div class="code-block">
                    <button class="copy-code-btn" onclick="UI.copyToClipboard(this.parentElement.textContent.replace('Copy','').trim())">Copy</button>
                    <pre>{
    "pluginName": "EpicTools",
    "pluginVersion": "1.0.0",
    "ownerDiscord": "user#1234",
    "ownerEmail": "user@example.com",
    "maxServers": 1,
    "expiresInDays": 365,
    "notes": "Premium license"
}</pre>
                </div>
            </div>

            <div class="api-endpoint">
                <div class="endpoint-header">
                    <span class="method-badge get">GET</span>
                    <span class="endpoint-url">/api/list</span>
                </div>
                <div class="endpoint-desc">List all licenses with optional filtering, sorting, and pagination.</div>
                <div class="endpoint-header" style="margin-top:12px;">
                    <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">Query Parameters:</span>
                </div>
                <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
                    <code>status</code> - Filter by status (active, revoked, expired)<br>
                    <code>pluginName</code> - Filter by plugin name<br>
                    <code>search</code> - Search by key, owner, email<br>
                    <code>sortBy</code> - Sort column<br>
                    <code>sortOrder</code> - ASC or DESC<br>
                    <code>page</code> - Page number<br>
                    <code>limit</code> - Items per page
                </div>
            </div>

            <div class="api-endpoint">
                <div class="endpoint-header">
                    <span class="method-badge get">GET</span>
                    <span class="endpoint-url">/api/license/:key</span>
                </div>
                <div class="endpoint-desc">Get detailed information about a specific license.</div>
            </div>

            <div class="api-endpoint">
                <div class="endpoint-header">
                    <span class="method-badge post">POST</span>
                    <span class="endpoint-url">/api/revoke</span>
                </div>
                <div class="endpoint-desc">Revoke an active license.</div>
                <div class="endpoint-header" style="margin-top:12px;">
                    <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">Request Body:</span>
                </div>
                <div class="code-block">
                    <button class="copy-code-btn" onclick="UI.copyToClipboard(this.parentElement.textContent.replace('Copy','').trim())">Copy</button>
                    <pre>{
    "licenseKey": "EPIC-XXXX-XXXX-XXXX-XXXX"
}</pre>
                </div>
            </div>

            <div class="api-endpoint">
                <div class="endpoint-header">
                    <span class="method-badge post">POST</span>
                    <span class="endpoint-url">/api/activate</span>
                </div>
                <div class="endpoint-desc">Activate a revoked or expired license.</div>
            </div>

            <div class="api-endpoint">
                <div class="endpoint-header">
                    <span class="method-badge delete">DELETE</span>
                    <span class="endpoint-url">/api/license/:key</span>
                </div>
                <div class="endpoint-desc">Permanently delete a license.</div>
            </div>

            <div class="api-endpoint">
                <div class="endpoint-header">
                    <span class="method-badge get">GET</span>
                    <span class="endpoint-url">/api/stats</span>
                </div>
                <div class="endpoint-desc">Get dashboard statistics.</div>
            </div>

            <div class="api-endpoint">
                <div class="endpoint-header">
                    <span class="method-badge post">POST</span>
                    <span class="endpoint-url">/api/crashes</span>
                </div>
                <div class="endpoint-desc">Submit a crash report from a plugin.</div>
                <div class="endpoint-header" style="margin-top:12px;">
                    <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">Request Body:</span>
                </div>
                <div class="code-block">
                    <button class="copy-code-btn" onclick="UI.copyToClipboard(this.parentElement.textContent.replace('Copy','').trim())">Copy</button>
                    <pre>{
    "pluginName": "EpicTools",
    "pluginVersion": "1.0.0",
    "javaVersion": "17",
    "serverVersion": "1.20.4",
    "errorMessage": "NullPointerException: ...",
    "stacktrace": "at ...",
    "owner": "user#1234"
}</pre>
                </div>
            </div>

            <div class="api-endpoint">
                <div class="endpoint-header">
                    <span class="method-badge post">POST</span>
                    <span class="endpoint-url">/api/servers/heartbeat</span>
                </div>
                <div class="endpoint-desc">Send a server heartbeat to keep the session alive.</div>
                <div class="endpoint-header" style="margin-top:12px;">
                    <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">Request Body:</span>
                </div>
                <div class="code-block">
                    <button class="copy-code-btn" onclick="UI.copyToClipboard(this.parentElement.textContent.replace('Copy','').trim())">Copy</button>
                    <pre>{
    "licenseKey": "EPIC-XXXX-XXXX-XXXX-XXXX",
    "serverName": "My Server",
    "pluginName": "EpicTools",
    "pluginVersion": "1.0.0",
    "hwid": "hwid-hash",
    "players": 10,
    "country": "US"
}</pre>
                </div>
            </div>

            <div class="card" style="margin-top:24px;">
                <div class="card-title" style="margin-bottom:12px;">Authentication</div>
                <p style="font-size:14px;color:var(--text-secondary);margin-bottom:12px;">All admin endpoints require Basic Authentication. Include the <code>Authorization</code> header with base64-encoded credentials:</p>
                <div class="code-block">
                    <button class="copy-code-btn" onclick="UI.copyToClipboard('Authorization: Basic base64(username:password)')">Copy</button>
                    <pre>Authorization: Basic YWRtaW46Y2hhbmdlbWUxMjM=</pre>
                </div>
            </div>
        `;
    }
};