import { NextApiRequest, NextApiResponse } from 'next';
import { 
  mockCurrentMetrics, 
  mockMetricHistory, 
  mockAlerts, 
  mockInsights, 
  mockDashboardStats 
} from '@/lib/api/mock-data';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { dataType } = req.query;
  
  switch (dataType) {
    case 'metrics':
      return res.status(200).json({ metrics: mockCurrentMetrics });
    
    case 'metric-history':
      const { metricName } = req.query;
      if (metricName && typeof metricName === 'string' && mockMetricHistory[metricName]) {
        return res.status(200).json({ 
          history: mockMetricHistory[metricName] 
        });
      } else if (!metricName) {
        return res.status(200).json({ history: mockMetricHistory });
      }
      return res.status(404).json({ error: 'Metric history not found' });
    
    case 'alerts':
      const { status } = req.query;
      let filteredAlerts = [...mockAlerts];
      
      if (status && typeof status === 'string') {
        filteredAlerts = mockAlerts.filter(alert => alert.status === status);
      }
      
      return res.status(200).json({ alerts: filteredAlerts });
    
    case 'insights':
      return res.status(200).json({ insights: mockInsights });
    
    case 'dashboard-stats':
      return res.status(200).json(mockDashboardStats);
    
    case 'all':
      return res.status(200).json({
        metrics: mockCurrentMetrics,
        alerts: mockAlerts.filter(alert => alert.status === 'active'),
        insights: mockInsights.slice(0, 3), // Return most recent 3
        stats: mockDashboardStats
      });
    
    default:
      return res.status(400).json({ error: 'Invalid data type requested' });
  }
} 