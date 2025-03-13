import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../data-collectors/prometheus-collector.js', () => ({
  setupPrometheus: jest.fn().mockResolvedValue({
    queryPrometheus: jest.fn().mockResolvedValue({ data: { result: [] } }),
    incrementAlert: jest.fn()
  })
}));

jest.mock('../../data-collectors/azure-monitor.js', () => ({
  setupAzureMonitor: jest.fn().mockResolvedValue({
    queryMetrics: jest.fn().mockResolvedValue({ metrics: [] }),
    queryLogs: jest.fn().mockResolvedValue({ rows: [] })
  })
}));

jest.mock('../../ai-integration/ollama-client.js', () => ({
  initializeAI: jest.fn().mockResolvedValue({
    detectAnomalies: jest.fn().mockResolvedValue({ anomalies: [] }),
    analyzeTrends: jest.fn().mockResolvedValue({ trends: [] }),
    getRecommendations: jest.fn().mockResolvedValue({ recommendations: [] })
  })
}));

// Mock fs for reading alert rules
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(JSON.stringify({
    rules: [
      {
        id: 'test-rule',
        name: 'Test Rule',
        type: 'prometheus',
        query: 'up',
        severity: 'warning'
      }
    ]
  }))
}));

// Mock winston
jest.mock('winston', () => ({
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
}));

// Import after mocks are set up
import { setupAlertSystem } from '../../alerting/alert-manager.js';

describe('Alert Manager', () => {
  let mockIO;
  
  beforeEach(() => {
    // Mock Socket.IO
    mockIO = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      on: jest.fn()
    };
    
    // Reset mocks between tests
    jest.clearAllMocks();
  });

  it('should set up the alert system correctly', async () => {
    const options = {
      prometheusClient: { incrementAlert: jest.fn() },
      azureMonitorClient: {},
      aiClient: {},
      io: mockIO
    };
    
    const alertManager = await setupAlertSystem(options);
    
    expect(alertManager).toBeDefined();
    // Add more assertions for specific alertManager properties and methods
  });
  
  // Add more tests for other alert manager functions
}); 