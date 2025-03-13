import { DefaultAzureCredential } from '@azure/identity';
import { LogsQueryClient, MetricsQueryClient } from '@azure/monitor-query';
import winston from 'winston';
import nodeCron from 'node-cron';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'azure-monitor' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/azure-monitor.log' })
  ]
});

// Data cache
const metricsCache = new Map();
const logsCache = new Map();
let eventListeners = [];

// Initialize Azure Monitor clients
export async function setupAzureMonitor() {
  logger.info('Setting up Azure Monitor integration...');
  
  try {
    // Use Azure Default Credential
    const credential = new DefaultAzureCredential();
    
    // Create clients
    const logsClient = new LogsQueryClient(credential);
    const metricsClient = new MetricsQueryClient(credential);
    
    // Set up scheduled data collection
    setupScheduledDataCollection(logsClient, metricsClient);
    
    logger.info('Azure Monitor integration setup completed');
    
    return {
      // Methods for direct data retrieval
      queryLogs: async (workspaceId, query, timespan) => queryLogsFromAzure(logsClient, workspaceId, query, timespan),
      queryMetrics: async (resourceId, metricNames, options) => queryMetricsFromAzure(metricsClient, resourceId, metricNames, options),
      
      // Methods for cached data access
      getCachedMetrics: (resourceId, metricName) => metricsCache.get(`${resourceId}:${metricName}`),
      getCachedLogs: (workspaceId, queryId) => logsCache.get(`${workspaceId}:${queryId}`),
      
      // Event subscription
      subscribe: (event, callback) => {
        eventListeners.push({ event, callback });
        return eventListeners.length - 1;
      },
      unsubscribe: (id) => {
        if (id >= 0 && id < eventListeners.length) {
          eventListeners[id] = null;
          return true;
        }
        return false;
      }
    };
  } catch (error) {
    logger.error('Failed to set up Azure Monitor integration', { error: error.message });
    throw error;
  }
}

/**
 * Query logs from Azure Monitor
 */
async function queryLogsFromAzure(client, workspaceId, query, timespan) {
  try {
    // Default timespan to last 24 hours if not provided
    const queryTimespan = timespan || { duration: 'PT24H' };
    
    const result = await client.queryWorkspace(workspaceId, query, { timespan: queryTimespan });
    
    // Generate a unique ID for this query
    const queryId = generateQueryId(query);
    
    // Cache the result
    logsCache.set(`${workspaceId}:${queryId}`, {
      timestamp: new Date(),
      result: result
    });
    
    // Notify subscribers
    notifySubscribers('logs', { workspaceId, queryId, result });
    
    return result;
  } catch (error) {
    logger.error('Error querying Azure Monitor logs', {
      error: error.message,
      workspaceId,
      query
    });
    throw error;
  }
}

/**
 * Query metrics from Azure Monitor
 */
async function queryMetricsFromAzure(client, resourceId, metricNames, options = {}) {
  try {
    const result = await client.queryResource(resourceId, metricNames, options);
    
    // Cache each metric separately
    metricNames.forEach((metricName) => {
      metricsCache.set(`${resourceId}:${metricName}`, {
        timestamp: new Date(),
        result: result.metrics.find(m => m.name === metricName)
      });
    });
    
    // Notify subscribers
    notifySubscribers('metrics', { resourceId, metricNames, result });
    
    return result;
  } catch (error) {
    logger.error('Error querying Azure Monitor metrics', {
      error: error.message,
      resourceId,
      metricNames
    });
    throw error;
  }
}

/**
 * Set up scheduled data collection
 */
function setupScheduledDataCollection(logsClient, metricsClient) {
  // Example configuration for scheduled queries
  // In production, this should be loaded from configuration files
  const scheduledQueries = [
    {
      name: 'VM CPU Usage',
      schedule: '*/15 * * * *', // Every 15 minutes
      type: 'metrics',
      resourceId: process.env.AZURE_VM_RESOURCE_ID,
      metrics: ['Percentage CPU'],
      options: { aggregation: 'Average', interval: { duration: 'PT5M' } }
    },
    {
      name: 'App Service HTTP 5xx',
      schedule: '*/10 * * * *', // Every 10 minutes
      type: 'metrics',
      resourceId: process.env.AZURE_APP_SERVICE_RESOURCE_ID,
      metrics: ['Http5xx'],
      options: { aggregation: 'Count', interval: { duration: 'PT5M' } }
    },
    {
      name: 'Security Events',
      schedule: '0 * * * *', // Every hour
      type: 'logs',
      workspaceId: process.env.AZURE_LOG_ANALYTICS_WORKSPACE_ID,
      query: 'SecurityEvent | where TimeGenerated > ago(1h) | summarize count() by Activity',
      timespan: { duration: 'PT1H' }
    }
  ];
  
  // Create cron jobs for each scheduled query
  scheduledQueries.forEach(query => {
    if (!query.schedule) return;
    
    nodeCron.schedule(query.schedule, async () => {
      try {
        logger.debug(`Running scheduled query: ${query.name}`);
        
        if (query.type === 'metrics' && query.resourceId && query.metrics) {
          await queryMetricsFromAzure(metricsClient, query.resourceId, query.metrics, query.options);
        } else if (query.type === 'logs' && query.workspaceId && query.query) {
          await queryLogsFromAzure(logsClient, query.workspaceId, query.query, query.timespan);
        }
      } catch (error) {
        logger.error(`Error in scheduled query ${query.name}`, { error: error.message });
      }
    });
    
    logger.info(`Scheduled query configured: ${query.name}`);
  });
}

/**
 * Generate a unique ID for a query
 */
function generateQueryId(query) {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `query_${Math.abs(hash).toString(16)}`;
}

/**
 * Notify subscribers when new data is available
 */
function notifySubscribers(eventType, data) {
  eventListeners.forEach(listener => {
    if (listener && listener.event === eventType) {
      try {
        listener.callback(data);
      } catch (error) {
        logger.error('Error in event listener', { error: error.message });
      }
    }
  });
} 