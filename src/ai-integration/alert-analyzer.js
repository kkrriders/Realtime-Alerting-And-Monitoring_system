// import ollamaClient from './ollama-client.js';
import winston from 'winston';
import path from 'path';
import { initializeAI } from './ollama-client.js';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.join('logs', 'ai-analyzer.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

class AlertAnalyzer {
  constructor() {
    this.aiClient = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      logger.info('Initializing AI Alert Analyzer...');
      this.aiClient = await initializeAI();
      this.initialized = true;
      logger.info('AI Alert Analyzer initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Failed to initialize AI Alert Analyzer: ${error.message}`);
      return false;
    }
  }

  async analyzeAlertPatterns(alerts, timespan = '24h') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const recentAlerts = alerts.filter(a => 
        new Date(a.timestamp) > new Date(Date.now() - this._parseTimespan(timespan))
      );

      if (recentAlerts.length === 0) {
        return { patterns: [] };
      }

      const alertData = recentAlerts.map(a => ({
        ruleName: a.ruleName,
        severity: a.severity,
        timestamp: a.timestamp,
        source: a.source || 'system'
      }));

      logger.info(`Analyzing ${alertData.length} alerts for patterns`);
      const result = await this.aiClient.analyzeAlertPattern(alertData);
      
      return {
        patterns: result.patterns || [],
        insights: result.insights || [],
        recommendation: result.recommendation
      };
    } catch (error) {
      logger.error(`Error in analyzeAlertPatterns: ${error.message}`);
      return { patterns: [], error: error.message };
    }
  }

  async explainAnomaly(metrics, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const resourceType = options.resourceType || 'general';
      const metricData = this._prepareMetricsForAI(metrics, resourceType);
      
      logger.info(`Getting explanation for anomaly in ${resourceType} metrics`);
      const result = await this.aiClient.explainAnomaly(metricData, resourceType);
      
      return {
        explanation: result.explanation,
        severity: result.severity || 'warning',
        confidence: result.confidence || 0.7,
        suggestedActions: result.suggestedActions || []
      };
    } catch (error) {
      logger.error(`Error in explainAnomaly: ${error.message}`);
      return { explanation: 'Failed to analyze anomaly', error: error.message };
    }
  }

  async analyzeTrends(metrics, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const timeframe = options.timeframe || '6h';
      const metricData = this._prepareMetricsForAI(metrics);
      
      logger.info(`Analyzing trends for the past ${timeframe}`);
      const result = await this.aiClient.analyzeTrends(metricData, { timeframe });
      
      return {
        trends: result.trends || [],
        explanation: result.explanation,
        prediction: result.prediction
      };
    } catch (error) {
      logger.error(`Error in analyzeTrends: ${error.message}`);
      return { trends: [], error: error.message };
    }
  }

  async generateRecommendations(alerts, history, currentMetrics) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const context = {
        alerts: alerts.slice(0, 10),  // Only include up to 10 recent alerts
        metrics: this._prepareMetricsForAI(currentMetrics)
      };
      
      logger.info('Generating system recommendations based on current state');
      const result = await this.aiClient.getRecommendations(context);
      
      return {
        recommendations: result.recommendations || [],
        priority: result.priority || 'medium'
      };
    } catch (error) {
      logger.error(`Error in generateRecommendations: ${error.message}`);
      return { recommendations: [], error: error.message };
    }
  }

  async correlateMetrics(metrics, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const metricNames = options.metrics || Object.keys(metrics).slice(0, 5);
      const metricData = this._prepareMetricsForAI(metrics, null, metricNames);
      
      logger.info(`Correlating ${metricNames.length} metrics`);
      const result = await this.aiClient.correlateMetrics(metricData);
      
      return {
        correlations: result.correlations || [],
        explanation: result.explanation
      };
    } catch (error) {
      logger.error(`Error in correlateMetrics: ${error.message}`);
      return { correlations: [], error: error.message };
    }
  }

  async predictResourceUsage(metrics, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const resource = options.resource || 'cpu';
      const timeframe = options.timeframe || '1h';
      const metricData = this._prepareMetricsForAI(metrics);
      
      logger.info(`Predicting ${resource} usage for the next ${timeframe}`);
      const result = await this.aiClient.predictResourceUsage(metricData, resource, timeframe);
      
      return {
        prediction: result.prediction,
        confidence: result.confidence || 0.6,
        explanation: result.explanation
      };
    } catch (error) {
      logger.error(`Error in predictResourceUsage: ${error.message}`);
      return { prediction: null, error: error.message };
    }
  }

  _prepareMetricsForAI(metrics, resourceType = null, specificMetrics = null) {
    // Filter metrics based on resource type or specific metrics if provided
    let filteredMetrics = { ...metrics };
    
    if (resourceType) {
      // Filter metrics related to the resource type
      filteredMetrics = Object.keys(metrics)
        .filter(key => key.toLowerCase().includes(resourceType.toLowerCase()))
        .reduce((obj, key) => {
          obj[key] = metrics[key];
          return obj;
        }, {});
    }
    
    if (specificMetrics && Array.isArray(specificMetrics)) {
      // Keep only the specified metrics
      filteredMetrics = specificMetrics.reduce((obj, key) => {
        if (metrics[key] !== undefined) {
          obj[key] = metrics[key];
        }
        return obj;
      }, {});
    }
    
    return filteredMetrics;
  }

  _parseTimespan(timespan) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };
    
    const match = timespan.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 24 * 60 * 60 * 1000; // Default to 24 hours
    }
    
    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }
}

// Create a singleton instance
const alertAnalyzer = new AlertAnalyzer();
export default alertAnalyzer; 