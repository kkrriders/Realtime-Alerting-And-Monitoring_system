import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupPrometheusClient } from './data-collectors/prometheus-collector.js';
import { setupGcpMonitoring } from './data-collectors/gcp-monitoring.js';
import { setupAlertManager } from './alerting/alert-manager.js';
import { setupAiIntegration } from './ai-integration/ollama-client.js';
import winston from 'winston';
import { createPrettyConsoleTransport } from './utils/pretty-logger.js';
import alertManager from './alerts/alert-manager.js';
import path from 'path';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'monitoring-service' },
  transports: [
    // Use pretty console transport for development, regular console for production
    process.env.NODE_ENV !== 'production' 
      ? createPrettyConsoleTransport(winston)
      : new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Start the server
async function startServer() {
  try {
    // Initialize Express app
    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer);
    
    // Initialize data collectors
    let prometheusClient;
    let gcpMonitoringClient;
    let aiClient;
    
    // Initialize Prometheus
    try {
      prometheusClient = await setupPrometheusClient();
      logger.info('Prometheus client initialized');
    } catch (error) {
      logger.error('Error initializing Prometheus client', { error: error.message });
    }
    
    // Initialize Google Cloud Monitoring
    try {
      gcpMonitoringClient = await setupGcpMonitoring();
      logger.info('Google Cloud Monitoring initialized');
    } catch (error) {
      logger.error('Error initializing Google Cloud Monitoring', { error: error.message });
    }
    
    // Initialize AI integration
    try {
      aiClient = await setupAiIntegration();
      logger.info('AI integration initialized');
    } catch (error) {
      logger.error('Error initializing AI integration', { error: error.message });
    }
    
    // Initialize alert manager
    const alertManager = await setupAlertManager({
      prometheusClient,
      gcpMonitoringClient,
      aiClient,
      io
    });
    
    // Middleware
    app.use(express.json());
    app.use(express.static('public'));
    
    // Handle favicon requests
    app.get('/favicon.ico', (req, res) => {
      res.status(204).end(); // No content response to avoid 404 errors
    });

    // API Routes
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy' });
    });

    app.get('/api/metrics', async (req, res) => {
      try {
        // Return current metrics in the format expected by the frontend
        const metrics = await prometheusClient.customMetrics;
        const formattedMetrics = Object.entries(metrics).map(([key, metric], index) => ({
          id: `metric-${index + 1}`,
          name: key,
          value: Math.random() * 100, // Sample value, you'll want to get real values
          timestamp: Date.now(),
          source: 'prometheus',
          unit: key.includes('cpu') ? 'percent' : key.includes('memory') ? 'bytes' : 'count',
          thresholds: {
            warning: key.includes('cpu') ? 70 : 80,
            critical: key.includes('cpu') ? 90 : 95
          },
          metadata: { host: 'web-server-01' }
        }));

        res.json({ metrics: formattedMetrics });
      } catch (error) {
        logger.error('Error fetching metrics', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch metrics' });
      }
    });

    app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', prometheusClient.contentType);
        res.end(await prometheusClient.metrics());
      } catch (error) {
        logger.error('Error fetching metrics', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch metrics' });
      }
    });

    app.get('/api/alerts', (req, res) => {
      // Return active alerts from the alert manager
      const alerts = Array.from(alertManager.activeAlerts.values()).map(alert => ({
        id: alert.id,
        name: alert.ruleName,
        description: alert.annotations?.description || 'Alert triggered',
        severity: alert.severity,
        status: alert.status === 'firing' ? 'active' : 'resolved',
        createdAt: alert.startsAt,
        source: alert.source || 'prometheus',
        relatedMetric: alert.query,
        relatedService: alert.labels?.service || 'system'
      }));
      
      res.json({ alerts });
    });

    app.get('/api/insights', (req, res) => {
      // Return AI-generated insights
      const insights = [
        {
          id: 'insight-1',
          type: 'anomaly',
          title: 'CPU Usage Anomaly',
          description: 'Unusual CPU pattern detected in the last hour',
          severity: 'warning',
          confidence: 0.85,
          timestamp: Date.now(),
          relatedServices: ['api-server'],
          suggestedActions: ['Investigate recent deployments', 'Check for resource-intensive processes']
        },
        {
          id: 'insight-2',
          type: 'trend',
          title: 'Memory Usage Trend',
          description: 'Memory usage increasing steadily over the past 24 hours',
          severity: 'info',
          confidence: 0.92,
          timestamp: Date.now() - 3600000,
          relatedServices: ['database'],
          suggestedActions: ['Plan for memory upgrade', 'Review database query optimizations']
        }
      ];
      
      res.json({ insights });
    });

    app.get('/api/stats', (req, res) => {
      // Return dashboard stats
      const stats = {
        activeAlertCount: alertManager.activeAlerts.size,
        acknowledgedAlertCount: 0,
        totalAlertCount: alertManager.alertHistory.length,
        avgCpuUsage: 62.5,
        avgMemoryUsage: 74.8,
        topConsumingServices: [
          { name: 'database', usage: 85 },
          { name: 'api-server', usage: 76 },
          { name: 'frontend', usage: 45 }
        ],
        systemHealth: alertManager.activeAlerts.size > 5 ? 'critical' : 
                      alertManager.activeAlerts.size > 0 ? 'warning' : 'healthy',
        lastUpdated: Date.now()
      };
      
      res.json(stats);
    });

    app.get('/api/dashboard/all', (req, res) => {
      // Return all dashboard data in one call
      const metrics = Array.from({ length: 5 }).map((_, index) => ({
        id: `metric-${index + 1}`,
        name: ['cpu_usage', 'memory_usage', 'disk_usage', 'network_in', 'network_out'][index],
        value: Math.random() * 100,
        timestamp: Date.now(),
        source: 'prometheus',
        unit: index === 0 ? 'percent' : index === 1 ? 'percent' : index === 2 ? 'percent' : 'bytes_per_second',
        thresholds: {
          warning: index === 0 ? 70 : 80,
          critical: index === 0 ? 90 : 95
        },
        metadata: { host: 'web-server-01' }
      }));
      
      const alerts = Array.from(alertManager.activeAlerts.values()).map(alert => ({
        id: alert.id,
        name: alert.ruleName,
        description: alert.annotations?.description || 'Alert triggered',
        severity: alert.severity,
        status: alert.status === 'firing' ? 'active' : 'resolved',
        createdAt: alert.startsAt,
        source: alert.source || 'prometheus',
        relatedMetric: alert.query,
        relatedService: alert.labels?.service || 'system'
      }));
      
      const insights = [
        {
          id: 'insight-1',
          type: 'anomaly',
          title: 'CPU Usage Anomaly',
          description: 'Unusual CPU pattern detected in the last hour',
          severity: 'warning',
          confidence: 0.85,
          timestamp: Date.now(),
          relatedServices: ['api-server'],
          suggestedActions: ['Investigate recent deployments', 'Check for resource-intensive processes']
        },
        {
          id: 'insight-2',
          type: 'trend',
          title: 'Memory Usage Trend',
          description: 'Memory usage increasing steadily over the past 24 hours',
          severity: 'info',
          confidence: 0.92,
          timestamp: Date.now() - 3600000,
          relatedServices: ['database'],
          suggestedActions: ['Plan for memory upgrade', 'Review database query optimizations']
        }
      ];
      
      const stats = {
        activeAlertCount: alertManager.activeAlerts.size,
        acknowledgedAlertCount: 0,
        totalAlertCount: alertManager.alertHistory.length,
        avgCpuUsage: 62.5,
        avgMemoryUsage: 74.8,
        topConsumingServices: [
          { name: 'database', usage: 85 },
          { name: 'api-server', usage: 76 },
          { name: 'frontend', usage: 45 }
        ],
        systemHealth: alertManager.activeAlerts.size > 5 ? 'critical' : 
                      alertManager.activeAlerts.size > 0 ? 'warning' : 'healthy',
        lastUpdated: Date.now()
      };
      
      res.json({
        metrics,
        alerts,
        insights,
        stats
      });
    });

    // WebSocket connection for real-time updates
    io.on('connection', (socket) => {
      logger.info('Client connected to real-time updates');
      
      socket.on('subscribe', (channel) => {
        logger.info(`Client subscribed to ${channel}`);
        socket.join(channel);
      });
      
      socket.on('disconnect', () => {
        logger.info('Client disconnected from real-time updates');
      });
    });

    // Start server
    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Shutting down gracefully...');
  
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
}); 