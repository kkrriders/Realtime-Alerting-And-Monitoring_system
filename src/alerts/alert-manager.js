import fs from 'fs/promises';
import path from 'path';
import winston from 'winston';
import { EventEmitter } from 'events';
import { WebSocketServer, WebSocket } from 'ws';
import alertAnalyzer from '../ai-integration/alert-analyzer.js';

// Ensure logs directory exists
async function ensureLogDirectory() {
  const logDir = path.join(process.cwd(), 'logs');
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (error) {
    // Ignore errors if directory already exists
    if (error.code !== 'EEXIST') {
      console.error('Error creating logs directory:', error.message);
    }
  }
}

// Configure logger with default configuration first
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'alert-manager' },
  transports: [
    new winston.transports.Console()
  ]
});

// Ensure logs directory exists and update logger
(async () => {
  try {
    await ensureLogDirectory();
    // Add file transport after ensuring directory exists
    logger.add(new winston.transports.File({ filename: 'logs/alerts.log' }));
  } catch (error) {
    console.error('Error initializing logger:', error);
  }
})();

// Alert severity levels
const SEVERITY_LEVELS = {
  'info': 0,
  'warning': 1,
  'error': 2,
  'critical': 3
};

class AlertManager extends EventEmitter {
  constructor() {
    super();
    this.alertRules = [];
    this.channels = [];
    this.activeAlerts = new Map(); // Key: alertId, Value: alert object
    this.alertHistory = []; // Store alerts for historical analysis
    this.wsServer = null;
    this.wsClients = new Set();
    this.initialized = false;
  }

  /**
   * Initialize the Alert Manager
   */
  async initialize() {
    try {
      logger.info('Initializing Alert Manager...');
      
      // Ensure config directories exist
      await this.ensureConfigDirectories();
      
      // Load alert rules and notification channels
      await this.loadAlertRules();
      await this.loadNotificationChannels();
      
      // Initialize AI integration
      await alertAnalyzer.initialize();
      
      // Set up WebSocket server for real-time alerts if enabled
      const wsEnabled = this.channels.some(channel => 
        channel.type === 'websocket' && channel.enabled
      );
      
      if (wsEnabled) {
        this.initializeWebSocketServer();
      }
      
      this.initialized = true;
      logger.info('Alert Manager initialized successfully');
      
      // Schedule regular AI-driven alert pattern analysis
      this.scheduleAlertPatternAnalysis();
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize Alert Manager', { error: error.message });
      throw error;
    }
  }

  /**
   * Ensure config directories exist
   */
  async ensureConfigDirectories() {
    try {
      const configDirs = [
        path.join(process.cwd(), 'config'),
        path.join(process.cwd(), 'config', 'alerts'),
        path.join(process.cwd(), 'config', 'ai-alerts')
      ];
      
      for (const dir of configDirs) {
        await fs.mkdir(dir, { recursive: true });
      }
      
      logger.debug('Config directories ensured');
    } catch (error) {
      logger.warn('Error ensuring config directories', { error: error.message });
      // Continue execution even if directories can't be created
    }
  }

  /**
   * Load alert rules from config file
   */
  async loadAlertRules() {
    try {
      const rulesPath = path.join(process.cwd(), 'config', 'alerts', 'rules.json');
      
      // Check if file exists, create default if not
      try {
        await fs.access(rulesPath);
      } catch (error) {
        // File doesn't exist, create default
        await this.createDefaultRulesConfig(rulesPath);
      }
      
      const rulesData = await fs.readFile(rulesPath, 'utf-8');
      const parsedData = JSON.parse(rulesData);
      
      // Support both flat array and { rules: [] } format
      this.alertRules = Array.isArray(parsedData) ? parsedData : 
                        (parsedData.rules || []);
      
      logger.info('Alert rules loaded', { ruleCount: this.alertRules.length });
    } catch (error) {
      logger.error('Failed to load alert rules', { error: error.message });
      this.alertRules = [];
      throw error;
    }
  }

  /**
   * Load notification channels from config file
   */
  async loadNotificationChannels() {
    try {
      const channelsPath = path.join(process.cwd(), 'config', 'alerts', 'channels.json');
      
      // Check if file exists, create default if not
      try {
        await fs.access(channelsPath);
      } catch (error) {
        // File doesn't exist, create default
        await this.createDefaultChannelsConfig(channelsPath);
      }
      
      const channelsData = await fs.readFile(channelsPath, 'utf-8');
      const parsedData = JSON.parse(channelsData);
      
      // Support both flat array and { channels: [] } format
      this.channels = Array.isArray(parsedData) ? parsedData : 
                      (parsedData.channels || []);
      
      logger.info('Notification channels loaded', { channelCount: this.channels.length });
    } catch (error) {
      logger.error('Failed to load notification channels', { error: error.message });
      this.channels = [];
      throw error;
    }
  }

  /**
   * Create default alert rules configuration
   * @param {string} filePath - Path to write the config file
   */
  async createDefaultRulesConfig(filePath) {
    const defaultRules = {
      "rules": [
        {
          "id": "cpu_high",
          "name": "High CPU Usage",
          "description": "Alert when CPU usage is above 80% for 5 minutes",
          "type": "threshold",
          "source": "prometheus",
          "query": "system_cpu_usage > 80",
          "condition": ">",
          "threshold": 80,
          "duration": "5m",
          "severity": "warning",
          "enabled": true,
          "labels": { "resource": "cpu", "team": "infrastructure" },
          "annotations": {
            "summary": "High CPU Usage detected",
            "description": "CPU usage has been above 80% for more than 5 minutes"
          }
        },
        {
          "id": "memory_high",
          "name": "High Memory Usage",
          "description": "Alert when memory usage is above 90% for 10 minutes",
          "type": "threshold",
          "source": "prometheus",
          "query": "system_memory_usage_percent",
          "condition": ">",
          "threshold": 90,
          "duration": "10m",
          "severity": "warning",
          "enabled": true,
          "labels": { "resource": "memory", "team": "infrastructure" },
          "annotations": {
            "summary": "High Memory Usage detected",
            "description": "Memory usage has been above 90% for more than 10 minutes"
          }
        },
        {
          "id": "ai_cpu_anomaly",
          "name": "AI-Detected CPU Anomaly",
          "description": "Alert when the AI system detects an anomaly in CPU patterns",
          "type": "ai",
          "source": "ollama",
          "resourceType": "cpu",
          "minSeverity": "warning",
          "enabled": true,
          "labels": { "resource": "cpu", "team": "ai-ops" },
          "annotations": {
            "summary": "AI detected CPU anomaly",
            "description": "The AI system has detected an unusual pattern in CPU usage"
          }
        }
      ]
    };
    
    try {
      await fs.writeFile(filePath, JSON.stringify(defaultRules, null, 2), 'utf-8');
      logger.info('Created default alert rules configuration');
    } catch (error) {
      logger.error('Failed to create default alert rules configuration', { error: error.message });
      throw error;
    }
  }

  /**
   * Create default notification channels configuration
   * @param {string} filePath - Path to write the config file
   */
  async createDefaultChannelsConfig(filePath) {
    const defaultChannels = {
      "channels": [
        {
          "id": "console",
          "name": "Console",
          "type": "console",
          "enabled": true,
          "config": {}
        },
        {
          "id": "websocket",
          "name": "WebSocket",
          "type": "websocket",
          "enabled": true,
          "config": {
            "channel": "alerts"
          }
        },
        {
          "id": "ai_analysis",
          "name": "AI Analysis Feedback",
          "type": "ai_feedback",
          "enabled": true,
          "config": {
            "model": "llama2",
            "feedbackType": "alert_analysis",
            "minSeverity": "warning"
          }
        }
      ]
    };
    
    try {
      await fs.writeFile(filePath, JSON.stringify(defaultChannels, null, 2), 'utf-8');
      logger.info('Created default notification channels configuration');
    } catch (error) {
      logger.error('Failed to create default notification channels configuration', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize WebSocket server for real-time alerts
   */
  initializeWebSocketServer() {
    try {
      const port = process.env.ALERT_WS_PORT || 3002;
      
      // Close existing server if one exists
      if (this.wsServer) {
        try {
          this.wsServer.close();
          this.wsClients.clear();
        } catch (error) {
          logger.warn('Error closing existing WebSocket server', { error: error.message });
        }
      }
      
      // Create new server
      this.wsServer = new WebSocketServer({ port });
      
      this.wsServer.on('connection', (ws) => {
        this.wsClients.add(ws);
        logger.info('New WebSocket client connected', { clientCount: this.wsClients.size });
        
        // Send active alerts to new client
        const activeAlertsList = Array.from(this.activeAlerts.values());
        if (activeAlertsList.length > 0) {
          try {
            ws.send(JSON.stringify({
              type: 'active_alerts',
              alerts: activeAlertsList
            }));
          } catch (error) {
            logger.error('Error sending active alerts to new client', { error: error.message });
          }
        }
        
        ws.on('close', () => {
          this.wsClients.delete(ws);
          logger.info('WebSocket client disconnected', { clientCount: this.wsClients.size });
        });
        
        ws.on('error', (error) => {
          logger.error('WebSocket client error', { error: error.message });
          this.wsClients.delete(ws);
        });
      });
      
      this.wsServer.on('error', (error) => {
        logger.error('WebSocket server error', { error: error.message });
      });
      
      logger.info('WebSocket server initialized', { port });
    } catch (error) {
      logger.error('Failed to initialize WebSocket server', { error: error.message });
      // Reset properties in case of error
      this.wsServer = null;
      this.wsClients.clear();
    }
  }

  /**
   * Process incoming metrics and check against alert rules
   * @param {Object} metrics - Metrics data
   * @param {string} source - Source of the metrics (prometheus, azure, etc.)
   */
  async processMetrics(metrics, source) {
    if (!this.initialized) {
      logger.warn('Alert Manager not initialized, skipping metrics processing');
      return;
    }
    
    logger.debug('Processing metrics', { source, metricsCount: Object.keys(metrics).length });
    
    // Filter rules for the current source
    const applicableRules = this.alertRules.filter(rule => 
      rule.enabled && (rule.source === source || rule.source === 'all')
    );
    
    // Check each rule against the metrics
    for (const rule of applicableRules) {
      try {
        const alertTriggered = await this.evaluateRule(rule, metrics);
        
        if (alertTriggered) {
          // Check if this is an AI-driven rule
          if (rule.type === 'ai_anomaly') {
            await this.processAiAnomalyAlert(rule, metrics);
          }
        }
      } catch (error) {
        logger.error('Error evaluating rule', { 
          ruleId: rule.id, 
          ruleName: rule.name,
          error: error.message 
        });
      }
    }
  }

  /**
   * Evaluate a single rule against metrics
   * @param {Object} rule - Alert rule to evaluate
   * @param {Object} metrics - Metrics data
   * @returns {boolean} - Whether an alert was triggered
   */
  async evaluateRule(rule, metrics) {
    // Simple evaluation logic for demonstration
    // In a real system, this would use more sophisticated query evaluation
    
    try {
      let alertTriggered = false;
      
      switch(rule.type) {
        case 'threshold':
          alertTriggered = this.evaluateThresholdRule(rule, metrics);
          break;
          
        case 'rate_of_change':
          alertTriggered = this.evaluateRateOfChangeRule(rule, metrics);
          break;
          
        case 'ai_anomaly':
        case 'ai': // Support both ai_anomaly and ai types
          // AI anomaly rules are processed differently
          return false;
          
        default:
          logger.warn('Unknown rule type', { ruleType: rule.type, ruleId: rule.id });
          return false;
      }
      
      if (alertTriggered) {
        await this.createAlert(rule, metrics);
        return true;
      }
      
      // Check if we need to resolve an existing alert
      if (this.activeAlerts.has(rule.id)) {
        await this.resolveAlert(rule.id, 'Condition no longer met');
      }
      
      return false;
    } catch (error) {
      logger.error('Error in rule evaluation', { 
        ruleId: rule.id, 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Evaluate a threshold-based rule
   * @param {Object} rule - Threshold rule
   * @param {Object} metrics - Metrics data
   * @returns {boolean} - Whether the threshold was exceeded
   */
  evaluateThresholdRule(rule, metrics) {
    try {
      // Extract the metric value using the query
      let value;
      
      // Handle different query formats
      if (rule.query.includes('{')) {
        // Prometheus-style query with labels
        const queryParts = rule.query.split(/\s+/);
        const metricWithLabels = queryParts[0];
        const operator = queryParts[1] || '>';
        const threshold = parseFloat(queryParts[2] || rule.threshold);
        
        // Extract metric name and labels
        const metricMatch = metricWithLabels.match(/^([^{]+)(?:\{(.+)\})?/);
        if (!metricMatch) {
          logger.warn('Invalid metric format in query', { query: rule.query });
          return false;
        }
        
        const metricName = metricMatch[1];
        const labels = metricMatch[2] ? this.parseLabels(metricMatch[2]) : {};
        
        // Find matching metric
        value = this.findMetricByNameAndLabels(metrics, metricName, labels);
      } else if (rule.query.includes('.')) {
        // Dot notation for nested objects
        const metricPath = rule.query.split('.');
        value = this.getValueByPath(metrics, metricPath);
      } else {
        // Simple metric name
        value = metrics[rule.query];
      }
      
      // If value is not found or not a number, return false
      if (value === undefined || value === null) {
        logger.debug('Metric not found in data', { 
          ruleId: rule.id,
          query: rule.query
        });
        return false;
      }
      
      // If value is not a number, try to convert it
      if (typeof value !== 'number') {
        value = parseFloat(value);
        if (isNaN(value)) {
          logger.debug('Metric value is not a number', { 
            ruleId: rule.id,
            value
          });
          return false;
        }
      }
      
      // Get condition and threshold
      const condition = rule.condition || '>';
      const threshold = rule.threshold;
      
      // Check the threshold condition
      switch (condition) {
        case '>':
          if (value > threshold) {
            logger.debug('Threshold rule triggered (>)', { 
              ruleId: rule.id, 
              value, 
              threshold 
            });
            return true;
          }
          break;
          
        case '>=':
          if (value >= threshold) {
            logger.debug('Threshold rule triggered (>=)', { 
              ruleId: rule.id, 
              value, 
              threshold 
            });
            return true;
          }
          break;
          
        case '<':
          if (value < threshold) {
            logger.debug('Threshold rule triggered (<)', { 
              ruleId: rule.id, 
              value, 
              threshold 
            });
            return true;
          }
          break;
          
        case '<=':
          if (value <= threshold) {
            logger.debug('Threshold rule triggered (<=)', { 
              ruleId: rule.id, 
              value, 
              threshold 
            });
            return true;
          }
          break;
          
        case '==':
        case '=':
          if (value === threshold) {
            logger.debug('Threshold rule triggered (==)', { 
              ruleId: rule.id, 
              value, 
              threshold 
            });
            return true;
          }
          break;
          
        case '!=':
          if (value !== threshold) {
            logger.debug('Threshold rule triggered (!=)', { 
              ruleId: rule.id, 
              value, 
              threshold 
            });
            return true;
          }
          break;
          
        default:
          logger.warn('Unknown condition operator', { 
            ruleId: rule.id, 
            condition 
          });
          return false;
      }
      
      return false;
    } catch (error) {
      logger.error('Error evaluating threshold rule', { 
        ruleId: rule.id, 
        error: error.message 
      });
      return false;
    }
  }
  
  /**
   * Parse Prometheus-style labels from a query
   * @param {string} labelsString - Labels string in format 'label1="value1",label2="value2"'
   * @returns {Object} - Parsed labels object
   */
  parseLabels(labelsString) {
    const labels = {};
    const labelParts = labelsString.split(',');
    
    for (const part of labelParts) {
      const match = part.trim().match(/([^=]+)=(?:"([^"]*)"|\{([^}]*)\}|([^,]*))/);
      if (match) {
        const key = match[1].trim();
        const value = match[2] || match[3] || match[4];
        labels[key] = value;
      }
    }
    
    return labels;
  }
  
  /**
   * Find a metric by name and labels
   * @param {Object} metrics - Metrics data
   * @param {string} name - Metric name
   * @param {Object} labels - Labels to match
   * @returns {number|null} - Metric value
   */
  findMetricByNameAndLabels(metrics, name, labels) {
    // Simple case: direct match
    if (metrics[name] !== undefined) {
      if (Object.keys(labels).length === 0) {
        return metrics[name];
      }
      
      // Check if the metric has labels
      if (metrics[name].labels && typeof metrics[name].value === 'number') {
        const matchingLabels = Object.keys(labels).every(key => 
          metrics[name].labels[key] === labels[key]
        );
        
        if (matchingLabels) {
          return metrics[name].value;
        }
      }
    }
    
    // Look for matching metrics in arrays
    for (const metricKey in metrics) {
      if (Array.isArray(metrics[metricKey])) {
        for (const metric of metrics[metricKey]) {
          if (metric.name === name || metricKey === name) {
            if (Object.keys(labels).length === 0) {
              return metric.value;
            }
            
            if (metric.labels) {
              const matchingLabels = Object.keys(labels).every(key => 
                metric.labels[key] === labels[key]
              );
              
              if (matchingLabels) {
                return metric.value;
              }
            }
          }
        }
      }
    }
    
    // Look for nested objects that might match
    for (const key in metrics) {
      if (typeof metrics[key] === 'object' && metrics[key] !== null) {
        const nestedResult = this.findMetricByNameAndLabels(metrics[key], name, labels);
        if (nestedResult !== null) {
          return nestedResult;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Get a value from an object by path
   * @param {Object} obj - Object to get value from
   * @param {Array} path - Path to the value
   * @returns {*} - Value at the path
   */
  getValueByPath(obj, path) {
    let current = obj;
    
    for (const segment of path) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      
      current = current[segment];
    }
    
    return current;
  }

  /**
   * Evaluate a rate-of-change rule
   * @param {Object} rule - Rate of change rule
   * @param {Object} metrics - Metrics data
   * @returns {boolean} - Whether the rate of change threshold was exceeded
   */
  evaluateRateOfChangeRule(rule, metrics) {
    // This would require historical data to compare against
    // Simplified implementation for demonstration purposes
    
    logger.debug('Rate of change rules not fully implemented yet');
    return false;
  }

  /**
   * Process AI-based anomaly detection
   * @param {Object} metrics - Metrics data
   * @returns {Array} - Detected anomalies
   */
  async detectAnomalies(metrics) {
    try {
      // Group metrics by resource type
      const cpuMetrics = this.extractMetricsByType(metrics, 'cpu');
      const memoryMetrics = this.extractMetricsByType(metrics, 'memory');
      const networkMetrics = this.extractMetricsByType(metrics, 'network');
      
      // Run anomaly detection for each resource type
      const cpuAnomalies = await alertAnalyzer.explainAnomaly(cpuMetrics, { resourceType: 'cpu' });
      const memoryAnomalies = await alertAnalyzer.explainAnomaly(memoryMetrics, { resourceType: 'memory' });
      const networkAnomalies = await alertAnalyzer.explainAnomaly(networkMetrics, { resourceType: 'network' });
      
      // Combine and return all anomalies
      return [
        ...(cpuAnomalies?.anomalies || []).map(a => ({ ...a, resourceType: 'cpu' })),
        ...(memoryAnomalies?.anomalies || []).map(a => ({ ...a, resourceType: 'memory' })),
        ...(networkAnomalies?.anomalies || []).map(a => ({ ...a, resourceType: 'network' }))
      ];
    } catch (error) {
      logger.error('Error detecting anomalies', { error: error.message });
      return [];
    }
  }

  /**
   * Extract metrics by resource type
   * @param {Object} metrics - All metrics data
   * @param {string} type - Resource type (cpu, memory, network)
   * @returns {Object} - Filtered metrics
   */
  extractMetricsByType(metrics, type) {
    // This is a simplified implementation
    // In a real system, this would be more sophisticated
    
    const result = {};
    
    // Look for metrics related to the specified type
    for (const [key, value] of Object.entries(metrics)) {
      if (key.toLowerCase().includes(type) || 
          (typeof value === 'object' && Object.keys(value).some(k => k.toLowerCase().includes(type)))) {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Process AI anomaly alerts
   * @param {Object} rule - AI anomaly rule
   * @param {Object} metrics - Metrics data
   */
  async processAiAnomalyAlert(rule, metrics) {
    try {
      // Extract the resource type from the rule
      const resourceType = rule.resourceType || 'general';
      
      // Extract relevant metrics
      const relevantMetrics = this.extractMetricsByType(metrics, resourceType);
      
      // Get anomaly explanation
      const explanation = await alertAnalyzer.explainAnomaly(relevantMetrics, { resourceType });
      
      if (explanation && explanation.anomalies && explanation.anomalies.length > 0) {
        // Create an alert for each anomaly
        for (const anomaly of explanation.anomalies) {
          const alertId = `${rule.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          // Create enhanced alert with AI information
          const alert = {
            id: alertId,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: anomaly.severity || explanation.severity || rule.severity,
            status: 'firing',
            timestamp: new Date(),
            value: 'AI-detected anomaly',
            metrics: relevantMetrics,
            labels: { ...rule.labels, resourceType },
            annotations: {
              ...rule.annotations,
              description: anomaly.description,
              summary: `AI detected an anomaly in ${resourceType}: ${anomaly.description.substring(0, 100)}...`
            },
            source: rule.source,
            anomalyDetails: anomaly,
            explanation: explanation.explanation
          };
          
          // Only trigger if severity meets or exceeds the rule's minimum severity
          const alertSeverityLevel = SEVERITY_LEVELS[alert.severity] || 0;
          const ruleSeverityLevel = SEVERITY_LEVELS[rule.severity] || 0;
          
          if (alertSeverityLevel >= ruleSeverityLevel) {
            // Store the alert
            this.activeAlerts.set(alertId, alert);
            
            // Add to history
            this.alertHistory.push(alert);
            
            // Trim history if too large
            if (this.alertHistory.length > 1000) {
              this.alertHistory = this.alertHistory.slice(-1000);
            }
            
            // Emit alert event
            this.emit('alert', alert);
            
            // Send notifications
            await this.sendNotifications(alert);
            
            // Get AI recommendations for enhanced context
            this.getAiRecommendations(alert);
          }
        }
      }
    } catch (error) {
      logger.error('Error processing AI anomaly alert', { 
        ruleId: rule.id, 
        error: error.message 
      });
    }
  }

  /**
   * Get AI recommendations for an alert
   * @param {Object} alert - Alert object
   */
  async getAiRecommendations(alert) {
    try {
      // Get recommendations
      const recommendations = await alertAnalyzer.generateRecommendations(
        alert,
        this.alertHistory.slice(-10),
        alert.metrics
      );
      
      if (recommendations && recommendations.recommendations) {
        // Update the alert with recommendations
        const updatedAlert = {
          ...alert,
          annotations: {
            ...alert.annotations,
            recommendations: recommendations.recommendations
              .map(r => `[${r.priority.toUpperCase()}] ${r.description}`)
              .join('\n')
          },
          aiRecommendations: recommendations
        };
        
        // Update in active alerts
        this.activeAlerts.set(alert.id, updatedAlert);
        
        // Emit update event
        this.emit('alert_update', updatedAlert);
        
        // Send update via WebSocket
        this.broadcastAlert(updatedAlert);
        
        logger.info('Added AI recommendations to alert', { alertId: alert.id });
      }
    } catch (error) {
      logger.error('Error getting AI recommendations', { 
        alertId: alert.id, 
        error: error.message 
      });
    }
  }

  /**
   * Create a new alert from a rule
   * @param {Object} rule - Alert rule that was triggered
   * @param {Object} metrics - Metrics data that triggered the alert
   */
  async createAlert(rule, metrics) {
    try {
      // Validate inputs
      if (!rule || !rule.id) {
        logger.error('Cannot create alert: Invalid rule', { rule });
        return;
      }

      // Check if the rule is already firing
      if (this.activeAlerts.has(rule.id)) {
        logger.debug('Alert already active for rule', { ruleId: rule.id });
        return;
      }
      
      logger.info('Creating new alert', { ruleId: rule.id, ruleName: rule.name });
      
      // Create the alert object with safe defaults
      const alert = {
        id: rule.id,
        ruleId: rule.id,
        ruleName: rule.name || 'Unnamed Rule',
        severity: rule.severity || 'warning',
        status: 'firing',
        timestamp: new Date(),
        value: this.extractAlertValue(rule, metrics || {}),
        metrics: metrics || {},
        labels: rule.labels || {},
        annotations: rule.annotations || {
          summary: rule.name || 'Alert triggered',
          description: rule.description || 'No description provided'
        },
        source: rule.source || 'unknown'
      };
      
      // Store the alert
      this.activeAlerts.set(rule.id, alert);
      
      // Add to history
      this.alertHistory.push(alert);
      
      // Trim history if too large
      if (this.alertHistory.length > 1000) {
        this.alertHistory = this.alertHistory.slice(-1000);
      }
      
      // Emit alert event
      this.emit('alert', alert);
      
      // Send notifications
      await this.sendNotifications(alert);
    } catch (error) {
      logger.error('Error creating alert', { 
        ruleId: rule?.id || 'unknown', 
        error: error.message 
      });
    }
  }

  /**
   * Resolve an active alert
   * @param {string} alertId - ID of the alert to resolve
   * @param {string} reason - Reason for resolution
   */
  async resolveAlert(alertId, reason) {
    if (!this.activeAlerts.has(alertId)) {
      logger.debug('Cannot resolve alert, not active', { alertId });
      return;
    }
    
    const alert = this.activeAlerts.get(alertId);
    logger.info('Resolving alert', { alertId, ruleName: alert.ruleName });
    
    // Update the alert
    const resolvedAlert = {
      ...alert,
      status: 'resolved',
      resolvedAt: new Date(),
      resolutionReason: reason
    };
    
    // Update history
    this.alertHistory.push(resolvedAlert);
    
    // Remove from active alerts
    this.activeAlerts.delete(alertId);
    
    // Emit resolved event
    this.emit('alert_resolved', resolvedAlert);
    
    // Send notifications
    await this.sendNotifications(resolvedAlert);
  }

  /**
   * Extract the value that triggered the alert
   * @param {Object} rule - The alert rule
   * @param {Object} metrics - Metrics data
   * @returns {*} - The value that triggered the alert
   */
  extractAlertValue(rule, metrics) {
    try {
      if (!rule.query) {
        return 'N/A';
      }

      // Handle different query formats
      if (rule.query.includes('{')) {
        // Prometheus-style query with labels
        const metricMatch = rule.query.match(/^([^{]+)(?:\{(.+)\})?/);
        if (!metricMatch) {
          return 'N/A';
        }
        
        const metricName = metricMatch[1];
        const labels = metricMatch[2] ? this.parseLabels(metricMatch[2]) : {};
        
        return this.findMetricByNameAndLabels(metrics, metricName, labels) || 'N/A';
      } else if (rule.query.includes('.')) {
        // Use getValueByPath for nested queries
        const metricPath = rule.query.split('.');
        const value = this.getValueByPath(metrics, metricPath);
        return value !== undefined ? value : 'N/A';
      } else {
        // Simple metric name
        return metrics[rule.query] !== undefined ? metrics[rule.query] : 'N/A';
      }
    } catch (error) {
      logger.error('Error extracting alert value', { error: error.message });
      return 'Error';
    }
  }

  /**
   * Send notifications for an alert
   * @param {Object} alert - The alert to send notifications for
   */
  async sendNotifications(alert) {
    // Get enabled notification channels
    const enabledChannels = this.channels.filter(channel => channel.enabled);
    
    for (const channel of enabledChannels) {
      try {
        switch(channel.type) {
          case 'console':
            this.sendConsoleNotification(channel, alert);
            break;
            
          case 'websocket':
            this.sendWebSocketNotification(channel, alert);
            break;
            
          case 'email':
            // In a real system, this would send an email
            logger.info('Email notification would be sent', { 
              alertId: alert.id,
              emailTo: channel.config.recipients.join(', ')
            });
            break;
            
          case 'slack':
            // In a real system, this would send a Slack message
            logger.info('Slack notification would be sent', { 
              alertId: alert.id,
              slackChannel: channel.config.channel
            });
            break;
            
          case 'pagerduty':
            // In a real system, this would send a PagerDuty alert
            logger.info('PagerDuty notification would be sent', { 
              alertId: alert.id,
              severity: alert.severity
            });
            break;
            
          case 'ai_feedback':
            await this.sendAiFeedbackNotification(channel, alert);
            break;
            
          default:
            logger.warn('Unknown notification channel type', { type: channel.type });
        }
      } catch (error) {
        logger.error('Error sending notification', { 
          alertId: alert.id,
          channelType: channel.type,
          error: error.message
        });
      }
    }
  }

  /**
   * Send a console notification
   * @param {Object} channel - Console notification channel
   * @param {Object} alert - Alert to notify about
   */
  sendConsoleNotification(channel, alert) {
    const status = alert.status === 'firing' ? '🔴 FIRING' : '✅ RESOLVED';
    const severity = alert.severity.toUpperCase();
    const message = alert.annotations?.summary || alert.ruleName;
    
    console.log(`[${status}][${severity}] ${message}`);
    logger.info('Console notification sent', { alertId: alert.id });
  }

  /**
   * Send a WebSocket notification
   * @param {Object} channel - WebSocket notification channel
   * @param {Object} alert - Alert to notify about
   */
  sendWebSocketNotification(channel, alert) {
    this.broadcastAlert(alert);
    logger.info('WebSocket notification sent', { 
      alertId: alert.id,
      clientCount: this.wsClients.size
    });
  }

  /**
   * Send AI feedback notification
   * @param {Object} channel - AI feedback notification channel
   * @param {Object} alert - Alert to notify about
   */
  async sendAiFeedbackNotification(channel, alert) {
    // Only process alerts with severity meeting minimum threshold
    const alertSeverityLevel = SEVERITY_LEVELS[alert.severity] || 0;
    const minSeverityLevel = SEVERITY_LEVELS[channel.config.minSeverity || 'info'] || 0;
    
    if (alertSeverityLevel < minSeverityLevel) {
      logger.debug('Alert severity below minimum for AI feedback', {
        alertSeverity: alert.severity,
        minSeverity: channel.config.minSeverity
      });
      return;
    }
    
    try {
      // Use the appropriate AI function based on feedback type
      if (channel.config.feedbackType === 'explanation') {
        // Get explanation for the alert
        const explanation = await alertAnalyzer.explainAnomaly(alert.metrics, {
          resourceType: alert.labels?.resource || 'general',
          alertId: alert.id
        });
        
        if (explanation && explanation.explanation) {
          // Update the alert with explanation
          const updatedAlert = {
            ...alert,
            annotations: {
              ...alert.annotations,
              explanation: explanation.explanation
            },
            aiAnalysis: explanation
          };
          
          // Update in active alerts if still active
          if (updatedAlert.status === 'firing' && this.activeAlerts.has(alert.id)) {
            this.activeAlerts.set(alert.id, updatedAlert);
          }
          
          // Emit update event
          this.emit('alert_update', updatedAlert);
          
          // Send update via WebSocket
          this.broadcastAlert(updatedAlert);
          
          logger.info('Added AI explanation to alert', { alertId: alert.id });
        }
      } else if (channel.config.feedbackType === 'recommendation' || 
                 channel.config.feedbackType === 'alert_analysis') {
        const recommendations = await alertAnalyzer.generateRecommendations(
          alert,
          this.alertHistory.slice(-10),
          alert.metrics
        );
        
        if (recommendations && recommendations.recommendations) {
          // Update the alert with recommendations
          const updatedAlert = {
            ...alert,
            annotations: {
              ...alert.annotations,
              recommendations: recommendations.recommendations
                .map(r => `[${r.priority.toUpperCase()}] ${r.description}`)
                .join('\n')
            },
            aiRecommendations: recommendations
          };
          
          // Update in active alerts if still active
          if (updatedAlert.status === 'firing' && this.activeAlerts.has(alert.id)) {
            this.activeAlerts.set(alert.id, updatedAlert);
          }
          
          // Emit update event
          this.emit('alert_update', updatedAlert);
          
          // Send update via WebSocket
          this.broadcastAlert(updatedAlert);
          
          logger.info('Added AI recommendations to alert', { alertId: alert.id });
        }
      } else if (channel.config.feedbackType === 'correlation') {
        // Request metrics correlation analysis
        const correlation = await alertAnalyzer.analyzeCorrelations(
          alert,
          alert.metrics,
          this.alertHistory
            .filter(a => a.id !== alert.id)
            .slice(-5)
        );
        
        if (correlation && correlation.correlations) {
          // Update the alert with correlation information
          const updatedAlert = {
            ...alert,
            annotations: {
              ...alert.annotations,
              correlations: correlation.correlations
                .map(c => `[${c.significance.toUpperCase()}] ${c.description}`)
                .join('\n')
            },
            aiCorrelations: correlation
          };
          
          // Update in active alerts if still active
          if (updatedAlert.status === 'firing' && this.activeAlerts.has(alert.id)) {
            this.activeAlerts.set(alert.id, updatedAlert);
          }
          
          // Emit update event
          this.emit('alert_update', updatedAlert);
          
          // Send update via WebSocket
          this.broadcastAlert(updatedAlert);
          
          logger.info('Added AI correlations to alert', { alertId: alert.id });
        }
      }
    } catch (error) {
      logger.error('Error sending AI feedback notification', { 
        alertId: alert.id, 
        error: error.message 
      });
    }
  }

  /**
   * Broadcast an alert to all connected WebSocket clients
   * @param {Object} alert - Alert to broadcast
   */
  broadcastAlert(alert) {
    if (!this.wsServer || this.wsClients.size === 0) {
      return;
    }
    
    try {
      // Create a safer alert object with circular references removed
      const safeAlert = this.createSafeAlertCopy(alert);
      
      const message = JSON.stringify({
        type: alert.status === 'firing' ? 'alert' : 'resolve',
        alert: safeAlert
      });
      
      let sentCount = 0;
      for (const client of this.wsClients) {
        // Use the correct WebSocket.OPEN constant
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(message);
            sentCount++;
          } catch (error) {
            logger.error('Error sending message to WebSocket client', { error: error.message });
            // Remove problematic client
            client.terminate();
            this.wsClients.delete(client);
          }
        }
      }
      
      if (sentCount > 0) {
        logger.debug('Alert broadcast to clients', { 
          alertId: alert.id, 
          clientCount: sentCount 
        });
      }
    } catch (error) {
      logger.error('Error broadcasting alert', { 
        alertId: alert.id, 
        error: error.message 
      });
    }
  }
  
  /**
   * Create a safe copy of an alert for JSON serialization
   * @param {Object} alert - Original alert object
   * @returns {Object} - Safe copy without circular references
   */
  createSafeAlertCopy(alert) {
    try {
      // Create a simplified version of the alert, omitting potentially problematic properties
      const safeAlert = {
        id: alert.id,
        ruleId: alert.ruleId,
        ruleName: alert.ruleName,
        severity: alert.severity,
        status: alert.status,
        timestamp: alert.timestamp,
        value: alert.value,
        labels: { ...alert.labels },
        annotations: { ...alert.annotations },
        source: alert.source
      };
      
      // Add safe metrics if they exist
      if (alert.metrics) {
        try {
          // Test if metrics can be safely serialized
          JSON.stringify(alert.metrics);
          safeAlert.metrics = alert.metrics;
        } catch (error) {
          // If there's an error, omit metrics
          safeAlert.metrics = { error: "Metrics contain non-serializable data" };
        }
      }
      
      return safeAlert;
    } catch (error) {
      logger.error('Error creating safe alert copy', { error: error.message });
      // Return minimal alert data if copy fails
      return { 
        id: alert.id,
        ruleName: alert.ruleName || "Unknown rule",
        severity: alert.severity || "unknown",
        status: alert.status || "unknown",
        error: "Failed to create safe alert copy"
      };
    }
  }

  /**
   * Get active alerts
   * @returns {Array} - List of active alerts
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   * @param {number} limit - Maximum number of alerts to return
   * @returns {Array} - List of historical alerts
   */
  getAlertHistory(limit = 100) {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Schedule regular AI-driven alert pattern analysis
   */
  scheduleAlertPatternAnalysis() {
    // Run alert pattern analysis every hour
    const analysisInterval = 60 * 60 * 1000; // 1 hour
    
    setInterval(async () => {
      try {
        if (this.alertHistory.length > 0) {
          logger.info('Running scheduled alert pattern analysis');
          
          const result = await alertAnalyzer.analyzeAlertPatterns(this.alertHistory.slice(-100));
          
          if (result && result.patterns && result.patterns.length > 0) {
            logger.info('Alert pattern analysis completed', {
              patternCount: result.patterns.length,
              insightCount: result.insights?.length || 0
            });
            
            // Emit pattern results for consumers
            this.emit('alert_patterns', result);
          }
        }
      } catch (error) {
        logger.error('Error in scheduled alert pattern analysis', { 
          error: error.message 
        });
      }
    }, analysisInterval);
    
    // Also run once at startup if we have enough history
    setTimeout(async () => {
      if (this.alertHistory.length > 10) {
        try {
          logger.info('Running initial alert pattern analysis');
          
          const result = await alertAnalyzer.analyzeAlertPatterns(this.alertHistory);
          
          if (result && result.patterns && result.patterns.length > 0) {
            logger.info('Initial alert pattern analysis completed', {
              patternCount: result.patterns.length,
              insightCount: result.insights?.length || 0
            });
            
            // Emit pattern results for consumers
            this.emit('alert_patterns', result);
          }
        } catch (error) {
          logger.error('Error in initial alert pattern analysis', { 
            error: error.message 
          });
        }
      }
    }, 5000); // Run 5 seconds after initialization
  }
}

export default new AlertManager(); 