import React, { useState } from 'react';
import { useMonitoring } from '@/context/MonitoringContext';
import { AlertData, AlertSeverity, AlertStatus } from '@/types/metrics';

interface AlertCardProps {
  alert: AlertData;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert }) => {
  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-700';
      case 'error': return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'info': return 'bg-blue-100 border-blue-500 text-blue-700';
      default: return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };
  
  const getStatusBadge = (status: AlertStatus) => {
    switch (status) {
      case 'active': 
        return <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">Active</span>;
      case 'acknowledged': 
        return <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded">Acknowledged</span>;
      case 'resolved': 
        return <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">Resolved</span>;
      default: 
        return null;
    }
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  return (
    <div className={`border-l-4 p-4 rounded-md shadow-sm mb-4 ${getSeverityColor(alert.severity)}`}>
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-medium">{alert.name}</h3>
        {getStatusBadge(alert.status)}
      </div>
      
      <p className="my-2">{alert.description}</p>
      
      <div className="mt-2 text-sm flex flex-wrap gap-2">
        <span className="bg-gray-200 px-2 py-1 rounded">{alert.source}</span>
        {alert.relatedMetric && 
          <span className="bg-gray-200 px-2 py-1 rounded">{alert.relatedMetric}</span>
        }
        {alert.relatedService && 
          <span className="bg-gray-200 px-2 py-1 rounded">{alert.relatedService}</span>
        }
      </div>
      
      {alert.relatedActions && alert.relatedActions.length > 0 && (
        <div className="mt-3">
          <h4 className="text-sm font-medium mb-1">Suggested actions:</h4>
          <ul className="list-disc list-inside text-sm">
            {alert.relatedActions.map((action, index) => (
              <li key={index}>{action}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500">
        <div>Created: {formatDate(alert.createdAt)}</div>
        {alert.acknowledgedAt && <div>Acknowledged: {formatDate(alert.acknowledgedAt)}</div>}
        {alert.resolvedAt && <div>Resolved: {formatDate(alert.resolvedAt)}</div>}
      </div>
    </div>
  );
};

export default function AlertsPanel() {
  const { alerts, isLoading, triggerNewAlert } = useMonitoring();
  const [filter, setFilter] = useState<AlertStatus | 'all'>('all');
  
  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.status === filter);
  
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Alerts</h2>
        <div className="animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-md mb-4"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Alerts</h2>
        <div className="flex gap-2">
          <select 
            className="border rounded px-2 py-1 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as AlertStatus | 'all')}
          >
            <option value="all">All Alerts</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
          
          <button 
            onClick={triggerNewAlert}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
          >
            Test New Alert
          </button>
        </div>
      </div>
      
      <div>
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))
        ) : (
          <p className="text-gray-500">No alerts found</p>
        )}
      </div>
    </div>
  );
} 