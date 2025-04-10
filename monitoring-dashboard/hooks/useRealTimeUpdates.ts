import { useState, useEffect, useRef, useCallback } from 'react';
import { MetricData, AlertData, AIInsight, WSMessage } from '@/types/metrics';
import websocketSimulator from '@/lib/api/websocket-simulator';
import { USE_MOCK_DATA, getWebSocketConfig } from '@/lib/config';

type UpdatedData = {
  metrics: MetricData[];
  alerts: AlertData[];
  insights: AIInsight[];
};

export default function useRealTimeUpdates(initialData?: Partial<UpdatedData>) {
  const [data, setData] = useState<UpdatedData>({
    metrics: initialData?.metrics || [],
    alerts: initialData?.alerts || [],
    insights: initialData?.insights || [],
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<WSMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Reference to WebSocket instance
  const wsRef = useRef<WebSocket | null>(null);
  // Reference to reconnect timeout
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Connect to WebSocket function
  const connectToWebSocket = useCallback(() => {
    const config = getWebSocketConfig();
    
    if (!config.ENABLED) {
      setError('Real-time updates are disabled in configuration');
      return;
    }
    
    // Clean up previous connection if it exists
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Using mock WebSocket simulator
    if (USE_MOCK_DATA) {
      websocketSimulator.connect();
      setIsConnected(true);
      setError(null);
      setReconnectAttempts(0);
      return;
    } 
    
    // Using real WebSocket connection
    try {
      console.log(`Connecting to WebSocket at ${config.URL}`);
      const ws = new WebSocket(config.URL);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        setReconnectAttempts(0);
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);
        setIsConnected(false);
        
        // Don't attempt to reconnect if close was clean/intentional
        if (event.wasClean) {
          setError('WebSocket connection closed cleanly');
        } else {
          setError('WebSocket connection closed unexpectedly');
          attemptReconnect();
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        // onclose will be called after onerror
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;
          setLastUpdate(message);
          handleMessage(message);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
    } catch (err) {
      console.error('Error setting up WebSocket:', err);
      setError('Failed to connect to WebSocket server');
      attemptReconnect();
    }
  }, []);
  
  // Reconnection logic
  const attemptReconnect = useCallback(() => {
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Implement exponential backoff
    const maxReconnectAttempts = 5;
    if (reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
        connectToWebSocket();
      }, delay);
    } else {
      console.log('Max reconnect attempts reached, falling back to polling');
      // Implement polling fallback here if needed
      setError('Unable to establish WebSocket connection, falling back to polling');
      
      // Start polling for updates every 10 seconds
      startPolling();
    }
  }, [reconnectAttempts, connectToWebSocket]);
  
  // Polling fallback
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const startPolling = useCallback(() => {
    if (isPolling) return;
    
    setIsPolling(true);
    console.log('Starting polling for updates');
    
    const pollInterval = 10000; // 10 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch('/api/dashboard/all');
        if (response.ok) {
          const result = await response.json();
          
          // Update data similar to WebSocket messages
          if (result.metrics) {
            result.metrics.forEach(updateMetric);
          }
          if (result.alerts) {
            result.alerts.forEach(updateAlert);
          }
          if (result.insights) {
            result.insights.forEach(updateInsight);
          }
        }
      } catch (err) {
        console.error('Error polling for updates:', err);
      }
    }, pollInterval);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsPolling(false);
    };
  }, [isPolling]);
  
  // Connect to the WebSocket or simulator
  useEffect(() => {
    connectToWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      if (USE_MOCK_DATA) {
        websocketSimulator.disconnect();
      }
      
      setIsConnected(false);
    };
  }, [connectToWebSocket]);
  
  // Subscribe to mock WebSocket simulator updates
  useEffect(() => {
    if (!USE_MOCK_DATA) return;
    
    const unsubscribe = websocketSimulator.subscribe((message) => {
      setLastUpdate(message);
      handleMessage(message);
    });
    
    return unsubscribe;
  }, []);
  
  // Handle incoming messages from either source
  const handleMessage = (message: WSMessage) => {
    switch (message.type) {
      case 'metric-update':
      case 'metrics':
        // Handle both singular metrics and multiple metrics array
        if (Array.isArray(message.metrics)) {
          message.metrics.forEach(updateMetric);
        } else if (message.data) {
          updateMetric(message.data as MetricData);
        }
        break;
      case 'alert':
      case 'alert-update':
        if (message.alert) {
          updateAlert(message.alert as AlertData);
        } else if (message.data) {
          updateAlert(message.data as AlertData);
        }
        break;
      case 'resolve':
        // Handle alert resolution
        if (message.alert) {
          const resolvedAlert = {
            ...message.alert,
            status: 'resolved',
            resolvedAt: new Date().toISOString()
          } as AlertData;
          updateAlert(resolvedAlert);
        }
        break;
      case 'insight':
      case 'insight-update':
        if (message.insight) {
          updateInsight(message.insight as AIInsight);
        } else if (message.data) {
          updateInsight(message.data as AIInsight);
        }
        break;
      default:
        console.log('Unhandled message type:', message.type, message);
    }
  };
  
  // Helper functions to update data
  const updateMetric = (newMetric: MetricData) => {
    setData(prevData => {
      const metrics = [...prevData.metrics];
      const index = metrics.findIndex(m => m.name === newMetric.name);
      
      if (index >= 0) {
        // Update existing metric
        metrics[index] = newMetric;
      } else {
        // Add new metric
        metrics.push(newMetric);
      }
      
      return { ...prevData, metrics };
    });
  };
  
  const updateAlert = (newAlert: AlertData) => {
    setData(prevData => {
      const alerts = [...prevData.alerts];
      const index = alerts.findIndex(a => a.id === newAlert.id);
      
      if (index >= 0) {
        // Update existing alert
        alerts[index] = newAlert;
      } else {
        // Add new alert
        alerts.push(newAlert);
      }
      
      return { ...prevData, alerts };
    });
  };
  
  const updateInsight = (newInsight: AIInsight) => {
    setData(prevData => {
      const insights = [...prevData.insights];
      const index = insights.findIndex(i => i.id === newInsight.id);
      
      if (index >= 0) {
        // Update existing insight
        insights[index] = newInsight;
      } else {
        // Add new insight
        insights.push(newInsight);
      }
      
      return { ...prevData, insights };
    });
  };
  
  // Function to send a message through the WebSocket (only for real WebSocket)
  const sendMessage = (message: any) => {
    if (USE_MOCK_DATA) {
      console.warn('Cannot send message in mock mode');
      return;
    }
    
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket is not connected');
      return;
    }
    
    try {
      wsRef.current.send(JSON.stringify(message));
    } catch (err) {
      console.error('Error sending WebSocket message:', err);
      setError('Failed to send message');
    }
  };
  
  // Expose functions to manually trigger updates (useful for testing)
  const triggerNewAlert = () => {
    if (USE_MOCK_DATA) {
      websocketSimulator.simulateNewAlert();
    } else {
      console.warn('Manual alert triggering is only available in mock mode');
    }
  };
  
  const triggerNewInsight = () => {
    if (USE_MOCK_DATA) {
      websocketSimulator.simulateNewInsight();
    } else {
      console.warn('Manual insight triggering is only available in mock mode');
    }
  };
  
  return {
    data,
    isConnected,
    lastUpdate,
    error,
    sendMessage,
    triggerNewAlert,
    triggerNewInsight
  };
}