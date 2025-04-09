import { MetricData, AlertData, AIInsight, WSMessage, WSMessageType } from '@/types/metrics';
import { mockCurrentMetrics, mockAlerts, mockInsights, simulateWSMessage } from './mock-data';

type WSCallback = (message: WSMessage) => void;

class WebSocketSimulator {
  private static instance: WebSocketSimulator;
  private intervalId: NodeJS.Timeout | null = null;
  private callbacks: WSCallback[] = [];
  private connected: boolean = false;
  
  private constructor() {}
  
  public static getInstance(): WebSocketSimulator {
    if (!WebSocketSimulator.instance) {
      WebSocketSimulator.instance = new WebSocketSimulator();
    }
    return WebSocketSimulator.instance;
  }
  
  public connect(): void {
    if (this.connected) return;
    
    this.connected = true;
    console.log('WebSocket simulator connected');
    
    // Simulate initial connection success
    setTimeout(() => {
      this.broadcastMessage({
        type: 'metric-update',
        data: mockCurrentMetrics[0],
        timestamp: Date.now()
      });
    }, 500);
    
    // Start simulating regular updates
    this.intervalId = setInterval(() => {
      const message = simulateWSMessage();
      this.broadcastMessage(message);
    }, 5000); // Send a new update every 5 seconds
  }
  
  public disconnect(): void {
    if (!this.connected) return;
    
    this.connected = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('WebSocket simulator disconnected');
  }
  
  public subscribe(callback: WSCallback): () => void {
    this.callbacks.push(callback);
    
    // Return an unsubscribe function
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }
  
  private broadcastMessage(message: WSMessage): void {
    this.callbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in WebSocket callback:', error);
      }
    });
  }
  
  // Helper method to manually trigger specific updates (useful for testing)
  public triggerUpdate(type: WSMessageType, data: MetricData | AlertData | AIInsight): void {
    this.broadcastMessage({
      type,
      data,
      timestamp: Date.now()
    });
  }
  
  // Helper to simulate new alert
  public simulateNewAlert(): void {
    const randomAlert = { ...mockAlerts[Math.floor(Math.random() * mockAlerts.length)] };
    randomAlert.id = `alert-${Date.now()}`;
    randomAlert.createdAt = Date.now();
    
    this.triggerUpdate('alert-update', randomAlert);
  }
  
  // Helper to simulate new insight
  public simulateNewInsight(): void {
    const randomInsight = { ...mockInsights[Math.floor(Math.random() * mockInsights.length)] };
    randomInsight.id = `insight-${Date.now()}`;
    randomInsight.timestamp = Date.now();
    
    this.triggerUpdate('insight-update', randomInsight);
  }
}

export default WebSocketSimulator.getInstance(); 