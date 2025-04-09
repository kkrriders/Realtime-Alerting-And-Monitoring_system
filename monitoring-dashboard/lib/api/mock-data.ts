import { 
  MetricData, 
  MetricHistory, 
  AlertData, 
  AIInsight, 
  DashboardStats,
  TimeSeriesPoint,
  WSMessage,
  WSMessageType
} from '@/types/metrics';

// Helper to generate timestamps within the last N hours
const getTimestampMinusHours = (hours: number): number => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.getTime();
};

// Helper to generate random values with some trending
const generateTimeSeriesData = (
  hours: number, 
  intervalMinutes: number,
  baseValue: number,
  variability: number,
  trend: number = 0
): TimeSeriesPoint[] => {
  const points = [];
  const intervals = (hours * 60) / intervalMinutes;
  
  for (let i = 0; i < intervals; i++) {
    const timestamp = getTimestampMinusHours(hours - (i * intervalMinutes / 60));
    const randomFactor = (Math.random() - 0.5) * variability;
    const trendFactor = (i / intervals) * trend;
    const value = baseValue + randomFactor + trendFactor;
    
    points.push({
      timestamp,
      value: Math.max(0, Number(value.toFixed(2)))
    });
  }
  
  return points.reverse(); // Return in chronological order
};

// Current metrics for dashboard
export const mockCurrentMetrics: MetricData[] = [
  {
    id: 'metric-1',
    name: 'cpu_usage',
    value: 68.5,
    timestamp: Date.now(),
    source: 'prometheus',
    unit: 'percent',
    thresholds: {
      warning: 70,
      critical: 85
    },
    metadata: { 'host': 'web-server-01' }
  },
  {
    id: 'metric-2',
    name: 'memory_usage',
    value: 72.3,
    timestamp: Date.now(),
    source: 'prometheus',
    unit: 'percent',
    thresholds: {
      warning: 70,
      critical: 90
    },
    metadata: { 'host': 'web-server-01' }
  },
  {
    id: 'metric-3',
    name: 'disk_usage',
    value: 85.1,
    timestamp: Date.now(),
    source: 'prometheus',
    unit: 'percent',
    thresholds: {
      warning: 80,
      critical: 90
    },
    metadata: { 'host': 'web-server-01', 'disk': '/dev/sda1' }
  },
  {
    id: 'metric-4',
    name: 'network_in',
    value: 3.25 * 1024 * 1024, // Convert to bytes for proper display
    timestamp: Date.now(),
    source: 'prometheus',
    unit: 'bytes_per_second',
    metadata: { 'host': 'web-server-01', 'interface': 'eth0', 'formatted': '3.25 MB/s' }
  },
  {
    id: 'metric-5',
    name: 'network_out',
    value: 1.75 * 1024 * 1024, // Convert to bytes for proper display
    timestamp: Date.now(),
    source: 'prometheus',
    unit: 'bytes_per_second',
    metadata: { 'host': 'web-server-01', 'interface': 'eth0', 'formatted': '1.75 MB/s' }
  },
  {
    id: 'metric-6',
    name: 'http_requests',
    value: 452,
    timestamp: Date.now(),
    source: 'application',
    unit: 'requests_per_second',
    thresholds: {
      warning: 500,
      critical: 800
    },
    metadata: { 'service': 'api-gateway' }
  },
  {
    id: 'metric-7',
    name: 'http_errors',
    value: 12,
    timestamp: Date.now(),
    source: 'application',
    unit: 'count',
    thresholds: {
      warning: 10,
      critical: 20
    },
    metadata: { 'service': 'api-gateway', 'error_type': '5xx' }
  },
  {
    id: 'metric-8',
    name: 'api_latency',
    value: 215,
    timestamp: Date.now(),
    source: 'application',
    unit: 'ms',
    thresholds: {
      warning: 200,
      critical: 300
    },
    metadata: { 'service': 'api-gateway', 'percentile': 'p95' }
  },
  {
    id: 'metric-9',
    name: 'database_connections',
    value: 42,
    timestamp: Date.now(),
    source: 'application',
    unit: 'count',
    thresholds: {
      warning: 50,
      critical: 80
    },
    metadata: { 'service': 'database', 'type': 'active' }
  },
  {
    id: 'metric-10',
    name: 'queue_length',
    value: 23,
    timestamp: Date.now(),
    source: 'application',
    unit: 'count',
    thresholds: {
      warning: 30,
      critical: 50
    },
    metadata: { 'service': 'message-queue' }
  }
];

// Historical metric data
export const mockMetricHistory: MetricHistory = {
  'cpu_usage': generateTimeSeriesData(24, 5, 65, 20, 10), // Trending up slightly
  'memory_usage': generateTimeSeriesData(24, 5, 70, 10, 5), // Stable with slight trend up
  'disk_usage': generateTimeSeriesData(24, 15, 80, 5, 8), // Slowly increasing
  'network_in': generateTimeSeriesData(24, 2, 3 * 1024 * 1024, 1.5 * 1024 * 1024, 0),
  'network_out': generateTimeSeriesData(24, 2, 1.5 * 1024 * 1024, 1 * 1024 * 1024, 0),
  'http_requests': generateTimeSeriesData(24, 1, 420, 120, 40), // Increasing load
  'http_errors': generateTimeSeriesData(24, 5, 5, 15, 20), // Spiking errors
  'api_latency': generateTimeSeriesData(24, 1, 180, 60, 60) // Increasing latency
};

// Active and recent alerts
export const mockAlerts: AlertData[] = [
  {
    id: 'alert-1',
    name: 'High CPU Usage',
    description: 'CPU usage has exceeded 80% threshold for more than 5 minutes',
    severity: 'warning',
    status: 'active',
    createdAt: getTimestampMinusHours(0.5),
    source: 'prometheus',
    relatedMetric: 'cpu_usage',
    relatedService: 'web-server-01',
    relatedActions: [
      'View system details in Grafana',
      'Trigger auto-scaling for this service',
      'Check for resource-intensive processes'
    ],
    metadata: { 'host': 'web-server-01' }
  },
  {
    id: 'alert-2',
    name: 'High Disk Usage',
    description: 'Disk usage on /dev/sda1 has exceeded 85% threshold',
    severity: 'critical',
    status: 'active',
    createdAt: getTimestampMinusHours(1.2),
    source: 'prometheus',
    relatedMetric: 'disk_usage',
    relatedService: 'web-server-01',
    relatedActions: [
      'Run disk cleanup script',
      'Expand disk space',
      'Check log rotation settings'
    ],
    metadata: { 'host': 'web-server-01', 'disk': '/dev/sda1' }
  },
  {
    id: 'alert-3',
    name: 'API Latency Spike',
    description: '95th percentile API response time is above 200ms threshold',
    severity: 'warning',
    status: 'acknowledged',
    createdAt: getTimestampMinusHours(3),
    acknowledgedAt: getTimestampMinusHours(2.5),
    source: 'application',
    relatedMetric: 'api_latency',
    relatedService: 'api-gateway',
    relatedActions: [
      'Analyze API performance metrics',
      'Check database query performance',
      'Review recent code deployments'
    ],
    metadata: { 'service': 'api-gateway', 'percentile': 'p95' }
  },
  {
    id: 'alert-4',
    name: 'High Error Rate',
    description: 'HTTP 5xx error rate has increased above 5% threshold',
    severity: 'critical',
    status: 'active',
    createdAt: getTimestampMinusHours(0.2),
    source: 'application',
    relatedMetric: 'http_errors',
    relatedService: 'api-gateway',
    relatedActions: [
      'Check server logs for errors',
      'Verify external service dependencies',
      'Rollback recent deployment if necessary'
    ],
    metadata: { 'service': 'api-gateway', 'error_type': '5xx' }
  },
  {
    id: 'alert-5',
    name: 'Memory Leak Detected',
    description: 'Memory usage is steadily increasing over time',
    severity: 'warning',
    status: 'resolved',
    createdAt: getTimestampMinusHours(12),
    acknowledgedAt: getTimestampMinusHours(11),
    resolvedAt: getTimestampMinusHours(5),
    source: 'ai',
    relatedMetric: 'memory_usage',
    relatedService: 'web-server-01',
    relatedActions: [
      'Review application memory profile',
      'Check for memory leaks',
      'Restart service if necessary'
    ],
    metadata: { 
      'host': 'web-server-01', 
      'detected_by': 'AI anomaly detection',
      'confidence': 0.89
    }
  }
];

// AI-generated insights
export const mockInsights: AIInsight[] = [
  {
    id: 'insight-1',
    type: 'anomaly',
    title: 'Unusual API Latency Pattern',
    description: 'API latency shows unusual periodic spikes that don\'t correlate with request volume. This may indicate a scheduled job or external service dependency issue.',
    severity: 'warning',
    timestamp: getTimestampMinusHours(1.5),
    relatedMetrics: ['api_latency', 'http_requests'],
    relatedServices: ['api-gateway'],
    confidence: 0.85,
    suggestedActions: [
      'Investigate scheduled tasks running at spike times',
      'Check external service dependencies',
      'Review database query patterns'
    ],
    metadata: {
      'anomaly_details': 'Periodic 3x latency spike every 30 minutes',
      'detected_pattern': 'Cyclic, independent of load'
    }
  },
  {
    id: 'insight-2',
    type: 'trend',
    title: 'Increasing Memory Usage Trend',
    description: 'Memory usage has been steadily increasing by approximately 2% per day over the last week. At this rate, it will reach critical levels in 4 days.',
    severity: 'info',
    timestamp: getTimestampMinusHours(5),
    relatedMetrics: ['memory_usage'],
    relatedServices: ['web-server-01'],
    confidence: 0.92,
    suggestedActions: [
      'Check for memory leaks in the application',
      'Consider increasing monitoring frequency',
      'Plan for potential service restart during low-traffic period'
    ],
    metadata: {
      'growth_rate': '~2% per day',
      'time_to_critical': '~4 days'
    }
  },
  {
    id: 'insight-3',
    type: 'correlation',
    title: 'Error Rate Correlation with Database Latency',
    description: 'Strong correlation detected between HTTP error rates and database connection count. When connections exceed 35, error rates increase significantly.',
    severity: 'warning',
    timestamp: getTimestampMinusHours(8),
    relatedMetrics: ['http_errors', 'database_connections'],
    relatedServices: ['api-gateway', 'database'],
    confidence: 0.78,
    suggestedActions: [
      'Review database connection pooling settings',
      'Check for connection leaks in the application',
      'Consider increasing maximum database connections'
    ],
    metadata: {
      'correlation_strength': '0.91',
      'threshold_identified': '35 connections'
    }
  },
  {
    id: 'insight-4',
    type: 'recommendation',
    title: 'Resource Optimization Opportunity',
    description: 'Based on usage patterns, CPU resources appear over-provisioned by approximately 30% during non-peak hours (22:00-06:00).',
    severity: 'info',
    timestamp: getTimestampMinusHours(24),
    relatedMetrics: ['cpu_usage'],
    relatedServices: ['web-server-01'],
    confidence: 0.87,
    suggestedActions: [
      'Implement auto-scaling to reduce resources during off-hours',
      'Consider downsizing instances during maintenance periods',
      'Redistribute workload to improve resource utilization'
    ],
    metadata: {
      'optimization_potential': '~30% cost reduction',
      'applicable_hours': '22:00-06:00'
    }
  },
  {
    id: 'insight-5',
    type: 'prediction',
    title: 'Predicted Disk Space Exhaustion',
    description: 'Based on current growth rates, disk space will reach critical levels (95%) in approximately 8 days.',
    severity: 'critical',
    timestamp: getTimestampMinusHours(2),
    relatedMetrics: ['disk_usage'],
    relatedServices: ['web-server-01'],
    confidence: 0.95,
    suggestedActions: [
      'Schedule disk cleanup activities',
      'Evaluate need for disk expansion',
      'Review log rotation and retention policies'
    ],
    metadata: {
      'current_growth_rate': '~1.5% per day',
      'time_to_critical': '~8 days',
      'predicted_exhaustion_date': new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
];

// Dashboard summary statistics
export const mockDashboardStats: DashboardStats = {
  activeAlertCount: mockAlerts.filter(a => a.status === 'active').length,
  acknowledgedAlertCount: mockAlerts.filter(a => a.status === 'acknowledged').length,
  totalAlertCount: mockAlerts.length,
  avgCpuUsage: 68.5, // Calculated from metrics
  avgMemoryUsage: 72.3, // Calculated from metrics
  topConsumingServices: [
    {
      serviceName: 'api-gateway',
      cpuUsage: 72.4,
      memoryUsage: 68.1
    },
    {
      serviceName: 'database',
      cpuUsage: 65.2,
      memoryUsage: 85.7
    },
    {
      serviceName: 'message-queue',
      cpuUsage: 48.6,
      memoryUsage: 62.3
    }
  ],
  systemHealth: 'degraded', // Based on active alerts
  lastUpdated: Date.now()
};

// Function to simulate WebSocket messages
export const simulateWSMessage = (): WSMessage => {
  const types: WSMessageType[] = ['metric-update', 'alert-update', 'insight-update'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  let data: any;
  
  switch (type) {
    case 'metric-update':
      // Update a random metric
      const metricIndex = Math.floor(Math.random() * mockCurrentMetrics.length);
      const metric = { ...mockCurrentMetrics[metricIndex] };
      
      // Adjust the value slightly
      const variability = metric.value * 0.05; // 5% variability
      metric.value += (Math.random() - 0.5) * variability;
      metric.value = Number(metric.value.toFixed(2));
      metric.timestamp = Date.now();
      
      data = metric;
      break;
      
    case 'alert-update':
      // Pick a random alert
      const alertIndex = Math.floor(Math.random() * mockAlerts.length);
      const alert = { ...mockAlerts[alertIndex] };
      
      // Sometimes change status
      if (Math.random() > 0.7) {
        if (alert.status === 'active') {
          alert.status = 'acknowledged';
          alert.acknowledgedAt = Date.now();
        } else if (alert.status === 'acknowledged' && Math.random() > 0.5) {
          alert.status = 'resolved';
          alert.resolvedAt = Date.now();
        }
      }
      
      data = alert;
      break;
      
    case 'insight-update':
      // Pick a random insight
      const insightIndex = Math.floor(Math.random() * mockInsights.length);
      const insight = { ...mockInsights[insightIndex] };
      
      // Update the timestamp
      insight.timestamp = Date.now();
      
      data = insight;
      break;
  }
  
  return {
    type,
    data,
    timestamp: Date.now()
  };
}; 