import React from 'react';
import { useMonitoring } from '@/context/MonitoringContext';
import { USE_MOCK_DATA } from '@/lib/config';

export default function DashboardHeader() {
  const { stats, isConnected, connectionError, isLoading } = useMonitoring();
  
  const getHealthStatus = () => {
    if (!stats) return { color: 'bg-gray-500', text: 'Unknown' };
    
    switch (stats.systemHealth) {
      case 'healthy':
        return { color: 'bg-green-500', text: 'Healthy' };
      case 'degraded':
        return { color: 'bg-yellow-500', text: 'Degraded' };
      case 'critical':
        return { color: 'bg-red-500', text: 'Critical' };
      default:
        return { color: 'bg-gray-500', text: 'Unknown' };
    }
  };
  
  const getConnectionStatus = () => {
    if (connectionError) {
      return { color: 'bg-red-500', text: 'Error', details: connectionError };
    }
    
    return isConnected 
      ? { color: 'bg-green-500', text: 'Connected', details: USE_MOCK_DATA ? '(Mock Data)' : '(Live)' }
      : { color: 'bg-red-500', text: 'Disconnected', details: 'No real-time updates' };
  };
  
  const healthStatus = getHealthStatus();
  const connectionStatus = getConnectionStatus();
  
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">System Dashboard</h1>
          <div className="animate-pulse flex space-x-4">
            <div className="h-6 w-24 bg-gray-200 rounded"></div>
            <div className="h-6 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 w-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">System Dashboard</h1>
        <div className="flex space-x-4">
          <div className="flex items-center">
            <div className={`h-3 w-3 rounded-full ${healthStatus.color} mr-2`}></div>
            <span className="text-sm font-medium">System: {healthStatus.text}</span>
          </div>
          <div className="flex items-center group relative">
            <div className={`h-3 w-3 rounded-full ${connectionStatus.color} mr-2`}></div>
            <span className="text-sm font-medium">Real-time: {connectionStatus.text}</span>
            
            {connectionStatus.details && (
              <div className="hidden group-hover:block absolute top-full mt-1 right-0 bg-gray-800 text-white text-xs rounded p-2 z-10 w-48">
                {connectionStatus.details}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {stats && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <h3 className="text-sm text-gray-500">Active Alerts</h3>
            <p className="text-xl font-bold">
              {stats.activeAlertCount}
              {stats.activeAlertCount > 0 && (
                <span className="text-xs text-red-500 ml-2">
                  {stats.activeAlertCount > 3 ? 'Critical' : 'Warning'}
                </span>
              )}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm text-gray-500">Avg CPU Usage</h3>
            <p className="text-xl font-bold">
              {stats.avgCpuUsage.toFixed(1)}%
              {stats.avgCpuUsage > 80 && <span className="text-xs text-red-500 ml-2">High</span>}
              {stats.avgCpuUsage > 60 && stats.avgCpuUsage <= 80 && (
                <span className="text-xs text-yellow-500 ml-2">Moderate</span>
              )}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm text-gray-500">Avg Memory Usage</h3>
            <p className="text-xl font-bold">
              {stats.avgMemoryUsage.toFixed(1)}%
              {stats.avgMemoryUsage > 85 && <span className="text-xs text-red-500 ml-2">High</span>}
              {stats.avgMemoryUsage > 70 && stats.avgMemoryUsage <= 85 && (
                <span className="text-xs text-yellow-500 ml-2">Moderate</span>
              )}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm text-gray-500">Total Alerts</h3>
            <p className="text-xl font-bold">{stats.totalAlertCount}</p>
          </div>
        </div>
      )}
      
      {stats && stats.lastUpdated && (
        <div className="mt-4 text-xs text-gray-500 text-right">
          Last updated: {new Date(stats.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
} 