import winston from 'winston';
import nodeCron from 'node-cron';
import path from 'path';
import fs from 'fs/promises';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'alert-manager' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/alerts.log' })
  ]
});

// Alert configuration
let alertRules = [];
let activeAlerts = new Map();
let alertHistory = [];
let notificationChannels = [];

/**
 * Setup the alert system
 * @param {Object} options - Setup options
 * @returns {Object} - Alert manager instance
 */
export async function setupAlertSystem(options) {
  logger.info('Setting up alert system...');
  
  try {
    const { prometheusClient, azureMonitorClient, aiClient, io } = options;
    
    // Load alert rules
    await loadAlertRules();
    
    // Load notification channels
    await loadNotificationChannels();
    
    // Schedule alert evaluation
    scheduleAlertEvaluation(prometheusClient, azureMonitorClient, aiClient, io);
    
    logger.info('Alert system setup completed', { 
      rulesLoaded: alertRules.length,
      channelsLoaded: notificationChannels.length 
    });
    
    return {
      // Alert management
      getActiveAlerts: () => Array.from(activeAlerts.values()),
      getAlertHistory: (limit = 100) => alertHistory.slice(-limit),
      acknowledgeAlert: (alertId) => acknowledgeAlert(alertId),
      resolveAlert: (alertId, resolution) => resolveAlert(alertId, resolution),
      
      // Alert rule management
      getAlertRules: () => [...alertRules],
      addAlertRule: (rule) => addAlertRule(rule),
      updateAlertRule: (ruleId, updates) => updateAlertRule(ruleId, updates),
      deleteAlertRule: (ruleId) => deleteAlertRule(ruleId),
      
      // Notification management
      getNotificationChannels: () => [...notificationChannels],
      addNotificationChannel: (channel) => addNotificationChannel(channel),
      updateNotificationChannel: (channelId, updates) => updateNotificationChannel(channelId, updates),
      deleteNotificationChannel: (channelId) => deleteNotificationChannel(channelId),
      
      // Manual alert generation
      createAlert: (alert) => createAlert(alert, prometheusClient, io)
    };
  } catch (error) {
    logger.error('Failed to set up alert system', { error: error.message });
    throw error;
  }
}

/**
 * Load alert rules from configuration
 */
async function loadAlertRules() {
  try {
    // Try to load from file
    const rulesFile = path.join(process.cwd(), 'config', 'alerts', 'rules.json');
    const fileData = await fs.readFile(rulesFile, 'utf-8');
    alertRules = JSON.parse(fileData);
    
    logger.info('Loaded alert rules from file', { count: alertRules.length });
  } catch (error) {
    // If file doesn't exist or is invalid, load default rules
    logger.warn('Failed to load alert rules from file, using defaults', { error: error.message });
    
    alertRules = [
      {
        id: 'cpu_high',
        name: 'High CPU Usage',
        description: 'Alert when CPU usage is above 80% for 5 minutes',
        type: 'threshold',
        source: 'prometheus',
        query: 'system_cpu_usage{core="core-0"} > 80',
        duration: '5m',
        severity: 'warning',
        enabled: true,
        labels: { resource: 'cpu', team: 'infrastructure' }
      },
      {
        id: 'memory_high',
        name: 'High Memory Usage',
        description: 'Alert when memory usage is above 90% for 10 minutes',
        type: 'threshold',
        source: 'prometheus',
        query: 'system_memory_usage_bytes{type="used"} / system_memory_usage_bytes{type="total"} * 100 > 90',
        duration: '10m',
        severity: 'warning',
        enabled: true,
        labels: { resource: 'memory', team: 'infrastructure' }
      },
      {
        id: 'ai_anomaly',
        name: 'AI-Detected Anomaly',
        description: 'Alert when the AI system detects an anomaly',
        type: 'ai',
        source: 'ollama',
        resourceType: 'general',
        minSeverity: 'warning',
        enabled: true,
        labels: { resource: 'ai', team: 'data-science' }
      }
    ];
  }
}

/**
 * Load notification channels from configuration
 */
async function loadNotificationChannels() {
  try {
    // Try to load from file
    const channelsFile = path.join(process.cwd(), 'config', 'alerts', 'channels.json');
    const fileData = await fs.readFile(channelsFile, 'utf-8');
    notificationChannels = JSON.parse(fileData);
    
    logger.info('Loaded notification channels from file', { count: notificationChannels.length });
  } catch (error) {
    // If file doesn't exist or is invalid, load default channels
    logger.warn('Failed to load notification channels from file, using defaults', { error: error.message });
    
    notificationChannels = [
      {
        id: 'console',
        name: 'Console',
        type: 'console',
        enabled: true,
        config: {}
      },
      {
        id: 'websocket',
        name: 'WebSocket',
        type: 'websocket',
        enabled: true,
        config: { channel: 'alerts' }
      }
    ];
  }
}

/**
 * Schedule alert evaluation
 */
function scheduleAlertEvaluation(prometheusClient, azureMonitorClient, aiClient, io) {
  // Schedule standard alert evaluation (every minute)
  nodeCron.schedule('* * * * *', async () => {
    try {
      logger.debug('Evaluating standard alert rules');
      
      for (const rule of alertRules) {
        // Skip disabled rules or AI rules (evaluated separately)
        if (!rule.enabled || rule.type === 'ai') continue;
        
        if (rule.source === 'prometheus') {
          await evaluatePrometheusRule(rule, prometheusClient, io);
        } else if (rule.source === 'azure') {
          await evaluateAzureRule(rule, azureMonitorClient, io);
        }
      }
    } catch (error) {
      logger.error('Error evaluating standard alert rules', { error: error.message });
    }
  });
  
  // Schedule AI-based alert evaluation (every 5 minutes)
  nodeCron.schedule('*/5 * * * *', async () => {
    try {
      logger.debug('Evaluating AI-based alert rules');
      
      // Only process enabled AI rules
      const aiRules = alertRules.filter(rule => rule.enabled && rule.type === 'ai');
      
      if (aiRules.length === 0) return;
      
      // For each resource type, run anomaly detection
      const resourceTypes = ['cpu', 'memory', 'network', 'general'];
      
      for (const resourceType of resourceTypes) {
        // Get sample data for the resource type (in a real system, this would be actual metrics)
        const sampleData = getSampleDataForResourceType(resourceType);
        
        // Run AI anomaly detection
        const anomalyResult = await aiClient.detectAnomalies(sampleData, resourceType);
        
        // Process anomaly results for all AI rules
        for (const rule of aiRules) {
          if (rule.resourceType === resourceType || rule.resourceType === 'general') {
            evaluateAiAnomaly(rule, anomalyResult, io);
          }
        }
      }
    } catch (error) {
      logger.error('Error evaluating AI-based alert rules', { error: error.message });
    }
  });
}

/**
 * Evaluate a Prometheus alert rule
 */
async function evaluatePrometheusRule(rule, prometheusClient, io) {
  try {
    // In a real system, this would execute the actual PromQL query
    // For this example, we're using simulated data
    
    // Get metric value (simulate query execution)
    const result = simulatePrometheusQuery(rule.query);
    
    // Check if alert should fire
    if (result.firing) {
      const alertId = `${rule.id}_${Date.now()}`;
      
      // Create alert if not already active
      if (!activeAlerts.has(rule.id)) {
        const alert = {
          id: alertId,
          ruleId: rule.id,
          name: rule.name,
          description: rule.description,
          severity: rule.severity,
          status: 'firing',
          source: 'prometheus',
          value: result.value,
          labels: { ...rule.labels },
          annotations: {
            summary: `${rule.name} (${result.value})`,
            description: rule.description
          },
          startsAt: new Date(),
          endsAt: null
        };
        
        createAlert(alert, prometheusClient, io);
      }
    } else {
      // Resolve alert if it was active
      if (activeAlerts.has(rule.id)) {
        const alert = activeAlerts.get(rule.id);
        
        resolveAlert(alert.id, {
          resolvedAt: new Date(),
          autoResolved: true,
          comment: 'Condition no longer met'
        });
      }
    }
  } catch (error) {
    logger.error(`Error evaluating Prometheus rule ${rule.id}`, { error: error.message });
  }
}

/**
 * Evaluate an Azure alert rule
 */
async function evaluateAzureRule(rule, azureMonitorClient, io) {
  try {
    // In a real system, this would query Azure Monitor
    // For this example, we're using simulated data
    const result = simulateAzureQuery(rule);
    
    // Check if alert should fire
    if (result.firing) {
      const alertId = `${rule.id}_${Date.now()}`;
      
      // Create alert if not already active
      if (!activeAlerts.has(rule.id)) {
        const alert = {
          id: alertId,
          ruleId: rule.id,
          name: rule.name,
          description: rule.description,
          severity: rule.severity,
          status: 'firing',
          source: 'azure',
          value: result.value,
          labels: { ...rule.labels },
          annotations: {
            summary: `${rule.name} (${result.value})`,
            description: rule.description,
            azureResource: rule.resourceId
          },
          startsAt: new Date(),
          endsAt: null
        };
        
        createAlert(alert, null, io);
      }
    } else {
      // Resolve alert if it was active
      if (activeAlerts.has(rule.id)) {
        const alert = activeAlerts.get(rule.id);
        
        resolveAlert(alert.id, {
          resolvedAt: new Date(),
          autoResolved: true,
          comment: 'Condition no longer met'
        });
      }
    }
  } catch (error) {
    logger.error(`Error evaluating Azure rule ${rule.id}`, { error: error.message });
  }
}

/**
 * Evaluate AI anomaly detection results
 */
function evaluateAiAnomaly(rule, anomalyResult, io) {
  try {
    const severityLevels = {
      'info': 0,
      'warning': 1,
      'error': 2,
      'critical': 3
    };
    
    const minSeverityLevel = severityLevels[rule.minSeverity] || 1;
    const resultSeverityLevel = severityLevels[anomalyResult.severity] || 0;
    
    // Check if severity meets the threshold and there are anomalies
    if (resultSeverityLevel >= minSeverityLevel && anomalyResult.anomalies.length > 0) {
      const alertId = `${rule.id}_${Date.now()}`;
      
      // Create alert if not already active
      if (!activeAlerts.has(rule.id)) {
        // Format anomalies for the alert
        const anomaliesText = anomalyResult.anomalies
          .map(a => `- ${a.description} (${a.severity})`)
          .join('\n');
        
        const alert = {
          id: alertId,
          ruleId: rule.id,
          name: rule.name,
          description: `AI-detected anomalies: ${anomalyResult.anomalies.length}`,
          severity: anomalyResult.severity,
          status: 'firing',
          source: 'ai',
          value: anomalyResult.anomalies.length,
          labels: { ...rule.labels, severity: anomalyResult.severity },
          annotations: {
            summary: `${rule.name}: ${anomalyResult.anomalies.length} anomalies detected`,
            description: `The following anomalies were detected:\n${anomaliesText}`,
            rawResponse: anomalyResult.raw_response
          },
          startsAt: new Date(),
          endsAt: null,
          aiData: {
            anomalies: anomalyResult.anomalies
          }
        };
        
        createAlert(alert, null, io);
      }
    } else {
      // Resolve alert if it was active
      if (activeAlerts.has(rule.id)) {
        const alert = activeAlerts.get(rule.id);
        
        resolveAlert(alert.id, {
          resolvedAt: new Date(),
          autoResolved: true,
          comment: 'No anomalies detected above threshold'
        });
      }
    }
  } catch (error) {
    logger.error(`Error evaluating AI rule ${rule.id}`, { error: error.message });
  }
}

/**
 * Create a new alert
 */
function createAlert(alert, prometheusClient, io) {
  try {
    // Add timestamp if not present
    if (!alert.startsAt) {
      alert.startsAt = new Date();
    }
    
    // Store in active alerts
    activeAlerts.set(alert.ruleId, alert);
    
    // Add to history
    alertHistory.push({ ...alert });
    
    // Trim history if it gets too large
    if (alertHistory.length > 1000) {
      alertHistory = alertHistory.slice(-1000);
    }
    
    // Increment Prometheus counter if available
    if (prometheusClient) {
      prometheusClient.incrementAlert(alert.severity, alert.source);
    }
    
    logger.info('Alert created', {
      id: alert.id,
      name: alert.name,
      severity: alert.severity
    });
    
    // Send notifications
    sendAlertNotifications(alert, io);
    
    return alert;
  } catch (error) {
    logger.error('Error creating alert', { error: error.message, alert });
    throw error;
  }
}

/**
 * Acknowledge an alert
 */
function acknowledgeAlert(alertId) {
  // Find the alert in activeAlerts
  const activeAlert = findActiveAlertById(alertId);
  
  if (!activeAlert) {
    logger.warn('Cannot acknowledge alert: not found', { alertId });
    return false;
  }
  
  // Update alert
  activeAlert.status = 'acknowledged';
  activeAlert.acknowledgedAt = new Date();
  
  // Update in active alerts
  activeAlerts.set(activeAlert.ruleId, activeAlert);
  
  logger.info('Alert acknowledged', { id: alertId });
  
  return true;
}

/**
 * Resolve an alert
 */
function resolveAlert(alertId, resolution) {
  // Find the alert in activeAlerts
  const activeAlert = findActiveAlertById(alertId);
  
  if (!activeAlert) {
    logger.warn('Cannot resolve alert: not found', { alertId });
    return false;
  }
  
  // Update alert
  activeAlert.status = 'resolved';
  activeAlert.endsAt = resolution.resolvedAt || new Date();
  activeAlert.resolution = resolution;
  
  // Remove from active alerts
  activeAlerts.delete(activeAlert.ruleId);
  
  // Update history
  const historyIndex = alertHistory.findIndex(a => a.id === alertId);
  if (historyIndex >= 0) {
    alertHistory[historyIndex] = { ...activeAlert };
  }
  
  logger.info('Alert resolved', { 
    id: alertId,
    autoResolved: resolution.autoResolved
  });
  
  return true;
}

/**
 * Send alert notifications through configured channels
 */
function sendAlertNotifications(alert, io) {
  // Filter enabled notification channels
  const enabledChannels = notificationChannels.filter(channel => channel.enabled);
  
  for (const channel of enabledChannels) {
    try {
      switch (channel.type) {
        case 'console':
          // Log to console
          logger.info('ALERT NOTIFICATION', {
            name: alert.name,
            severity: alert.severity,
            summary: alert.annotations.summary
          });
          break;
          
        case 'websocket':
          // Send via WebSocket if io is available
          if (io) {
            io.to(channel.config.channel || 'alerts').emit('alert', alert);
            logger.debug('Sent alert via WebSocket', { 
              channel: channel.config.channel || 'alerts' 
            });
          }
          break;
          
        // Additional channel types would be implemented here
        // case 'email':
        // case 'slack':
        // case 'webhook':
        // etc.
          
        default:
          logger.warn('Unknown notification channel type', { type: channel.type });
      }
    } catch (error) {
      logger.error('Error sending notification', { 
        error: error.message,
        channel: channel.name,
        alertId: alert.id
      });
    }
  }
}

/**
 * Find an active alert by its ID
 */
function findActiveAlertById(alertId) {
  for (const [ruleId, alert] of activeAlerts.entries()) {
    if (alert.id === alertId) {
      return alert;
    }
  }
  return null;
}

/**
 * Add a new alert rule
 */
function addAlertRule(rule) {
  // Validate rule
  if (!rule.id || !rule.name || !rule.type || !rule.source) {
    throw new Error('Invalid alert rule: missing required fields');
  }
  
  // Check if rule with this ID already exists
  if (alertRules.some(r => r.id === rule.id)) {
    throw new Error(`Alert rule with ID ${rule.id} already exists`);
  }
  
  // Add rule
  alertRules.push(rule);
  
  logger.info('Alert rule added', { id: rule.id, name: rule.name });
  
  return rule;
}

/**
 * Update an existing alert rule
 */
function updateAlertRule(ruleId, updates) {
  // Find rule
  const index = alertRules.findIndex(r => r.id === ruleId);
  
  if (index === -1) {
    throw new Error(`Alert rule with ID ${ruleId} not found`);
  }
  
  // Update rule
  const updatedRule = { ...alertRules[index], ...updates };
  alertRules[index] = updatedRule;
  
  logger.info('Alert rule updated', { id: ruleId });
  
  return updatedRule;
}

/**
 * Delete an alert rule
 */
function deleteAlertRule(ruleId) {
  // Find rule
  const index = alertRules.findIndex(r => r.id === ruleId);
  
  if (index === -1) {
    throw new Error(`Alert rule with ID ${ruleId} not found`);
  }
  
  // Delete rule
  alertRules.splice(index, 1);
  
  logger.info('Alert rule deleted', { id: ruleId });
  
  return true;
}

/**
 * Add a new notification channel
 */
function addNotificationChannel(channel) {
  // Validate channel
  if (!channel.id || !channel.name || !channel.type) {
    throw new Error('Invalid notification channel: missing required fields');
  }
  
  // Check if channel with this ID already exists
  if (notificationChannels.some(c => c.id === channel.id)) {
    throw new Error(`Notification channel with ID ${channel.id} already exists`);
  }
  
  // Add channel
  notificationChannels.push(channel);
  
  logger.info('Notification channel added', { id: channel.id, name: channel.name });
  
  return channel;
}

/**
 * Update an existing notification channel
 */
function updateNotificationChannel(channelId, updates) {
  // Find channel
  const index = notificationChannels.findIndex(c => c.id === channelId);
  
  if (index === -1) {
    throw new Error(`Notification channel with ID ${channelId} not found`);
  }
  
  // Update channel
  const updatedChannel = { ...notificationChannels[index], ...updates };
  notificationChannels[index] = updatedChannel;
  
  logger.info('Notification channel updated', { id: channelId });
  
  return updatedChannel;
}

/**
 * Delete a notification channel
 */
function deleteNotificationChannel(channelId) {
  // Find channel
  const index = notificationChannels.findIndex(c => c.id === channelId);
  
  if (index === -1) {
    throw new Error(`Notification channel with ID ${channelId} not found`);
  }
  
  // Delete channel
  notificationChannels.splice(index, 1);
  
  logger.info('Notification channel deleted', { id: channelId });
  
  return true;
}

/**
 * Simulate a Prometheus query result
 * In a real system, this would be replaced with actual PromQL execution
 */
function simulatePrometheusQuery(query) {
  // This is just a simulation to demonstrate the concept
  // In a real system, this would execute the actual PromQL query
  
  // Parse query to extract metric and threshold
  const cpuMatch = query.match(/system_cpu_usage.*?(\d+)/);
  const memoryMatch = query.match(/system_memory_usage_bytes.*?(\d+)/);
  
  if (cpuMatch) {
    const threshold = parseInt(cpuMatch[1], 10);
    const value = Math.floor(Math.random() * 100); // Random CPU value 0-100
    return { 
      firing: value > threshold,
      value
    };
  } else if (memoryMatch) {
    const threshold = parseInt(memoryMatch[1], 10);
    const value = Math.floor(Math.random() * 100); // Random memory percentage 0-100
    return { 
      firing: value > threshold,
      value
    };
  }
  
  // Default - randomly fire 10% of the time
  return {
    firing: Math.random() < 0.1,
    value: Math.random() * 100
  };
}

/**
 * Simulate an Azure Monitor query result
 * In a real system, this would be replaced with actual Azure Monitor query
 */
function simulateAzureQuery(rule) {
  // This is just a simulation to demonstrate the concept
  // In a real system, this would query Azure Monitor
  
  // Randomly fire 10% of the time
  return {
    firing: Math.random() < 0.1,
    value: Math.floor(Math.random() * 100)
  };
}

/**
 * Get sample data for a resource type
 * In a real system, this would retrieve actual metrics
 */
function getSampleDataForResourceType(resourceType) {
  const timestamp = new Date().toISOString();
  
  switch (resourceType) {
    case 'cpu':
      return {
        timestamp,
        metrics: [
          { name: 'cpu_usage', value: Math.random() * 100, unit: '%' },
          { name: 'cpu_idle', value: Math.random() * 100, unit: '%' },
          { name: 'cpu_system', value: Math.random() * 20, unit: '%' },
          { name: 'cpu_user', value: Math.random() * 80, unit: '%' },
          { name: 'cpu_iowait', value: Math.random() * 10, unit: '%' },
          { name: 'cpu_steal', value: Math.random() * 5, unit: '%' },
          { name: 'cpu_temperature', value: 50 + Math.random() * 30, unit: '°C' }
        ],
        metadata: {
          cores: 4,
          architecture: 'x86_64',
          resourceType: 'cpu'
        }
      };
      
    case 'memory':
      const totalMemory = 16 * 1024 * 1024 * 1024; // 16GB
      const usedMemory = Math.random() * totalMemory;
      return {
        timestamp,
        metrics: [
          { name: 'memory_total', value: totalMemory, unit: 'bytes' },
          { name: 'memory_used', value: usedMemory, unit: 'bytes' },
          { name: 'memory_free', value: totalMemory - usedMemory, unit: 'bytes' },
          { name: 'memory_cached', value: Math.random() * 4 * 1024 * 1024 * 1024, unit: 'bytes' },
          { name: 'memory_buffers', value: Math.random() * 2 * 1024 * 1024 * 1024, unit: 'bytes' },
          { name: 'memory_usage_percent', value: (usedMemory / totalMemory) * 100, unit: '%' },
          { name: 'swap_usage', value: Math.random() * 100, unit: '%' }
        ],
        metadata: {
          type: 'DDR4',
          speed: '3200MHz',
          resourceType: 'memory'
        }
      };
      
    case 'network':
      return {
        timestamp,
        metrics: [
          { name: 'network_in', value: Math.random() * 100 * 1024 * 1024, unit: 'bytes' },
          { name: 'network_out', value: Math.random() * 50 * 1024 * 1024, unit: 'bytes' },
          { name: 'network_packets_in', value: Math.floor(Math.random() * 10000), unit: 'packets' },
          { name: 'network_packets_out', value: Math.floor(Math.random() * 5000), unit: 'packets' },
          { name: 'network_errors_in', value: Math.floor(Math.random() * 10), unit: 'errors' },
          { name: 'network_errors_out', value: Math.floor(Math.random() * 5), unit: 'errors' },
          { name: 'network_tcp_connections', value: Math.floor(Math.random() * 500), unit: 'connections' },
          { name: 'network_udp_connections', value: Math.floor(Math.random() * 100), unit: 'connections' }
        ],
        metadata: {
          interface: 'eth0',
          ip: '192.168.1.100',
          resourceType: 'network'
        }
      };
      
    default: // general
      return {
        timestamp,
        metrics: [
          { name: 'cpu_usage', value: Math.random() * 100, unit: '%' },
          { name: 'memory_usage_percent', value: Math.random() * 100, unit: '%' },
          { name: 'disk_usage_percent', value: Math.random() * 100, unit: '%' },
          { name: 'network_in', value: Math.random() * 100 * 1024 * 1024, unit: 'bytes' },
          { name: 'network_out', value: Math.random() * 50 * 1024 * 1024, unit: 'bytes' },
          { name: 'request_count', value: Math.floor(Math.random() * 1000), unit: 'requests' },
          { name: 'error_rate', value: Math.random() * 5, unit: '%' },
          { name: 'response_time', value: Math.random() * 500, unit: 'ms' }
        ],
        metadata: {
          hostname: 'server-01',
          environment: 'production',
          resourceType: 'general'
        }
      };
  }
} 