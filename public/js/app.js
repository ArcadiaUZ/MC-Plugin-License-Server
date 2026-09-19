// EpicServer License Manager - Main Application
// Router, Auth, and Global Functions

// ============ ROUTER ============
const routes = {
    dashboard: { page: DashboardPage, title: 'Dashboard', breadcrumb: 'Overview & statistics' },
    licenses: { page: LicensesPage, title: 'License Management', breadcrumb: 'Manage license keys' },
    plugins: { page: PluginsPage, title: 'Plugin Management', breadcrumb: 'Manage plugins' },
    servers: { page: ServersPage, title: 'Online Servers', breadcrumb: 'Active server connections' },
    analytics: { page: AnalyticsPage, title: 'Analytics', breadcrumb: 'Statistics & charts' },
    logs: { page: LogsPage, title: 'Activity Logs', breadcrumb: 'System activity tracking' },
    notifications: { page: NotificationsPage, title: 'Notifications', breadcrumb: 'System alerts' },
    customers: { page: CustomersPage, title: 'Customers', breadcrumb: 'Customer management' },
    settings: { page: SettingsPage, title: 'Settings', breadcrumb: 'System configuration' },
    updates: { page: UpdatesPage, title: 'Auto Updates', breadcrumb: 'Plugin version management' },
    crashes: { page: CrashesPage, title: 'Crash Reports', breadcrumb: 'Plugin crash management' },
    security: { page: SecurityPage, title: 'Security', breadcrumb: 'Security dashboard' },
    'api-docs': { page: ApiDocsPage, title: 'API Documentation', breadcrumb: 'API reference' }
};

let currentRoute = 'dashboard';

function navigateTo(route, sub = '') {
    if (!routes[route]) route = 'dashboard';
    currentRoute = route;
    
    // Update hash
    const hash = sub ? `#${route}/${sub}` : `#${route}`;
    if (window.location.hash !== hash) {
        history.pushState(null, '', hash);
    }
    
    // Update sidebar
    document.querySelectorAll('.nav-item[data-route]').forEach(item => {
        item.classList.toggle('active', item.dataset.route === route);
    });
    
    // Update header
    const routeConfig = routes[route];
    document.getElementById('pageTitle').textContent = routeConfig.title;
    document.getElementById('pageBreadcrumb').textContent = routeConfig.breadcrumb;
    
    // Render page
    routeConfig.page.render();
    Animator.pageTransition();
    
    // Close sidebar on mobile
    closeSidebar();
}

function refreshCurrentPage() {
    const route = currentRoute;
    if (routes[route]) {
        routes[route].page.render();
    }
}

// ============ AUTH ============
async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.classList.add('loading');
    btn.disabled = true;
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    const data = await API.login(username, password);
    
    btn.classList.remove('loading');
    btn.disabled = false;
    
    if (data.success) {
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('appLayout').classList.remove('hidden');
        document.getElementById('adminName').textContent = username;
        UI.showToast('Welcome back, ' + username + '!', 'success');
        
        // Load initial data
        navigateTo('dashboard');
        loadNotifications();
        checkServerHealth();
        
        // Periodic refresh
        setInterval(loadNotifications, 30000);
        setInterval(checkServerHealth, 60000);
    } else {
        UI.showToast('Invalid credentials', 'error');
    }
}

function handleLogout() {
    API.logout();
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('appLayout').classList.add('hidden');
    UI.showToast('Logged out successfully', 'info');
}

// ============ SIDEBAR ============
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
}

// ============ THEME ============
function toggleDarkMode() {
    // Always dark mode - this is a toggle for future light mode support
    const icon = document.getElementById('themeIcon');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
    UI.showToast('Theme toggled', 'info');
}

// ============ NOTIFICATIONS ============
async function loadNotifications() {
    const data = await API.getNotifications();
    if (data.success) {
        const badge = document.getElementById('notifBadge');
        const dot = document.getElementById('headerNotifDot');
        const count = data.unread || 0;
        if (badge) badge.textContent = count;
        if (dot) dot.style.display = count > 0 ? 'block' : 'none';
    }
}

// ============ SERVER HEALTH ============
async function checkServerHealth() {
    const data = await API.health();
    const dot = document.getElementById('serverStatusDot');
    const text = document.getElementById('serverStatusText');
    const version = document.getElementById('footerVersion');
    
    if (data.success) {
        dot.className = 'status-dot online';
        text.textContent = 'Online';
        if (version) version.textContent = data.version || '1.0.0';
    } else {
        dot.className = 'status-dot offline';
        text.textContent = 'Offline';
    }
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
    // Check if already authenticated
    if (API.auth) {
        API.getStats().then(data => {
            if (data.success) {
                document.getElementById('loginPage').classList.add('hidden');
                document.getElementById('appLayout').classList.remove('hidden');
                
                // Get stored username
                const stored = localStorage.getItem('epic_username');
                if (stored) document.getElementById('adminName').textContent = stored;
                
                // Handle hash routing
                const hash = window.location.hash.slice(1).split('/');
                const route = hash[0] || 'dashboard';
                navigateTo(route, hash[1] || '');
                
                loadNotifications();
                checkServerHealth();
                
                setInterval(loadNotifications, 30000);
                setInterval(checkServerHealth, 60000);
            }
        });
    }
    
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.slice(1).split('/');
        const route = hash[0] || 'dashboard';
        if (routes[route]) {
            navigateTo(route, hash[1] || '');
        }
    });
    
    // Store username on login
    document.getElementById('loginUsername')?.addEventListener('change', function() {
        localStorage.setItem('epic_username', this.value);
    });
});