import React from 'react';
import { useMonitoring } from '@/context/MonitoringContext';
import { MetricData } from '@/types/metrics';

interface MetricCardProps {
  metric: MetricData;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric }) => {
  const getStatusColor = () => {
    if (!metric.thresholds) return 'bg-blue-100 border-blue-500';
    
    if (metric.value >= (metric.thresholds.critical || Infinity)) {
      return 'bg-red-100 border-red-500';
    } else if (metric.value >= (metric.thresholds.warning || Infinity)) {
      return 'bg-yellow-100 border-yellow-500';
    } else {
      return 'bg-green-100 border-green-500';
    }
  };
  
  const formatValue = (value: number, unit: string) => {
    if (unit === 'percent') return `${value.toFixed(1)}%`;
    if (unit === 'bytes') {
      if (value >= 1073741824) return `${(value / 1073741824).toFixed(2)} GB`;
      if (value >= 1048576) return `${(value / 1048576).toFixed(2)} MB`;
      if (value >= 1024) return `${(value / 1024).toFixed(2)} KB`;
      return `${value} B`;
    }
    if (unit === 'ms') return `${value.toFixed(2)} ms`;
    if (unit === 'bytes_per_second') {
      const mbps = value / 131072; // Convert to Mbps (bytes to megabits)
      return `${mbps.toFixed(2)} Mbps`;
    }
    if (unit === 'requests_per_second') return `${value.toFixed(2)} req/s`;
    if (unit === 'count') return value.toLocaleString();
    
    return `${value} ${unit}`;
  };
  
  return (
    <div className={`border-l-4 p-4 rounded-md shadow-sm ${getStatusColor()}`}>
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-medium">{metric.name.replace(/_/g, ' ')}</h3>
        <span className="text-xs bg-gray-200 px-2 py-1 rounded">
          {metric.source}
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold">
        {formatValue(metric.value, metric.unit)}
      </div>
      {metric.thresholds && (
        <div className="mt-1 text-xs text-gray-500">
          {metric.thresholds.warning && (
            <span className="mr-2">Warning: {formatValue(metric.thresholds.warning, metric.unit)}</span>
          )}
          {metric.thresholds.critical && (
            <span>Critical: {formatValue(metric.thresholds.critical, metric.unit)}</span>
          )}
        </div>
      )}
      <div className="mt-2 text-xs text-gray-400">
        Updated: {new Date(metric.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default function MetricsPanel() {
  const { metrics, isLoading } = useMonitoring();
  
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">System Metrics</h2>
        <div className="animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-md mb-4"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">System Metrics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.length > 0 ? (
          metrics.map((metric) => (
            <MetricCard key={metric.name} metric={metric} />
          ))
        ) : (
          <p className="col-span-3 text-gray-500">No metrics available</p>
        )}
      </div>
    </div>
  );
} 