/**
 * Demo script for pretty-logger
 * 
 * This script demonstrates the colorful console output capabilities
 * of the pretty-logger utility.
 * 
 * Run with: node scripts/demo-pretty-logger.js
 */

import { 
  prettyPrintAlert, 
  prettyPrintMetric, 
  prettyPrintInsight,
  createPrettyConsoleFormat,
  createPrettyConsoleTransport
} from '../src/utils/pretty-logger.js';
import winston from 'winston';

console.log('\n📊 REALTIME MONITORING SYSTEM - PRETTY LOGGER DEMO\n');

// Demo 1: Pretty Alerts
console.log('\n=== DEMO: ALERTS ===\n');

// Critical alert
prettyPrintAlert({
  id: 'alert-001',
  name: 'Critical CPU Usage',
  severity: 'critical',
  status: 'active',
  timestamp: new Date().toISOString(),
  service: 'api-server',
  message: 'CPU usage exceeded 95% threshold for 5 minutes',
  description: 'The API server is experiencing extreme load. Possible causes include increased traffic, resource-intensive queries, or an infinite loop in the code.'
});

// High severity alert
prettyPrintAlert({
  id: 'alert-002',
  name: 'High Memory Usage',
  severity: 'high',
  status: 'active',
  timestamp: new Date().toISOString(),
  service: 'database',
  message: 'Memory usage reached 87% on primary database server',
  description: 'The database server is approaching memory limits. Consider optimizing queries or scaling up the instance.'
});

// Resolved alert
prettyPrintAlert({
  id: 'alert-003',
  name: 'API Latency',
  severity: 'medium',
  status: 'resolved',
  timestamp: new Date().toISOString(),
  service: 'payment-service',
  message: 'API endpoint /api/payments latency returned to normal levels',
  description: 'The 95th percentile response time is now below threshold at 180ms.'
});

// Demo 2: Pretty Metrics
console.log('\n=== DEMO: METRICS ===\n');

const now = new Date();
const metrics = [
  {
    name: 'CPU Usage',
    value: 85.4,
    timestamp: now,
    unit: '%',
    labels: { instance: 'web-server-01', region: 'us-east-1' }
  },
  {
    name: 'Memory Usage',
    value: 62.7,
    timestamp: now,
    unit: '%',
    labels: { instance: 'web-server-01', region: 'us-east-1' }
  },
  {
    name: 'Disk Space',
    value: 45.3,
    timestamp: now,
    unit: '%',
    labels: { instance: 'web-server-01', mount: '/data', region: 'us-east-1' }
  },
  {
    name: 'Network In',
    value: 1243.8,
    timestamp: now,
    unit: 'KB/s',
    labels: { instance: 'web-server-01', interface: 'eth0', region: 'us-east-1' }
  },
  {
    name: 'HTTP Requests',
    value: 347,
    timestamp: now,
    unit: 'req/min',
    labels: { service: 'frontend', endpoint: '/api' }
  }
];

metrics.forEach(metric => prettyPrintMetric(metric));

// Demo 3: Pretty AI Insights
console.log('\n=== DEMO: AI INSIGHTS ===\n');

// Anomaly detection
prettyPrintInsight({
  type: 'anomaly',
  message: 'Detected unusual pattern in CPU usage for service "api-server". The periodicity has changed from the baseline pattern.',
  confidence: 0.92,
  relatedServices: ['api-server', 'database'],
  timestamp: now
});

// Trend analysis
prettyPrintInsight({
  type: 'trend',
  message: 'Memory usage in database cluster has been steadily increasing by 5% week-over-week for the past 3 weeks.',
  confidence: 0.85,
  relatedServices: ['database'],
  timestamp: now
});

// Recommendation
prettyPrintInsight({
  type: 'recommendation',
  message: 'Consider enabling caching for frequently accessed product data to reduce database load. Analysis shows 30% of queries are for the same product information.',
  confidence: 0.78,
  relatedServices: ['product-service', 'database'],
  timestamp: now
});

// Demo 4: Winston Integration
console.log('\n=== DEMO: WINSTON LOGGER ===\n');

// Create a custom winston logger with pretty console output
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    createPrettyConsoleFormat(winston)
  ),
  defaultMeta: { service: 'demo-service' },
  transports: [
    createPrettyConsoleTransport(winston)
  ]
});

// Log messages at different levels
logger.error('Failed to connect to database', { 
  error: 'Connection refused', 
  database: 'users-db',
  retries: 3
});

logger.warn('High resource usage detected', { 
  resource: 'memory', 
  usage: '87%', 
  threshold: '80%' 
});

logger.info('User authentication successful', { 
  userId: 'user-123', 
  method: 'oauth' 
});

logger.debug('Processing batch job', { 
  jobId: 'job-456', 
  items: 250, 
  estimatedTime: '45s' 
});

console.log('\n🎉 Demo completed!\n'); 