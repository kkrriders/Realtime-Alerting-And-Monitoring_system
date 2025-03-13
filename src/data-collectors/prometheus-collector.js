import client from 'prom-client';
import fetch from 'node-fetch';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'prometheus-collector' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/prometheus.log' })
  ]
});

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'realtime-monitoring-system'
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const cpuUsageGauge = new client.Gauge({
  name: 'system_cpu_usage',
  help: 'Current CPU usage percentage',
  labelNames: ['core']
});

const memoryUsageGauge = new client.Gauge({
  name: 'system_memory_usage_bytes',
  help: 'Current memory usage in bytes',
  labelNames: ['type']
});

const alertsCounter = new client.Counter({
  name: 'alerts_triggered_total',
  help: 'Total number of alerts triggered',
  labelNames: ['severity', 'type']
});

// Register all custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(cpuUsageGauge);
register.registerMetric(memoryUsageGauge);
register.registerMetric(alertsCounter);

/**
 * Fetches metrics from an external Prometheus server
 * @param {string} prometheusUrl - The URL of the Prometheus server
 * @param {string} query - PromQL query
 * @returns {Promise<Object>} - Query results
 */
async function queryPrometheusServer(prometheusUrl, query) {
  try {
    const url = `${prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error querying Prometheus server', { error: error.message, query });
    throw error;
  }
}

/**
 * Sets up the Prometheus client and creates a middleware for Express
 */
export async function setupPrometheus() {
  logger.info('Setting up Prometheus collector...');
  
  // Initialize with some default system metrics
  updateSystemMetrics();
  
  // Schedule regular updates of system metrics
  setInterval(updateSystemMetrics, 15000);
  
  logger.info('Prometheus collector setup completed');
  
  return {
    register,
    contentType: register.contentType,
    metrics: () => register.metrics(),
    recordHttpRequest: (req, res, time) => {
      httpRequestDurationMicroseconds
        .labels(req.method, req.path, res.statusCode)
        .observe(time);
    },
    incrementAlert: (severity, type) => {
      alertsCounter.labels(severity, type).inc();
    },
    queryPrometheus: queryPrometheusServer,
    customMetrics: {
      httpRequestDurationMicroseconds,
      cpuUsageGauge,
      memoryUsageGauge,
      alertsCounter
    }
  };
}

/**
 * Updates system metrics (CPU, memory)
 * In a real environment, this would use system metrics libraries
 */
function updateSystemMetrics() {
  try {
    // Simulate CPU usage for 4 cores
    // In production, use a library like 'os-utils' or 'systeminformation'
    for (let i = 0; i < 4; i++) {
      const usage = Math.random() * 100;
      cpuUsageGauge.labels(`core-${i}`).set(usage);
    }
    
    // Simulate memory usage
    // In production, use actual system metrics
    const totalMem = 16 * 1024 * 1024 * 1024; // 16GB in bytes
    const usedMem = Math.random() * totalMem;
    memoryUsageGauge.labels('used').set(usedMem);
    memoryUsageGauge.labels('total').set(totalMem);
    
    logger.debug('System metrics updated');
  } catch (error) {
    logger.error('Error updating system metrics', { error: error.message });
  }
} 