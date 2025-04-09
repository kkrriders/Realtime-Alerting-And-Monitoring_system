import alertManager from './src/alerts/alert-manager.js';
import alertAnalyzer from './src/ai-integration/alert-analyzer.js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Load environment variables
dotenv.config();

// Make sure logs directory exists
(async () => {
  try {
    await fs.mkdir('logs', { recursive: true });
  } catch (err) {
    console.error('Error creating logs directory:', err);
  }
})();

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Sample metrics for testing
const sampleCpuMetrics = {
  system_cpu_usage: 85, // Will trigger our CPU rule
  cpu: {
    usage: 85,
    cores: [
      { core: "0", usage: 90 },
      { core: "1", usage: 78 },
      { core: "2", usage: 82 },
      { core: "3", usage: 88 }
    ],
    temperature: 65
  }
};

const sampleMemoryMetrics = {
  system_memory_usage_percent: 92, // Will trigger our memory rule
  memory: {
    total: 16384,
    used: 15073,
    free: 1311,
    swap: {
      total: 8192,
      used: 2048
    }
  }
};

// API Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/api/metrics', (req, res) => {
  try {
    // Return current metrics in the format expected by the frontend
    const metrics = Array.from({ length: 10 }).map((_, index) => ({
      id: `metric-${index + 1}`,
      name: [
        'cpu_usage', 'memory_usage', 'disk_usage', 'network_in', 'network_out',
        'http_requests', 'http_errors', 'api_latency', 'database_connections', 'queue_length'
      ][index],
      value: Math.random() * 100,
      timestamp: Date.now(),
      source: 'prometheus',
      unit: index < 3 ? 'percent' : index < 5 ? 'bytes_per_second' : index === 7 ? 'ms' : 'count',
      thresholds: {
        warning: index === 0 ? 70 : 80,
        critical: index === 0 ? 90 : 95
      },
      metadata: { host: 'web-server-01' }
    }));

    res.json({ metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

app.get('/api/alerts', (req, res) => {
  // Return active alerts from the alert manager
  if (!alertManager.initialized) {
    return res.json({ alerts: [] });
  }
  
  const alerts = Array.from(alertManager.activeAlerts.values()).map(alert => ({
    id: alert.id,
    name: alert.ruleName,
    description: alert.annotations?.description || 'Alert triggered',
    severity: alert.severity,
    status: alert.status === 'firing' ? 'active' : 'resolved',
    createdAt: alert.timestamp,
    source: alert.source || 'prometheus',
    relatedMetric: alert.value,
    relatedService: alert.labels?.service || 'system'
  }));
  
  res.json({ alerts });
});

app.get('/api/insights', (req, res) => {
  // Return AI-generated insights from the alert manager
  if (alertManager.recentInsights && alertManager.recentInsights.length > 0) {
    res.json({ insights: alertManager.recentInsights });
  } else {
    // Fallback to static insights if no real ones available yet
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
  }
});

app.get('/api/stats', (req, res) => {
  // Return dashboard stats
  if (!alertManager.initialized) {
    return res.json({
      activeAlertCount: 0,
      acknowledgedAlertCount: 0,
      totalAlertCount: 0,
      avgCpuUsage: 45.2,
      avgMemoryUsage: 62.8,
      topConsumingServices: [],
      systemHealth: 'healthy',
      lastUpdated: Date.now()
    });
  }
  
  const stats = {
    activeAlertCount: alertManager.activeAlerts.size,
    acknowledgedAlertCount: 0,
    totalAlertCount: alertManager.alertHistory.length,
    avgCpuUsage: 62.5,
    avgMemoryUsage: 74.8,
    topConsumingServices: [
      { serviceName: 'database', cpuUsage: 85.2, memoryUsage: 72.1 },
      { serviceName: 'api-server', cpuUsage: 76.8, memoryUsage: 68.4 },
      { serviceName: 'frontend', cpuUsage: 45.3, memoryUsage: 58.7 }
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
  
  const alerts = !alertManager.initialized ? [] : 
    Array.from(alertManager.activeAlerts.values()).map(alert => ({
      id: alert.id,
      name: alert.ruleName,
      description: alert.annotations?.description || 'Alert triggered',
      severity: alert.severity,
      status: alert.status === 'firing' ? 'active' : 'resolved',
      createdAt: alert.timestamp,
      source: alert.source || 'prometheus',
      relatedMetric: alert.value,
      relatedService: alert.labels?.service || 'system'
    }));
  
  // Use generated insights if available, otherwise use static examples
  const insights = alertManager.recentInsights && alertManager.recentInsights.length > 0
    ? alertManager.recentInsights.slice(0, 3) // Return most recent 3
    : [
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
    activeAlertCount: !alertManager.initialized ? 0 : alertManager.activeAlerts.size,
    acknowledgedAlertCount: 0,
    totalAlertCount: !alertManager.initialized ? 0 : alertManager.alertHistory.length,
    avgCpuUsage: 62.5,
    avgMemoryUsage: 74.8,
    topConsumingServices: [
      { serviceName: 'database', cpuUsage: 85.2, memoryUsage: 72.1 },
      { serviceName: 'api-server', cpuUsage: 76.8, memoryUsage: 68.4 },
      { serviceName: 'message-queue', cpuUsage: 48.6, memoryUsage: 62.3 }
    ],
    systemHealth: !alertManager.initialized ? 'healthy' : 
                  alertManager.activeAlerts.size > 5 ? 'critical' : 
                  alertManager.activeAlerts.size > 0 ? 'degraded' : 'healthy',
    lastUpdated: Date.now()
  };
  
  res.json({
    metrics,
    alerts,
    insights,
    stats
  });
});

// Initialize and start the system
async function startSystem() {
  try {
    console.log("Starting Real-Time Alerting and Monitoring System...");
    
    // Initialize the alert manager
    await alertManager.initialize();
    
    // Store recent AI insights
    alertManager.recentInsights = [];
    
    console.log("Alert manager initialized successfully");
    console.log(`WebSocket server running on port ${process.env.WS_PORT || 3002}`);
    
    // Register event listeners
    alertManager.on('alert', (alert) => {
      console.log(`🔔 Alert triggered: ${alert.ruleName} (${alert.severity})`);
    });
    
    alertManager.on('alert_resolved', (alert) => {
      console.log(`✅ Alert resolved: ${alert.ruleName}`);
    });
    
    alertManager.on('alert_patterns', (patterns) => {
      console.log(`📊 Detected ${patterns.patterns.length} alert patterns`);
    });
    
    // Send test metrics after 3 seconds
    setTimeout(() => {
      console.log("\n--- Sending CPU test metrics ---");
      alertManager.processMetrics(sampleCpuMetrics, 'prometheus');
    }, 3000);
    
    // Send memory metrics after 6 seconds
    setTimeout(() => {
      console.log("\n--- Sending Memory test metrics ---");
      alertManager.processMetrics(sampleMemoryMetrics, 'prometheus');
    }, 6000);
    
    // Resolve CPU alert after 10 seconds (by sending normal values)
    setTimeout(() => {
      console.log("\n--- Sending normal CPU metrics (should resolve alert) ---");
      alertManager.processMetrics({
        system_cpu_usage: 45,
        cpu: { usage: 45 }
      }, 'prometheus');
    }, 10000);

    // Set up continuous metrics generation
    setInterval(() => {
      // Generate random metrics to simulate real-time data
      const randomMetrics = {
        system_cpu_usage: Math.random() * 100,
        system_memory_usage_percent: Math.random() * 100,
        system_disk_usage_percent: Math.random() * 100,
        network_throughput: Math.random() * 1000,
        api_response_time: Math.random() * 500
      };
      
      // Process the metrics silently (no console logs)
      alertManager.processMetrics(randomMetrics, 'prometheus');
      
    }, 5000); // Every 5 seconds
    
    // Generate AI insights every 15 seconds
    setInterval(async () => {
      try {
        console.log("Generating AI insights...");
        const metrics = alertManager.lastProcessedMetrics || {};
        
        // Generate different types of insights
        const anomaly = await alertAnalyzer.explainAnomaly(metrics, { resourceType: 'cpu' });
        const trend = await alertAnalyzer.analyzeTrends(metrics, { timeframe: '1h' });
        const recommendation = await alertAnalyzer.generateRecommendations({}, [], metrics);
        const prediction = await alertAnalyzer.predictResourceUsage(metrics, { resource: 'memory', timeframe: '2h' });
        const correlation = await alertAnalyzer.correlateMetrics(metrics, { metrics: ['system_cpu_usage', 'system_memory_usage_percent'] });
        
        // Create and broadcast anomaly insight
        if (anomaly && anomaly.explanation) {
          const insight = {
            id: `insight-anomaly-${Date.now()}`,
            type: 'anomaly',
            title: 'Potential CPU Anomaly Detected',
            description: anomaly.explanation,
            severity: anomaly.severity || 'info',
            timestamp: Date.now(),
            relatedMetrics: ['system_cpu_usage'],
            confidence: anomaly.confidence || 0.85,
            suggestedActions: anomaly.suggestedActions || ['Monitor system', 'Check for resource-intensive processes']
          };
          
          // Store insight for API endpoint
          alertManager.recentInsights.unshift(insight);
          
          // Broadcast insight via WebSocket
          alertManager.broadcastInsight(insight);
          console.log(`Broadcasted anomaly insight: ${insight.title}`);
        }
        
        // Create and broadcast trend insight
        if (trend && trend.explanation) {
          const insight = {
            id: `insight-trend-${Date.now()}`,
            type: 'trend',
            title: 'Resource Usage Trend Analysis',
            description: trend.explanation,
            severity: 'info',
            timestamp: Date.now(),
            relatedMetrics: ['system_memory_usage_percent', 'system_cpu_usage'],
            confidence: 0.78,
            suggestedActions: ['Review capacity planning', 'Monitor trend for next 24 hours']
          };
          
          // Store insight for API endpoint
          alertManager.recentInsights.unshift(insight);
          
          // Broadcast insight via WebSocket
          alertManager.broadcastInsight(insight);
          console.log(`Broadcasted trend insight: ${insight.title}`);
        }
        
        // Create and broadcast recommendation insight
        if (recommendation && recommendation.recommendations && recommendation.recommendations.length > 0) {
          const recommendationText = recommendation.recommendations.map(r => 
            `[${r.priority.toUpperCase()}] ${r.description}`
          ).join('. ');
          
          const insight = {
            id: `insight-recommendation-${Date.now()}`,
            type: 'recommendation',
            title: 'System Optimization Recommendations',
            description: recommendationText,
            severity: 'info',
            timestamp: Date.now(),
            relatedMetrics: ['system_memory_usage_percent', 'system_cpu_usage'],
            confidence: 0.92,
            suggestedActions: recommendation.recommendations.map(r => r.action || r.description)
          };
          
          // Store insight for API endpoint
          alertManager.recentInsights.unshift(insight);
          
          // Broadcast insight via WebSocket
          alertManager.broadcastInsight(insight);
          console.log(`Broadcasted recommendation insight: ${insight.title}`);
        }
        
        // Create and broadcast prediction insight
        if (prediction && prediction.explanation) {
          const insight = {
            id: `insight-prediction-${Date.now()}`,
            type: 'prediction',
            title: 'Memory Usage Forecast',
            description: prediction.explanation,
            severity: 'info',
            timestamp: Date.now(),
            relatedMetrics: ['system_memory_usage_percent'],
            confidence: prediction.confidence || 0.75,
            suggestedActions: ['Plan resource allocation based on forecast']
          };
          
          // Store insight for API endpoint
          alertManager.recentInsights.unshift(insight);
          
          // Broadcast insight via WebSocket
          alertManager.broadcastInsight(insight);
          console.log(`Broadcasted prediction insight: ${insight.title}`);
        }
        
        // Create and broadcast correlation insight
        if (correlation && correlation.explanation) {
          const insight = {
            id: `insight-correlation-${Date.now()}`,
            type: 'correlation',
            title: 'Metric Correlation Analysis',
            description: correlation.explanation,
            severity: 'info',
            timestamp: Date.now(),
            relatedMetrics: ['system_cpu_usage', 'system_memory_usage_percent'],
            confidence: 0.88,
            suggestedActions: ['Investigate relationship between correlated metrics']
          };
          
          // Store insight for API endpoint
          alertManager.recentInsights.unshift(insight);
          
          // Broadcast insight via WebSocket
          alertManager.broadcastInsight(insight);
          console.log(`Broadcasted correlation insight: ${insight.title}`);
        }
        
        // Limit the number of stored insights
        if (alertManager.recentInsights.length > 20) {
          alertManager.recentInsights = alertManager.recentInsights.slice(0, 20);
        }
      } catch (error) {
        console.error("Error generating AI insights:", error);
      }
    }, 15000); // Every 15 seconds
    
    console.log("System started successfully. Sending test metrics shortly...");
    console.log("Continuous metrics generation active. Check your dashboard.");
  } catch (error) {
    console.error("Failed to start system:", error);
  }
}

// Start the server and system
const PORT = process.env.PORT || 3050;
server.listen(PORT, async () => {
  console.log(`Server started on port ${PORT}`);
  await startSystem();
}); 