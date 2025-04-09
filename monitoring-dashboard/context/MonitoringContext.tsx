import React, { createContext, useContext, ReactNode } from 'react';
import useRealTimeUpdates from '@/hooks/useRealTimeUpdates';
import { MetricData, AlertData, AIInsight, DashboardStats, WSMessage } from '@/types/metrics';

interface MonitoringContextProps {
  metrics: MetricData[];
  alerts: AlertData[];
  insights: AIInsight[];
  stats: DashboardStats;
  isConnected: boolean;
  connectionError: string | null;
  lastUpdate: WSMessage | null;
  triggerNewAlert: () => void;
  triggerNewInsight: () => void;
  sendMessage: (message: any) => void;
  isLoading: boolean;
}

// Default stats object to avoid null issues
const defaultStats: DashboardStats = {
  activeAlertCount: 0,
  acknowledgedAlertCount: 0,
  totalAlertCount: 0,
  avgCpuUsage: 0,
  avgMemoryUsage: 0,
  topConsumingServices: [],
  systemHealth: 'healthy',
  lastUpdated: Date.now()
};

const defaultContextValue: MonitoringContextProps = {
  metrics: [],
  alerts: [],
  insights: [],
  stats: defaultStats,
  isConnected: false,
  connectionError: null,
  lastUpdate: null,
  triggerNewAlert: () => {},
  triggerNewInsight: () => {},
  sendMessage: () => {},
  isLoading: true
};

const MonitoringContext = createContext<MonitoringContextProps>(defaultContextValue);

export const useMonitoring = () => useContext(MonitoringContext);

interface MonitoringProviderProps {
  children: ReactNode;
  initialData?: {
    metrics?: MetricData[];
    alerts?: AlertData[];
    insights?: AIInsight[];
    stats?: DashboardStats;
  };
}

export const MonitoringProvider: React.FC<MonitoringProviderProps> = ({ 
  children, 
  initialData 
}) => {
  const [stats, setStats] = React.useState<DashboardStats>(initialData?.stats || defaultStats);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  
  // Initialize real-time updates
  const { 
    data,
    isConnected,
    lastUpdate,
    error: connectionError,
    sendMessage,
    triggerNewAlert,
    triggerNewInsight
  } = useRealTimeUpdates({
    metrics: initialData?.metrics,
    alerts: initialData?.alerts,
    insights: initialData?.insights
  });
  
  // Fetch initial dashboard stats if not provided
  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        if (!initialData?.stats) {
          const response = await fetch('/api/dashboard-data?dataType=dashboard-stats');
          if (response.ok) {
            const statsData = await response.json();
            setStats(statsData);
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, [initialData?.stats]);
  
  // Update stats when metrics or alerts change
  React.useEffect(() => {
    if (data.metrics.length > 0 || data.alerts.length > 0) {
      updateStats();
    }
  }, [data.metrics, data.alerts]);
  
  // Function to update stats based on current data
  const updateStats = () => {
    // Simple stat calculations based on current data
    const activeAlerts = data.alerts.filter(a => a.status === 'active').length;
    const acknowledgedAlerts = data.alerts.filter(a => a.status === 'acknowledged').length;
    
    // Find CPU and memory metrics
    const cpuMetric = data.metrics.find(m => m.name === 'cpu_usage');
    const memoryMetric = data.metrics.find(m => m.name === 'memory_usage');
    
    setStats({
      ...stats,
      activeAlertCount: activeAlerts,
      acknowledgedAlertCount: acknowledgedAlerts,
      totalAlertCount: data.alerts.length,
      avgCpuUsage: cpuMetric?.value || stats.avgCpuUsage,
      avgMemoryUsage: memoryMetric?.value || stats.avgMemoryUsage,
      lastUpdated: Date.now(),
      systemHealth: activeAlerts > 3 ? 'critical' : activeAlerts > 0 ? 'degraded' : 'healthy'
    });
  };
  
  const contextValue: MonitoringContextProps = {
    metrics: data.metrics,
    alerts: data.alerts,
    insights: data.insights,
    stats,
    isConnected,
    connectionError,
    lastUpdate,
    sendMessage,
    triggerNewAlert,
    triggerNewInsight,
    isLoading
  };
  
  return (
    <MonitoringContext.Provider value={contextValue}>
      {children}
    </MonitoringContext.Provider>
  );
}; 