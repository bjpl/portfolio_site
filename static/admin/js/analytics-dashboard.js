// Analytics Dashboard Module
class AnalyticsDashboard {
    constructor() {
        this.charts = {};
        this.data = {
            pageViews: [],
            visitors: [],
            events: [],
            topPages: [],
            referrers: [],
            devices: {},
            browsers: {},
            realtime: []
        };
        this.timeRange = '7d'; // Default to last 7 days
        this.init();
    }

    async init() {
        await this.loadAnalyticsLibrary();
        this.setupControls();
        await this.fetchData();
        this.renderDashboard();
        this.startRealtimeUpdates();
    }

    async loadAnalyticsLibrary() {
        // Load Chart.js if not already loaded
        if (!window.Chart) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = resolve;
            });
        }
    }

    setupControls() {
        // Time range selector
        const timeRangeSelect = document.getElementById('timeRangeSelect');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', async (e) => {
                this.timeRange = e.target.value;
                await this.fetchData();
                this.updateCharts();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshAnalytics');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await this.fetchData();
                this.updateCharts();
                window.Toast?.show('Analytics data refreshed', 'success');
            });
        }

        // Export button
        const exportBtn = document.getElementById('exportAnalytics');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
    }

    async fetchData() {
        try {
            // In production, this would fetch from your analytics API
            // For now, we'll generate sample data
            this.data = this.generateSampleData();
            this.updateStats();
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            window.Toast?.show('Failed to load analytics data', 'error');
        }
    }

    generateSampleData() {
        const days = this.getDaysInRange();
        const data = {
            pageViews: [],
            visitors: [],
            events: [],
            topPages: [],
            referrers: [],
            devices: {
                desktop: 60,
                mobile: 35,
                tablet: 5
            },
            browsers: {
                Chrome: 65,
                Safari: 20,
                Firefox: 10,
                Edge: 5
            },
            realtime: []
        };

        // Generate page views and visitors
        days.forEach(day => {
            const baseViews = Math.floor(Math.random() * 500) + 100;
            const baseVisitors = Math.floor(baseViews * 0.7);
            
            data.pageViews.push({
                date: day,
                value: baseViews
            });
            
            data.visitors.push({
                date: day,
                value: baseVisitors
            });
        });

        // Generate top pages
        const pages = [
            { path: '/', title: 'Home', views: 1234, avgTime: '2:45' },
            { path: '/portfolio', title: 'Portfolio', views: 892, avgTime: '3:12' },
            { path: '/about', title: 'About', views: 567, avgTime: '1:54' },
            { path: '/contact', title: 'Contact', views: 445, avgTime: '1:23' },
            { path: '/blog', title: 'Blog', views: 389, avgTime: '4:05' }
        ];
        data.topPages = pages;

        // Generate referrers
        const referrers = [
            { source: 'Direct', visits: 890, percentage: 35 },
            { source: 'Google', visits: 678, percentage: 27 },
            { source: 'LinkedIn', visits: 456, percentage: 18 },
            { source: 'Twitter', visits: 234, percentage: 9 },
            { source: 'GitHub', visits: 189, percentage: 7 },
            { source: 'Other', visits: 123, percentage: 4 }
        ];
        data.referrers = referrers;

        // Generate realtime visitors
        for (let i = 0; i < 10; i++) {
            data.realtime.push({
                id: Date.now() + i,
                page: pages[Math.floor(Math.random() * pages.length)].path,
                referrer: referrers[Math.floor(Math.random() * referrers.length)].source,
                device: ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)],
                timestamp: Date.now() - Math.floor(Math.random() * 300000)
            });
        }

        return data;
    }

    getDaysInRange() {
        const days = [];
        const daysCount = this.timeRange === '24h' ? 24 : 
                         this.timeRange === '7d' ? 7 : 
                         this.timeRange === '30d' ? 30 : 7;
        
        for (let i = daysCount - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toISOString().split('T')[0]);
        }
        
        return days;
    }

    updateStats() {
        // Update summary cards
        const totalViews = this.data.pageViews.reduce((sum, item) => sum + item.value, 0);
        const totalVisitors = this.data.visitors.reduce((sum, item) => sum + item.value, 0);
        const avgViews = Math.round(totalViews / this.data.pageViews.length);
        const bounceRate = Math.round(Math.random() * 30 + 20); // Sample bounce rate

        this.updateStatCard('totalViews', totalViews.toLocaleString());
        this.updateStatCard('totalVisitors', totalVisitors.toLocaleString());
        this.updateStatCard('avgViews', avgViews.toLocaleString());
        this.updateStatCard('bounceRate', bounceRate + '%');
    }

    updateStatCard(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    renderDashboard() {
        this.renderPageViewsChart();
        this.renderDeviceChart();
        this.renderBrowserChart();
        this.renderTopPagesTable();
        this.renderReferrersTable();
        this.renderRealtimeList();
    }

    renderPageViewsChart() {
        const ctx = document.getElementById('pageViewsChart');
        if (!ctx) return;

        if (this.charts.pageViews) {
            this.charts.pageViews.destroy();
        }

        this.charts.pageViews = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.data.pageViews.map(item => item.date),
                datasets: [{
                    label: 'Page Views',
                    data: this.data.pageViews.map(item => item.value),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Unique Visitors',
                    data: this.data.visitors.map(item => item.value),
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderDeviceChart() {
        const ctx = document.getElementById('deviceChart');
        if (!ctx) return;

        if (this.charts.device) {
            this.charts.device.destroy();
        }

        this.charts.device = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(this.data.devices),
                datasets: [{
                    data: Object.values(this.data.devices),
                    backgroundColor: [
                        '#667eea',
                        '#48bb78',
                        '#ed8936'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderBrowserChart() {
        const ctx = document.getElementById('browserChart');
        if (!ctx) return;

        if (this.charts.browser) {
            this.charts.browser.destroy();
        }

        this.charts.browser = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(this.data.browsers),
                datasets: [{
                    label: 'Browser Usage %',
                    data: Object.values(this.data.browsers),
                    backgroundColor: '#764ba2'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    renderTopPagesTable() {
        const tbody = document.getElementById('topPagesTable');
        if (!tbody) return;

        tbody.innerHTML = this.data.topPages.map((page, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${page.title}</td>
                <td>${page.path}</td>
                <td>${page.views.toLocaleString()}</td>
                <td>${page.avgTime}</td>
            </tr>
        `).join('');
    }

    renderReferrersTable() {
        const tbody = document.getElementById('referrersTable');
        if (!tbody) return;

        tbody.innerHTML = this.data.referrers.map(referrer => `
            <tr>
                <td>${referrer.source}</td>
                <td>${referrer.visits.toLocaleString()}</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${referrer.percentage}%"></div>
                        <span class="progress-text">${referrer.percentage}%</span>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderRealtimeList() {
        const list = document.getElementById('realtimeList');
        if (!list) return;

        list.innerHTML = this.data.realtime.map(visitor => {
            const timeAgo = this.getTimeAgo(visitor.timestamp);
            return `
                <div class="realtime-item">
                    <div class="visitor-info">
                        <span class="device-icon">${this.getDeviceIcon(visitor.device)}</span>
                        <div>
                            <div class="page">${visitor.page}</div>
                            <div class="meta">from ${visitor.referrer} • ${timeAgo}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getDeviceIcon(device) {
        const icons = {
            desktop: '🖥️',
            mobile: '📱',
            tablet: '📋'
        };
        return icons[device] || '📱';
    }

    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    }

    updateCharts() {
        this.renderPageViewsChart();
        this.renderDeviceChart();
        this.renderBrowserChart();
        this.renderTopPagesTable();
        this.renderReferrersTable();
    }

    startRealtimeUpdates() {
        // Update realtime data every 5 seconds
        setInterval(() => {
            // Simulate new visitor
            if (Math.random() > 0.7) {
                const pages = ['/portfolio', '/about', '/contact', '/blog', '/'];
                const referrers = ['Direct', 'Google', 'LinkedIn', 'Twitter'];
                const devices = ['desktop', 'mobile', 'tablet'];
                
                this.data.realtime.unshift({
                    id: Date.now(),
                    page: pages[Math.floor(Math.random() * pages.length)],
                    referrer: referrers[Math.floor(Math.random() * referrers.length)],
                    device: devices[Math.floor(Math.random() * devices.length)],
                    timestamp: Date.now()
                });
                
                // Keep only last 10 visitors
                this.data.realtime = this.data.realtime.slice(0, 10);
                this.renderRealtimeList();
            }
        }, 5000);
    }

    exportData() {
        const exportData = {
            dateRange: this.timeRange,
            exportDate: new Date().toISOString(),
            data: this.data
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        window.Toast?.show('Analytics data exported', 'success');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.analyticsDashboard = new AnalyticsDashboard();
    });
} else {
    window.analyticsDashboard = new AnalyticsDashboard();
}