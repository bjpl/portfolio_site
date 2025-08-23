// Analytics JavaScript
const API_BASE = 'http://localhost:3000/api';

class Analytics {
  constructor() {
    this.currentTimeRange = '30d';
    this.charts = {};
    this.data = {
      overview: {},
      pages: [],
      sources: [],
      devices: {},
      geography: []
    };
  }

  async init() {
    this.checkAuthentication();
    await this.loadAnalytics();
    this.setupEventListeners();
    this.setupCharts();
  }

  checkAuthentication() {
    if (!window.auth || !window.auth.isAuthenticated()) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  }

  setupEventListeners() {
    // Time range selector
    const timeRangeSelect = document.getElementById('time-range');
    if (timeRangeSelect) {
      timeRangeSelect.addEventListener('change', (e) => {
        this.currentTimeRange = e.target.value;
        this.loadAnalytics();
      });
    }

    // Export data button
    const exportBtn = document.querySelector('[onclick="exportData()"]');
    if (exportBtn) {
      exportBtn.onclick = () => this.exportData();
    }

    // Refresh button
    const refreshBtn = document.querySelector('[onclick="refreshAnalytics()"]');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.refreshAnalytics();
    }
  }

  async loadAnalytics() {
    try {
      // Show loading state
      this.showLoading(true);

      // Load all analytics data in parallel
      const [overview, pages, sources, devices, geography] = await Promise.all([
        this.loadOverview(),
        this.loadPages(),
        this.loadSources(),
        this.loadDevices(),
        this.loadGeography()
      ]);

      // Update UI with loaded data
      this.updateOverviewDisplay(overview);
      this.updatePagesDisplay(pages);
      this.updateSourcesDisplay(sources);
      this.updateDevicesDisplay(devices);
      this.updateGeographyDisplay(geography);

      // Load time series data for charts
      await this.loadTimeSeriesData();

    } catch (error) {
      console.error('Failed to load analytics:', error);
      this.showNotification('Failed to load analytics data', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async loadOverview() {
    try {
      const response = await this.makeRequest(`/analytics/overview?timeRange=${this.currentTimeRange}`);
      this.data.overview = response;
      return response;
    } catch (error) {
      console.error('Failed to load overview:', error);
      return { overview: {}, comparison: {} };
    }
  }

  async loadPages() {
    try {
      const response = await this.makeRequest(`/analytics/pages?timeRange=${this.currentTimeRange}&limit=10`);
      this.data.pages = response.pages || [];
      return response;
    } catch (error) {
      console.error('Failed to load pages:', error);
      return { pages: [] };
    }
  }

  async loadSources() {
    try {
      const response = await this.makeRequest(`/analytics/sources?timeRange=${this.currentTimeRange}`);
      this.data.sources = response.sources || [];
      return response;
    } catch (error) {
      console.error('Failed to load sources:', error);
      return { sources: [] };
    }
  }

  async loadDevices() {
    try {
      const response = await this.makeRequest(`/analytics/devices?timeRange=${this.currentTimeRange}`);
      this.data.devices = response;
      return response;
    } catch (error) {
      console.error('Failed to load devices:', error);
      return { deviceTypes: [], browsers: [], operatingSystems: [] };
    }
  }

  async loadGeography() {
    try {
      const response = await this.makeRequest(`/analytics/geography?timeRange=${this.currentTimeRange}`);
      this.data.geography = response.countries || [];
      return response;
    } catch (error) {
      console.error('Failed to load geography:', error);
      return { countries: [] };
    }
  }

  async loadTimeSeriesData() {
    try {
      const [visitorsData, viewsData] = await Promise.all([
        this.makeRequest(`/analytics/timeseries?timeRange=${this.currentTimeRange}&metric=visitors`),
        this.makeRequest(`/analytics/timeseries?timeRange=${this.currentTimeRange}&metric=views`)
      ]);

      this.updateVisitorsChart(visitorsData.data);
      
    } catch (error) {
      console.error('Failed to load time series data:', error);
    }
  }

  updateOverviewDisplay(data) {
    const overview = data.overview || {};
    const comparison = data.comparison || {};

    // Update main stats
    this.updateElement('total-visitors', this.formatNumber(overview.uniqueVisitors || 0));
    this.updateElement('page-views', this.formatNumber(overview.totalViews || 0));
    this.updateElement('bounce-rate', `${overview.bounceRate || 0}%`);
    this.updateElement('avg-session', overview.avgSessionDuration || '0:00');

    // Update comparison indicators (if available)
    this.updateStatChange('total-visitors', comparison.visitorsChange);
    this.updateStatChange('page-views', comparison.viewsChange);
  }

  updatePagesDisplay(data) {
    const container = document.querySelector('#pages-container .content-list');
    if (!container || !data.pages) return;

    const pages = data.pages.slice(0, 4); // Show top 4 pages

    container.innerHTML = pages.map(page => `
      <div class="content-item">
        <div class="content-info">
          <h4>${page.page}</h4>
          <p>${page.title || 'Untitled'} • ${this.formatNumber(page.views)} views • ${page.percentage}% of traffic</p>
        </div>
        <div class="content-actions">
          <span class="badge badge-success">📈 ${page.percentage}%</span>
        </div>
      </div>
    `).join('');
  }

  updateSourcesDisplay(data) {
    // Update traffic sources pie chart area
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer && data.sources) {
      // For now, just update with text. Could implement actual charts later.
      const topSources = data.sources.slice(0, 5);
      const sourcesList = topSources.map(source => 
        `${this.getSourceEmoji(source.category)} ${source.source}: ${source.percentage || 0}%`
      ).join('<br>');
      
      chartContainer.innerHTML = `
        <div style="text-align: left;">
          <strong>Top Traffic Sources:</strong><br><br>
          ${sourcesList}
        </div>
      `;
    }
  }

  updateDevicesDisplay(data) {
    // Update device type percentages
    if (data.deviceTypes) {
      const deviceMap = {
        'Desktop': '🖥️',
        'Mobile': '📱',
        'Tablet': '📱'
      };

      data.deviceTypes.forEach(device => {
        const deviceName = device.deviceType.toLowerCase();
        const percentage = parseFloat(device.percentage || 0);
        
        // Update progress bar if exists
        const progressBar = document.querySelector(`[data-device="${deviceName}"] .progress-bar`);
        if (progressBar) {
          progressBar.style.width = `${percentage}%`;
        }
      });
    }

    // Update browser stats
    if (data.browsers) {
      const browserContainer = document.querySelector('[data-stats="browsers"]');
      if (browserContainer) {
        browserContainer.innerHTML = data.browsers.slice(0, 4).map(browser => `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${browser.browser}</span>
            <span style="font-size: 14px;">${browser.percentage}%</span>
          </div>
        `).join('');
      }
    }
  }

  updateGeographyDisplay(data) {
    const container = document.querySelector('[data-section="geography"] .content-list');
    if (!container || !data.countries) return;

    const countries = data.countries.slice(0, 4);

    container.innerHTML = countries.map(country => `
      <div class="content-item">
        <div class="content-info">
          <h4>${this.getCountryFlag(country.country)} ${country.country}</h4>
          <p>${this.formatNumber(country.visits)} visitors • ${country.percentage}% of traffic</p>
        </div>
        <div class="content-actions">
          <span class="badge badge-primary">${country.percentage}%</span>
        </div>
      </div>
    `).join('');
  }

  updateVisitorsChart(timeSeriesData) {
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer || !timeSeriesData) return;

    // Simple text-based chart representation
    const totalDataPoints = timeSeriesData.length;
    const maxValue = Math.max(...timeSeriesData.map(d => d.value));
    const minValue = Math.min(...timeSeriesData.map(d => d.value));

    chartContainer.innerHTML = `
      <div style="text-align: center;">
        <strong>Visitors Over Time</strong><br><br>
        <div style="text-align: left;">
          Max: ${this.formatNumber(maxValue)} visitors<br>
          Min: ${this.formatNumber(minValue)} visitors<br>
          Data points: ${totalDataPoints}<br><br>
          <em>📈 Interactive chart would display here with Chart.js</em>
        </div>
      </div>
    `;
  }

  setupCharts() {
    // Initialize Chart.js charts
    const chartConfigs = {
      visitors: {
        type: 'line',
        canvas: 'visitorsChart',
        data: this.data.overview?.recentVisits || []
      },
      sources: {
        type: 'doughnut',
        canvas: 'sourcesChart',
        data: this.data.sources || []
      },
      devices: {
        type: 'pie',
        canvas: 'devicesChart',
        data: this.data.devices || []
      }
    };

    Object.entries(chartConfigs).forEach(([key, config]) => {
      const canvas = document.getElementById(config.canvas);
      if (canvas && typeof Chart !== 'undefined') {
        new Chart(canvas.getContext('2d'), {
          type: config.type,
          data: this.formatChartData(config.type, config.data),
          options: this.getChartOptions(config.type)
        });
      }
    });
  }

  formatChartData(type, data) {
    if (type === 'line') {
      return {
        labels: data.map(d => d.date),
        datasets: [{
          label: 'Visitors',
          data: data.map(d => d.count),
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4
        }]
      };
    } else if (type === 'doughnut' || type === 'pie') {
      return {
        labels: data.map(d => d.name),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: ['#667eea', '#48bb78', '#ed8936', '#f56565', '#9f7aea']
        }]
      };
    }
    return { labels: [], datasets: [] };
  }

  getChartOptions(type) {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: type === 'line' ? 'bottom' : 'right'
        }
      }
    };

    if (type === 'line') {
      baseOptions.scales = {
        y: { beginAtZero: true }
      };
    }

    return baseOptions;
  }

  async exportData() {
    try {
      const exportData = {
        overview: this.data.overview,
        pages: this.data.pages,
        sources: this.data.sources,
        devices: this.data.devices,
        geography: this.data.geography,
        timeRange: this.currentTimeRange,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${this.currentTimeRange}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification('Analytics data exported successfully', 'success');

    } catch (error) {
      console.error('Export failed:', error);
      this.showNotification('Failed to export data', 'error');
    }
  }

  async refreshAnalytics() {
    await this.loadAnalytics();
    this.showNotification('Analytics data refreshed', 'success');
  }

  // Helper methods
  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  updateStatChange(statId, change) {
    const container = document.getElementById(statId)?.parentElement;
    if (!container || change === undefined) return;

    const description = container.querySelector('.description');
    if (description) {
      const sign = change >= 0 ? '+' : '';
      const direction = change >= 0 ? '📈' : '📉';
      description.textContent = `${direction} ${sign}${change}% from previous period`;
    }
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  getSourceEmoji(category) {
    const emojis = {
      'Direct': '🔗',
      'Search': '🔍',
      'Social': '📱',
      'Code Repository': '💻',
      'Other': '🌐'
    };
    return emojis[category] || '🌐';
  }

  getCountryFlag(country) {
    const flags = {
      'United States': '🇺🇸',
      'United Kingdom': '🇬🇧',
      'Germany': '🇩🇪',
      'Canada': '🇨🇦',
      'France': '🇫🇷',
      'Australia': '🇦🇺',
      'Japan': '🇯🇵',
      'Unknown': '🌍'
    };
    return flags[country] || '🌍';
  }

  showLoading(show) {
    // Could implement loading spinners here
    console.log(show ? 'Loading analytics...' : 'Analytics loaded');
  }

  async makeRequest(endpoint, options = {}) {
    const token = localStorage.getItem('adminToken');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      
      if (response.status === 401) {
        window.location.href = 'login.html';
        return null;
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  showNotification(message, type = 'info') {
    if (window.Toast) {
      switch(type) {
        case 'success':
          Toast.success(message);
          break;
        case 'error':
          Toast.error(message);
          break;
        case 'warning':
          Toast.warning(message);
          break;
        default:
          Toast.info(message);
      }
    } else {
      alert(message);
    }
  }
}

// Global instance
const analytics = new Analytics();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  analytics.init();
});

// Global functions for HTML compatibility
function exportData() {
  analytics.exportData();
}

function refreshAnalytics() {
  analytics.refreshAnalytics();
}

function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = 'login.html';
  }
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
}