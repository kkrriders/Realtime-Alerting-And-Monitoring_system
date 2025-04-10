/**
 * Configuration file for API endpoints and other settings
 * This allows easy switching between mock and real APIs
 */

// Set this to true to use mock data, false to use real API endpoints
export const USE_MOCK_DATA = true;

// Base URL for API endpoints - replace with your actual backend URL when connecting to real API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// API endpoints
export const API_ENDPOINTS = {
  // Mock endpoints (served by Next.js API routes)
  MOCK: {
    DASHBOARD_DATA: '/api/dashboard-data',
    METRICS: '/api/dashboard-data?dataType=metrics',
    METRIC_HISTORY: '/api/dashboard-data?dataType=metric-history',
    ALERTS: '/api/dashboard-data?dataType=alerts',
    INSIGHTS: '/api/dashboard-data?dataType=insights',
    DASHBOARD_STATS: '/api/dashboard-data?dataType=dashboard-stats',
    ALL: '/api/dashboard/all',
  },
  
  // Real API endpoints (connect to your backend)
  REAL: {
    DASHBOARD_DATA: `${API_BASE_URL}/api/dashboard/all`,
    METRICS: `${API_BASE_URL}/api/metrics`,
    METRIC_HISTORY: `${API_BASE_URL}/api/metrics/history`,
    ALERTS: `${API_BASE_URL}/api/alerts`,
    INSIGHTS: `${API_BASE_URL}/api/insights`,
    DASHBOARD_STATS: `${API_BASE_URL}/api/stats`,
    ALL: `${API_BASE_URL}/api/dashboard/all`,
  }
};

// WebSocket configuration
export const WEBSOCKET_CONFIG = {
  MOCK: {
    ENABLED: true,
    UPDATE_INTERVAL: 5000, // ms
  },
  REAL: {
    ENABLED: !USE_MOCK_DATA,
    URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002',
  }
};

// Helper function to get the appropriate endpoint
export const getEndpoint = (key: keyof typeof API_ENDPOINTS.MOCK): string => {
  return USE_MOCK_DATA 
    ? API_ENDPOINTS.MOCK[key] 
    : API_ENDPOINTS.REAL[key];
};

// Helper to get WebSocket config
export const getWebSocketConfig = () => {
  return USE_MOCK_DATA 
    ? WEBSOCKET_CONFIG.MOCK 
    : WEBSOCKET_CONFIG.REAL;
}; 