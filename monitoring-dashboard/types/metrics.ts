// Basic type definitions
export type MetricName = string;
export type Timestamp = number;
export type MetricValue = number;
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'error';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type InsightType = 'anomaly' | 'trend' | 'correlation' | 'recommendation' | 'prediction';
export type WSMessageType = 
  | 'metric-update' 
  | 'alert-update' 
  | 'insight-update'
  | 'metrics'
  | 'alert'
  | 'resolve'
  | 'insight';

// Metric related types
export interface MetricData {
  id: string;
  name: MetricName;
  value: MetricValue;
  unit: string;
  timestamp: Timestamp;
  source: string;
  thresholds?: {
    warning?: number;
    critical?: number;
  };
  metadata?: Record<string, any>;
}

export interface TimeSeriesPoint {
  timestamp: Timestamp;
  value: MetricValue;
}

export type MetricHistory = Record<MetricName, TimeSeriesPoint[]>;

// Alert related types
export interface AlertData {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: Timestamp;
  acknowledgedAt?: Timestamp;
  resolvedAt?: Timestamp;
  source: string;
  relatedMetric?: MetricName;
  relatedService?: string;
  relatedActions?: string[];
  metadata?: Record<string, any>;
}

// AI Insight related types
export interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  severity: AlertSeverity;
  timestamp: Timestamp;
  relatedMetrics?: MetricName[];
  relatedServices?: string[];
  confidence: number;
  suggestedActions?: string[];
  metadata?: Record<string, any>;
}

// Dashboard stats
export interface DashboardStats {
  activeAlertCount: number;
  acknowledgedAlertCount: number;
  totalAlertCount: number;
  avgCpuUsage: number;
  avgMemoryUsage: number;
  topConsumingServices: Array<{
    serviceName: string;
    cpuUsage: number;
    memoryUsage: number;
  }>;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  lastUpdated: Timestamp;
}

// WebSocket message types
export interface WSMessage {
  type: WSMessageType;
  data?: MetricData | AlertData | AIInsight;
  timestamp?: Timestamp;
  // Backend specific formats
  metrics?: MetricData[];
  alert?: AlertData;
  insight?: AIInsight;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
}
