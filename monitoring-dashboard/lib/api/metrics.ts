import { MetricsResponse, TimeSeriesResponse, AlertsResponse, DashboardStats, AIInsight } from '@/types/metrics';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';

// Helper function to handle API errors
const handleApiError = (error: any): never => {
  console.error('API Error:', error);
  if (error.response) {
    throw new Error(`API error: ${error.response.status} - ${error.response.data.message || 'Unknown error'}`);
  } else if (error.request) {
    throw new Error('Network error: No response received from server');
  } else {
    throw new Error(`Error: ${error.message}`);
  }
};

/**
 * Fetches current metrics from the monitoring API
 */
export async function fetchCurrentMetrics(): Promise<MetricsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/metrics/current`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetches time series data for a specific metric
 */
export async function fetchMetricHistory(
  metricId: string, 
  timeRange: string = '1h',
  resolution: string = '1m'
): Promise<TimeSeriesResponse> {
  try {
    const url = new URL(`${API_BASE_URL}/api/metrics/history/${metricId}`);
    url.searchParams.append('timeRange', timeRange);
    url.searchParams.append('resolution', resolution);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching metric history for ${metricId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetches active alerts from the monitoring API
 */
export async function fetchAlerts(
  status: 'active' | 'resolved' | 'all' = 'active',
  severity?: 'info' | 'warning' | 'error' | 'critical', 
  source?: string,
  limit: number = 50,
  offset: number = 0
): Promise<AlertsResponse> {
  try {
    const url = new URL(`${API_BASE_URL}/api/alerts`);
    url.searchParams.append('status', status);
    if (severity) url.searchParams.append('severity', severity);
    if (source) url.searchParams.append('source', source);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Acknowledges an alert
 */
export async function acknowledgeAlert(alertId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error acknowledging alert ${alertId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Resolves an alert
 */
export async function resolveAlert(alertId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error resolving alert ${alertId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetches dashboard stats
 */
export async function fetchDashboardStats(): Promise<{ success: boolean; error?: string; data?: DashboardStats }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetches AI insights
 */
export async function fetchAIInsights(
  type?: 'anomaly' | 'trend' | 'recommendation',
  limit: number = 10
): Promise<{ success: boolean; error?: string; data?: AIInsight[] }> {
  try {
    const url = new URL(`${API_BASE_URL}/api/ai/insights`);
    if (type) url.searchParams.append('type', type);
    url.searchParams.append('limit', limit.toString());
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 