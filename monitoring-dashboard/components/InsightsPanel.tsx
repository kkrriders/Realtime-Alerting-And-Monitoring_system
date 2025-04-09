import React from 'react';
import { useMonitoring } from '@/context/MonitoringContext';
import { AIInsight, InsightType, AlertSeverity } from '@/types/metrics';

interface InsightCardProps {
  insight: AIInsight;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const getInsightIcon = (type: InsightType) => {
    switch (type) {
      case 'anomaly': return '🔍';
      case 'trend': return '📈';
      case 'correlation': return '🔗';
      case 'recommendation': return '💡';
      case 'prediction': return '🔮';
      default: return '✨';
    }
  };
  
  const getInsightTypeLabel = (type: InsightType) => {
    switch (type) {
      case 'anomaly': return 'Anomaly Detection';
      case 'trend': return 'Trend Analysis';
      case 'correlation': return 'Metric Correlation';
      case 'recommendation': return 'Recommendation';
      case 'prediction': return 'Prediction';
      default: return type;
    }
  };
  
  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'error': return 'text-orange-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-blue-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  return (
    <div className="border border-gray-200 p-4 rounded-md shadow-sm mb-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{getInsightIcon(insight.type)}</div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium">{insight.title}</h3>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              {getInsightTypeLabel(insight.type)}
            </span>
          </div>
          
          <p className="my-2 text-gray-700">{insight.description}</p>
          
          <div className="mt-2 flex flex-wrap gap-2">
            {insight.relatedMetrics && insight.relatedMetrics.map((metric, index) => (
              <span key={index} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                {metric}
              </span>
            ))}
            
            {insight.relatedServices && insight.relatedServices.map((service, index) => (
              <span key={index} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded">
                {service}
              </span>
            ))}
          </div>
          
          {insight.suggestedActions && insight.suggestedActions.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium mb-1">Suggested actions:</h4>
              <ul className="list-disc list-inside text-sm text-gray-700">
                {insight.suggestedActions.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-3 flex justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className={getSeverityColor(insight.severity)}>
                {insight.severity.charAt(0).toUpperCase() + insight.severity.slice(1)}
              </span>
              <span className={getConfidenceColor(insight.confidence)}>
                Confidence: {(insight.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              {new Date(insight.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function InsightsPanel() {
  const { insights, isLoading, triggerNewInsight } = useMonitoring();
  
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">AI Insights</h2>
        <div className="animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-md mb-4"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">AI Insights</h2>
        <button 
          onClick={triggerNewInsight}
          className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
        >
          Generate New Insight
        </button>
      </div>
      
      <div>
        {insights.length > 0 ? (
          insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        ) : (
          <p className="text-gray-500">No AI insights available</p>
        )}
      </div>
    </div>
  );
} 