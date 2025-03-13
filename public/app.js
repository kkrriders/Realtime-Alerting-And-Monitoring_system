// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the application
  const app = new MonitoringApp();
  app.initialize();
});

/**
 * Main Monitoring Application Class
 */
class MonitoringApp {
  constructor() {
    // DOM elements
    this.statusCards = document.getElementById('status-cards');
    this.alertList = document.getElementById('alert-list');
    this.aiInsights = document.getElementById('ai-insights');
    this.systemStatus = document.getElementById('system-status');
    this.activeAlertsCount = document.getElementById('active-alerts-count');
    this.resourcesCount = document.getElementById('resources-count');
    this.aiStatus = document.getElementById('ai-status');
    this.grafanaIframe = document.getElementById('grafana-iframe');
    
    // Templates
    this.alertTemplate = document.getElementById('alert-template');
    this.insightTemplate = document.getElementById('insight-template');
    
    // Button handlers
    this.refreshBtn = document.getElementById('refresh-btn');
    this.grafanaBtn = document.getElementById('grafana-btn');
    
    // Navigation
    this.navLinks = {
      dashboard: document.getElementById('dashboard-link'),
      alerts: document.getElementById('alerts-link'),
      metrics: document.getElementById('metrics-link'),
      aiInsights: document.getElementById('ai-insights-link'),
      settings: document.getElementById('settings-link')
    };
    
    // Data
    this.activeAlerts = [];
    this.insights = [];
    
    // Socket connection
    this.socket = null;
  }
  
  /**
   * Initialize the application
   */
  initialize() {
    this.setupEventListeners();
    this.connectWebSocket();
    this.loadInitialData();
    
    // Set up auto-refresh every 30 seconds
    setInterval(() => this.refreshData(), 30000);
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Refresh button
    this.refreshBtn.addEventListener('click', () => {
      this.refreshData();
    });
    
    // Grafana button
    this.grafanaBtn.addEventListener('click', () => {
      window.open('/grafana', '_blank');
    });
    
    // Navigation links
    Object.keys(this.navLinks).forEach(key => {
      this.navLinks[key].addEventListener('click', (e) => {
        e.preventDefault();
        this.handleNavigation(key);
      });
    });
    
    // Handle alert acknowledgement clicks (event delegation)
    this.alertList.addEventListener('click', (event) => {
      if (event.target.classList.contains('acknowledge-btn')) {
        const alertItem = event.target.closest('.alert-item');
        if (alertItem && alertItem.dataset.id) {
          this.acknowledgeAlert(alertItem.dataset.id);
        }
      }
    });
  }
  
  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket() {
    try {
      this.socket = io();
      
      // Subscribe to alert channel
      this.socket.emit('subscribe', 'alerts');
      
      // Handle incoming alerts
      this.socket.on('alert', (alert) => {
        this.handleNewAlert(alert);
      });
      
      // Handle incoming insights
      this.socket.on('insight', (insight) => {
        this.handleNewInsight(insight);
      });
      
      // Handle status updates
      this.socket.on('status', (status) => {
        this.updateSystemStatus(status);
      });
      
      // Handle connection events
      this.socket.on('connect', () => {
        console.log('Connected to server');
      });
      
      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
      });
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }
  
  /**
   * Load initial data
   */
  loadInitialData() {
    Promise.all([
      this.fetchActiveAlerts(),
      this.fetchAiInsights(),
      this.fetchSystemStatus()
    ]).then(() => {
      console.log('Initial data loaded');
    }).catch(error => {
      console.error('Error loading initial data:', error);
    });
  }
  
  /**
   * Refresh all data
   */
  refreshData() {
    this.refreshBtn.disabled = true;
    this.refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refreshing...';
    
    Promise.all([
      this.fetchActiveAlerts(),
      this.fetchAiInsights(),
      this.fetchSystemStatus()
    ]).then(() => {
      this.refreshBtn.disabled = false;
      this.refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
      
      // Show refresh notification
      this.showToast('Data refreshed successfully');
    }).catch(error => {
      console.error('Error refreshing data:', error);
      this.refreshBtn.disabled = false;
      this.refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
      
      // Show error notification
      this.showToast('Failed to refresh data', 'error');
    });
  }
  
  /**
   * Fetch active alerts from the API
   */
  async fetchActiveAlerts() {
    try {
      const response = await fetch('/api/alerts/active');
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      
      const data = await response.json();
      this.activeAlerts = data.alerts || [];
      
      this.updateActiveAlertsCount();
      this.renderAlerts();
      
      return data;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      
      // Show sample data in development
      if (this.isDevelopment()) {
        this.activeAlerts = this.getSampleAlerts();
        this.updateActiveAlertsCount();
        this.renderAlerts();
      }
      
      throw error;
    }
  }
  
  /**
   * Fetch AI insights from the API
   */
  async fetchAiInsights() {
    try {
      const response = await fetch('/api/insights');
      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }
      
      const data = await response.json();
      this.insights = data.insights || [];
      
      this.renderInsights();
      
      return data;
    } catch (error) {
      console.error('Error fetching insights:', error);
      
      // Show sample data in development
      if (this.isDevelopment()) {
        this.insights = this.getSampleInsights();
        this.renderInsights();
      }
      
      throw error;
    }
  }
  
  /**
   * Fetch system status from the API
   */
  async fetchSystemStatus() {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) {
        throw new Error('Failed to fetch system status');
      }
      
      const data = await response.json();
      this.updateSystemStatus(data);
      
      return data;
    } catch (error) {
      console.error('Error fetching system status:', error);
      
      // Show sample data in development
      if (this.isDevelopment()) {
        this.updateSystemStatus(this.getSampleStatus());
      }
      
      throw error;
    }
  }
  
  /**
   * Update the system status display
   */
  updateSystemStatus(status) {
    if (this.systemStatus) {
      this.systemStatus.textContent = status.status || 'Unknown';
      
      // Update the color based on status
      const parentCard = this.systemStatus.closest('.card');
      if (parentCard) {
        parentCard.className = 'card text-white';
        
        switch (status.status) {
          case 'Healthy':
            parentCard.classList.add('bg-primary');
            break;
          case 'Warning':
            parentCard.classList.add('bg-warning');
            break;
          case 'Critical':
            parentCard.classList.add('bg-danger');
            break;
          default:
            parentCard.classList.add('bg-primary');
        }
      }
    }
    
    if (this.resourcesCount) {
      this.resourcesCount.textContent = status.resourcesCount || '0';
    }
    
    if (this.aiStatus) {
      this.aiStatus.textContent = status.aiStatus || 'Inactive';
    }
  }
  
  /**
   * Update the active alerts count
   */
  updateActiveAlertsCount() {
    if (this.activeAlertsCount) {
      this.activeAlertsCount.textContent = this.activeAlerts.length;
      
      // Update the color based on count
      const parentCard = this.activeAlertsCount.closest('.card');
      if (parentCard) {
        parentCard.className = 'card text-white';
        
        if (this.activeAlerts.length === 0) {
          parentCard.classList.add('bg-success');
        } else if (this.activeAlerts.some(alert => alert.severity === 'critical')) {
          parentCard.classList.add('bg-danger');
        } else if (this.activeAlerts.some(alert => alert.severity === 'error')) {
          parentCard.classList.add('bg-warning');
        } else {
          parentCard.classList.add('bg-info');
        }
      }
    }
  }
  
  /**
   * Render alerts in the UI
   */
  renderAlerts() {
    if (!this.alertList) return;
    
    // Clear current content
    this.alertList.innerHTML = '';
    
    if (this.activeAlerts.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder-content';
      placeholder.innerHTML = '<p class="text-center text-muted">No active alerts</p>';
      this.alertList.appendChild(placeholder);
      return;
    }
    
    // Render each alert
    this.activeAlerts.forEach(alert => {
      const alertElement = this.createAlertElement(alert);
      this.alertList.appendChild(alertElement);
    });
  }
  
  /**
   * Create an alert element from template
   */
  createAlertElement(alert) {
    const template = this.alertTemplate.content.cloneNode(true);
    const alertItem = template.querySelector('.alert-item');
    
    // Set data attribute for ID
    alertItem.dataset.id = alert.id;
    
    // Set severity indicator
    const severityIndicator = alertItem.querySelector('.alert-severity');
    severityIndicator.classList.add(alert.severity);
    
    // Set alert content
    alertItem.querySelector('.alert-name').textContent = alert.name;
    alertItem.querySelector('.alert-description').textContent = alert.description || alert.annotations?.summary || '';
    
    // Set meta information
    const timeSpan = alertItem.querySelector('.alert-time');
    timeSpan.textContent = this.formatTime(alert.startsAt);
    timeSpan.title = new Date(alert.startsAt).toLocaleString();
    
    const sourceSpan = alertItem.querySelector('.alert-source');
    sourceSpan.textContent = alert.source;
    
    return alertItem;
  }
  
  /**
   * Render insights in the UI
   */
  renderInsights() {
    if (!this.aiInsights) return;
    
    // Clear current content
    this.aiInsights.innerHTML = '';
    
    if (this.insights.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder-content';
      placeholder.innerHTML = '<p class="text-center text-muted">No insights available</p>';
      this.aiInsights.appendChild(placeholder);
      return;
    }
    
    // Render each insight
    this.insights.forEach(insight => {
      const insightElement = this.createInsightElement(insight);
      this.aiInsights.appendChild(insightElement);
    });
  }
  
  /**
   * Create an insight element from template
   */
  createInsightElement(insight) {
    const template = this.insightTemplate.content.cloneNode(true);
    const insightItem = template.querySelector('.insight-item');
    
    // Create icon
    const iconElement = insightItem.querySelector('.insight-icon');
    const icon = document.createElement('i');
    
    switch (insight.type) {
      case 'trend':
        icon.className = 'bi bi-graph-up';
        break;
      case 'anomaly':
        icon.className = 'bi bi-exclamation-triangle';
        break;
      case 'prediction':
        icon.className = 'bi bi-lightbulb';
        break;
      case 'recommendation':
        icon.className = 'bi bi-check-circle';
        break;
      default:
        icon.className = 'bi bi-info-circle';
    }
    
    iconElement.appendChild(icon);
    
    // Set insight content
    insightItem.querySelector('.insight-title').textContent = insight.title;
    insightItem.querySelector('.insight-description').textContent = insight.description;
    
    // Set meta information
    const timeSpan = insightItem.querySelector('.insight-time');
    timeSpan.textContent = this.formatTime(insight.timestamp);
    timeSpan.title = new Date(insight.timestamp).toLocaleString();
    
    const confidenceSpan = insightItem.querySelector('.insight-confidence');
    if (insight.confidence) {
      confidenceSpan.textContent = `Confidence: ${Math.round(insight.confidence * 100)}%`;
    } else {
      confidenceSpan.style.display = 'none';
    }
    
    return insightItem;
  }
  
  /**
   * Handle a new alert coming in via WebSocket
   */
  handleNewAlert(alert) {
    // Check if this alert already exists
    const existingIndex = this.activeAlerts.findIndex(a => a.id === alert.id);
    
    if (existingIndex >= 0) {
      // Update existing alert
      this.activeAlerts[existingIndex] = alert;
    } else {
      // Add new alert
      this.activeAlerts.push(alert);
      
      // Play notification sound if enabled
      this.playNotificationSound();
      
      // Show notification
      this.showToast(`New alert: ${alert.name}`, alert.severity);
    }
    
    // Update the UI
    this.updateActiveAlertsCount();
    this.renderAlerts();
  }
  
  /**
   * Handle a new insight coming in via WebSocket
   */
  handleNewInsight(insight) {
    // Add new insight to the top of the list
    this.insights.unshift(insight);
    
    // Limit to 10 insights
    if (this.insights.length > 10) {
      this.insights = this.insights.slice(0, 10);
    }
    
    // Update the UI
    this.renderInsights();
    
    // Show notification
    this.showToast(`New insight: ${insight.title}`, 'info');
  }
  
  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId) {
    // Find the alert
    const alertIndex = this.activeAlerts.findIndex(a => a.id === alertId);
    if (alertIndex === -1) return;
    
    // Optimistically update UI
    this.activeAlerts.splice(alertIndex, 1);
    this.updateActiveAlertsCount();
    this.renderAlerts();
    
    // Send acknowledgement to server
    fetch(`/api/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => {
      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }
      return response.json();
    }).then(data => {
      this.showToast('Alert acknowledged');
    }).catch(error => {
      console.error('Error acknowledging alert:', error);
      
      // Revert the optimistic update
      this.fetchActiveAlerts();
      
      this.showToast('Failed to acknowledge alert', 'error');
    });
  }
  
  /**
   * Handle navigation between sections
   */
  handleNavigation(section) {
    // First reset all navigation links
    Object.values(this.navLinks).forEach(link => {
      link.classList.remove('active');
    });
    
    // Set the active link
    this.navLinks[section].classList.add('active');
    
    // In a real application, this would change the view
    // For this demo, just log the navigation
    console.log(`Navigating to ${section}`);
    
    // Show a toast notification
    this.showToast(`Navigation to ${section} would happen here`);
  }
  
  /**
   * Format a timestamp for display
   */
  formatTime(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return 'Just now';
    } else if (diffMin < 60) {
      return `${diffMin}m ago`;
    } else if (diffHour < 24) {
      return `${diffHour}h ago`;
    } else if (diffDay < 7) {
      return `${diffDay}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
  
  /**
   * Show a toast notification
   */
  showToast(message, type = 'success') {
    // In a real application, this would show a toast notification
    // For this demo, just log to console
    console.log(`Toast (${type}):`, message);
  }
  
  /**
   * Play a notification sound
   */
  playNotificationSound() {
    // In a real application, this would play a sound
    // For this demo, just log to console
    console.log('Would play notification sound');
  }
  
  /**
   * Check if running in development mode
   */
  isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
  }
  
  /**
   * Get sample alerts for development
   */
  getSampleAlerts() {
    return [
      {
        id: 'cpu_high_1',
        name: 'High CPU Usage',
        description: 'CPU usage above 80% for 5 minutes',
        severity: 'warning',
        status: 'firing',
        source: 'prometheus',
        startsAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      },
      {
        id: 'memory_high_1',
        name: 'High Memory Usage',
        description: 'Memory usage above 90% for 10 minutes',
        severity: 'error',
        status: 'firing',
        source: 'prometheus',
        startsAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      {
        id: 'ai_anomaly_1',
        name: 'AI-Detected Anomaly',
        description: 'Unusual network traffic pattern detected',
        severity: 'critical',
        status: 'firing',
        source: 'ai',
        startsAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      }
    ];
  }
  
  /**
   * Get sample insights for development
   */
  getSampleInsights() {
    return [
      {
        id: 'trend_1',
        title: 'Upward Memory Trend',
        description: 'Memory usage has been increasing steadily over the past 24 hours, expected to reach 85% within 6 hours.',
        type: 'trend',
        confidence: 0.92,
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString()
      },
      {
        id: 'recommendation_1',
        title: 'Database Query Optimization',
        description: 'Consider optimizing the frequently run query "SELECT * FROM users WHERE last_login > ?" which is causing high CPU usage.',
        type: 'recommendation',
        confidence: 0.85,
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString()
      },
      {
        id: 'anomaly_1',
        title: 'Unusual Login Pattern',
        description: 'Detected unusual login attempts from IP range 192.168.1.x, significantly above normal patterns.',
        type: 'anomaly',
        confidence: 0.78,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'prediction_1',
        title: 'Forecast: High Traffic Period',
        description: 'Based on historical patterns, expect 2-3x normal traffic between 2:00 PM and 5:00 PM today.',
        type: 'prediction',
        confidence: 0.89,
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    ];
  }
  
  /**
   * Get sample system status for development
   */
  getSampleStatus() {
    return {
      status: 'Healthy',
      resourcesCount: 12,
      aiStatus: 'Active',
      uptimeHours: 124,
      lastUpdated: new Date().toISOString()
    };
  }
} 