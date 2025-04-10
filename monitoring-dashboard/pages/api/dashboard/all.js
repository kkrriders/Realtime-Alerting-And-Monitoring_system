import { NextApiRequest, NextApiResponse } from 'next';
import { API_BASE_URL, USE_MOCK_DATA } from '@/lib/config';

// Mock data for dashboard as fallback
const mockData = {
  metrics: [
    { id: 'cpu', name: 'CPU Usage', value: 32, unit: '%', status: 'normal', trend: 'stable' },
    { id: 'memory', name: 'Memory Usage', value: 64, unit: '%', status: 'warning', trend: 'increasing' },
    { id: 'disk', name: 'Disk Usage', value: 78, unit: '%', status: 'normal', trend: 'stable' },
    { id: 'network', name: 'Network Traffic', value: 25, unit: 'MB/s', status: 'normal', trend: 'decreasing' }
  ],
  alerts: [
    { id: 'alert1', severity: 'warning', name: 'Memory Alert', description: 'Memory usage exceeded 60%', status: 'active', createdAt: Date.now() - 300000, source: 'system', acknowledged: false },
    { id: 'alert2', severity: 'info', name: 'CPU Alert', description: 'CPU spike detected', status: 'acknowledged', createdAt: Date.now() - 600000, source: 'system', acknowledged: true },
    { id: 'alert3', severity: 'warning', name: 'Disk Alert', description: 'Disk usage growing rapidly', status: 'active', createdAt: Date.now() - 900000, source: 'system', acknowledged: false }
  ],
  insights: [
    { 
      id: 'insight1', 
      type: 'trend',
      title: 'Memory Usage Trend', 
      description: 'Memory usage has been steadily increasing over the past 24 hours.', 
      timestamp: Date.now() - 3600000,
      severity: 'warning',
      confidence: 0.85,
      relatedMetrics: ['memory'],
      suggestedActions: ['Investigate memory-intensive processes', 'Consider increasing memory allocation']
    },
    { 
      id: 'insight2', 
      type: 'anomaly',
      title: 'System Performance', 
      description: 'Overall system performance has degraded by 15% in the last week.', 
      timestamp: Date.now() - 7200000,
      severity: 'info',
      confidence: 0.72,
      relatedServices: ['Web Server', 'Database'],
      suggestedActions: ['Review recent system changes', 'Check for resource bottlenecks']
    }
  ],
  stats: {
    activeAlertCount: 2,
    acknowledgedAlertCount: 1,
    totalAlertCount: 3,
    avgCpuUsage: 32,
    avgMemoryUsage: 64,
    topConsumingServices: [
      { serviceName: 'Web Server', cpuUsage: 25, memoryUsage: 30 },
      { serviceName: 'Database', cpuUsage: 18, memoryUsage: 20 },
      { serviceName: 'Cache Service', cpuUsage: 12, memoryUsage: 15 }
    ],
    systemHealth: 'warning',
    lastUpdated: Date.now()
  }
};

export default async function handler(req, res) {
  // If we're using mock data or if it's a development environment without the backend running
  if (USE_MOCK_DATA) {
    return setTimeout(() => {
      res.status(200).json(mockData);
    }, 200);
  }
  
  // Try to get real data
  try {
    const backendUrl = `${API_BASE_URL}/api/dashboard/all`;
    console.log(`Fetching data from: ${backendUrl}`);
    
    const response = await fetch(backendUrl, {
      headers: { 
        'Accept': 'application/json',
        // Forward any auth headers if needed
        ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {})
      },
      timeout: 3000, // 3 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`);
    }
    
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching data from real backend:', error.message);
    console.log('Falling back to mock data');
    
    // Fall back to mock data if the real API fails
    return res.status(200).json(mockData);
  }
} 