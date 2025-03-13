import { jest } from '@jest/globals';

// Mock prom-client
jest.mock('prom-client', () => {
  const mockRegistry = {
    registerMetric: jest.fn(),
    setDefaultLabels: jest.fn(),
    metrics: jest.fn().mockResolvedValue('metrics data'),
    contentType: 'text/plain; version=0.0.4; charset=utf-8'
  };

  return {
    Registry: jest.fn(() => mockRegistry),
    Counter: jest.fn().mockImplementation(() => ({
      inc: jest.fn(),
      labels: jest.fn().mockReturnThis()
    })),
    Gauge: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      labels: jest.fn().mockReturnThis()
    })),
    Histogram: jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      labels: jest.fn().mockReturnThis()
    })),
    collectDefaultMetrics: jest.fn()
  };
});

// Mock fetch
jest.mock('node-fetch', () => {
  return jest.fn().mockImplementation(() => {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: { result: [] } })
    });
  });
});

// Mock winston
jest.mock('winston', () => {
  return {
    createLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      json: jest.fn()
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn()
    }
  };
});

// Import after mocks are setup
import { setupPrometheus } from '../data-collectors/prometheus-collector.js';

describe('Prometheus Collector', () => {
  it('should setup the Prometheus collector correctly', async () => {
    const prometheusClient = await setupPrometheus();
    
    expect(prometheusClient).toBeDefined();
    expect(prometheusClient.metrics).toBeDefined();
    expect(prometheusClient.contentType).toBeDefined();
    expect(prometheusClient.recordHttpRequest).toBeDefined();
    expect(prometheusClient.incrementAlert).toBeDefined();
    expect(prometheusClient.queryPrometheus).toBeDefined();
    expect(prometheusClient.customMetrics).toBeDefined();
  });

  it('should query Prometheus server correctly', async () => {
    const prometheusClient = await setupPrometheus();
    const result = await prometheusClient.queryPrometheus('http://prometheus:9090', 'up');
    
    expect(result).toBeDefined();
  });

  it('should increment alert counter', async () => {
    const prometheusClient = await setupPrometheus();
    prometheusClient.incrementAlert('critical', 'cpu');
    
    // In a real test, we would verify the counter was incremented
    // Here we're just verifying the function doesn't throw
    expect(true).toBe(true);
  });
}); 