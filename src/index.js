import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { setupPrometheus } from './data-collectors/prometheus-collector.js';
import { setupAzureMonitor } from './data-collectors/azure-monitor.js';
import { setupAlertSystem } from './alerting/alert-manager.js';
import { initializeAI } from './ai-integration/ollama-client.js';
import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'monitoring-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize components
let prometheusClient;
let azureMonitorClient;
let aiClient;

async function initializeSystem() {
  try {
    logger.info('Initializing monitoring system components...');
    
    // Initialize Prometheus
    prometheusClient = await setupPrometheus();
    logger.info('Prometheus collector initialized');
    
    // Initialize Azure Monitor
    azureMonitorClient = await setupAzureMonitor();
    logger.info('Azure Monitor initialized');
    
    // Initialize AI/ML integration
    aiClient = await initializeAI();
    logger.info('AI integration initialized');
    
    // Setup alert system with all data sources
    await setupAlertSystem({
      prometheusClient,
      azureMonitorClient,
      aiClient,
      io
    });
    logger.info('Alert system initialized');
    
    logger.info('All system components initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize system components', { error: error.message });
    process.exit(1);
  }
}

// API Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', prometheusClient.contentType);
    res.end(await prometheusClient.metrics());
  } catch (error) {
    logger.error('Error fetching metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// WebSocket connection for real-time updates
io.on('connection', (socket) => {
  logger.info('Client connected to real-time updates');
  
  socket.on('subscribe', (channel) => {
    logger.info(`Client subscribed to ${channel}`);
    socket.join(channel);
  });
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected from real-time updates');
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  logger.info(`Server started on port ${PORT}`);
  await initializeSystem();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Shutting down gracefully...');
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
}); 