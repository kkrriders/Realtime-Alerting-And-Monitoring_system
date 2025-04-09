import { useEffect, useState } from 'react';
import { MetricData, AlertData, AIInsight } from '@/types/metrics';

type WebSocketMessage = {
  type: 'metric' | 'alert' | 'insight';
  data: MetricData | AlertData | AIInsight;
};

type WebSocketCallbacks = {
  onMetric?: (metric: MetricData) => void;
  onAlert?: (alert: AlertData) => void;
  onInsight?: (insight: AIInsight) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
};

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3050';

/**
 * Creates and manages a WebSocket connection to the monitoring server
 */
export function useMonitoringSocket(callbacks: WebSocketCallbacks = {}) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect to WebSocket
  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/metrics`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
      if (callbacks.onConnect) callbacks.onConnect();
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      if (callbacks.onDisconnect) callbacks.onDisconnect();
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('Connection error');
      if (callbacks.onError) callbacks.onError(event);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        
        switch (message.type) {
          case 'metric':
            if (callbacks.onMetric) {
              callbacks.onMetric(message.data as MetricData);
            }
            break;
          case 'alert':
            if (callbacks.onAlert) {
              callbacks.onAlert(message.data as AlertData);
            }
            break;
          case 'insight':
            if (callbacks.onInsight) {
              callbacks.onInsight(message.data as AIInsight);
            }
            break;
          default:
            console.warn('Unknown message type:', message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    setSocket(ws);

    // Cleanup function to close the WebSocket connection when the component unmounts
    return () => {
      ws.close();
    };
  }, []); // Empty dependency array ensures this runs only once

  // Reconnect function
  const reconnect = () => {
    if (socket) {
      socket.close();
    }
    const ws = new WebSocket(`${WS_BASE_URL}/ws/metrics`);
    setSocket(ws);
  };

  // Send a message to the server
  const sendMessage = (message: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message: WebSocket is not connected');
    }
  };

  return {
    socket,
    isConnected,
    error,
    reconnect,
    sendMessage
  };
}

/**
 * Simplified WebSocket client for server-side or one-off connections
 */
export class MetricsWebSocketClient {
  private socket: WebSocket | null = null;
  private callbacks: WebSocketCallbacks;
  private reconnectAttempts = 0;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private maxReconnectAttempts = 5;

  constructor(callbacks: WebSocketCallbacks = {}) {
    this.callbacks = callbacks;
  }

  connect() {
    if (this.socket) {
      this.disconnect();
    }

    try {
      this.socket = new WebSocket(`${WS_BASE_URL}/ws/metrics`);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        if (this.callbacks.onConnect) this.callbacks.onConnect();
      };

      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
        this.tryReconnect();
      };

      this.socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        if (this.callbacks.onError) this.callbacks.onError(event);
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
          switch (message.type) {
            case 'metric':
              if (this.callbacks.onMetric) {
                this.callbacks.onMetric(message.data as MetricData);
              }
              break;
            case 'alert':
              if (this.callbacks.onAlert) {
                this.callbacks.onAlert(message.data as AlertData);
              }
              break;
            case 'insight':
              if (this.callbacks.onInsight) {
                this.callbacks.onInsight(message.data as AIInsight);
              }
              break;
            default:
              console.warn('Unknown message type:', message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.tryReconnect();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  sendMessage(message: any) {
    if (this.isConnected()) {
      this.socket!.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message: WebSocket is not connected');
    }
  }

  private tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    if (!this.reconnectInterval) {
      this.reconnectInterval = setInterval(() => {
        if (this.isConnected()) {
          if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
          }
          return;
        }

        this.connect();
      }, 5000); // Try to reconnect every 5 seconds
    }
  }
} 