import winston from 'winston';
import { initializeAI } from './ollama-client.js';
import fs from 'fs/promises';
import path from 'path';

// Ensure logs directory exists
async function ensureLogDirectory() {
  const logDir = path.join(process.cwd(), 'logs');
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (error) {
    // Ignore errors if directory already exists
    if (error.code !== 'EEXIST') {
      console.error('Error creating logs directory:', error.message);
    }
  }
}

// Configure logger with default configuration first
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'alert-analyzer' },
  transports: [
    new winston.transports.Console()
  ]
});

// Ensure logs directory exists and update logger
(async () => {
  try {
    await ensureLogDirectory();
    // Add file transport after ensuring directory exists
    logger.add(new winston.transports.File({ filename: 'logs/ai-alerts.log' }));
  } catch (error) {
    console.error('Error initializing logger:', error);
  }
})();

// Default configuration
const DEFAULT_CONFIG = {
  analysis: {
    patternAnalysis: {
      enabled: true,
      interval: 3600000,
      maxHistorySize: 1000,
      minAlertsForAnalysis: 10
    },
    anomalyDetection: {
      enabled: true,
      resourceTypes: ["cpu", "memory", "network"],
      minConfidence: 0.7,
      maxAnomaliesPerResource: 5
    },
    recommendations: {
      enabled: true,
      maxRecommendations: 5,
      minSeverity: "warning",
      includeHistoricalContext: true
    },
    correlations: {
      enabled: true,
      maxCorrelations: 3,
      minSignificance: "medium",
      lookbackPeriod: 3600000
    },
    predictions: {
      enabled: true,
      forecastHours: 24,
      intervalHours: 4,
      minConfidence: 0.8
    }
  },
  notifications: {
    aiInsights: {
      enabled: true,
      channels: ["websocket", "console"],
      minSeverity: "warning",
      includeRecommendations: true,
      includeCorrelations: true
    },
    predictions: {
      enabled: true,
      channels: ["websocket"],
      threshold: 0.9,
      includeTrends: true
    }
  },
  models: {
    anomalyDetection: {
      model: "llama2",
      temperature: 0.1,
      maxTokens: 1024
    },
    patternAnalysis: {
      model: "llama2",
      temperature: 0.2,
      maxTokens: 2048
    },
    recommendations: {
      model: "llama2",
      temperature: 0.3,
      maxTokens: 1024
    }
  },
  logging: {
    level: "info",
    file: "logs/ai-alerts.log",
    maxSize: "10m",
    maxFiles: 5
  }
};

class AlertAnalyzer {
  constructor() {
    this.aiClient = null;
    this.config = { ...DEFAULT_CONFIG };
    this.initialized = false;
  }

  /**
   * Initialize the Alert Analyzer
   */
  async initialize() {
    try {
      logger.info('Initializing Alert Analyzer...');
      
      // Ensure config directories exist
      await this.ensureConfigDirectories();
      
      // Load configuration
      await this.loadConfiguration();
      
      // Initialize AI client
      this.aiClient = await initializeAI();
      
      // Verify required methods
      if (this.aiClient) {
        this.verifyAiClientMethods();
      } else {
        logger.warn('AI client initialization failed or returned null');
      }
      
      this.initialized = true;
      logger.info('Alert Analyzer initialized successfully');
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize Alert Analyzer', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify that all required methods are available in the AI client
   */
  verifyAiClientMethods() {
    // List of required methods
    const requiredMethods = [
      'analyzeAlertPattern',
      'getRecommendations',
      'correlateMetrics',
      'explainAnomaly',
      'predictResourceUsage'
    ];
    
    // Check each method
    const missingMethods = requiredMethods.filter(
      method => typeof this.aiClient[method] !== 'function'
    );
    
    if (missingMethods.length > 0) {
      const warning = `AI client is missing required methods: ${missingMethods.join(', ')}`;
      logger.warn(warning);
      
      // Create stub methods for missing functions to prevent runtime errors
      for (const method of missingMethods) {
        this.aiClient[method] = async (...args) => {
          logger.warn(`Called missing AI method: ${method}`, { arguments: args });
          return { error: `Method ${method} is not implemented` };
        };
      }
    }
  }

  /**
   * Ensure config directories exist
   */
  async ensureConfigDirectories() {
    try {
      const configDirs = [
        path.join(process.cwd(), 'config'),
        path.join(process.cwd(), 'config', 'ai-alerts')
      ];
      
      for (const dir of configDirs) {
        await fs.mkdir(dir, { recursive: true });
      }
      
      logger.debug('Config directories ensured');
    } catch (error) {
      logger.warn('Error ensuring config directories', { error: error.message });
      // Continue execution even if directories can't be created
    }
  }

  /**
   * Load configuration from file
   */
  async loadConfiguration() {
    try {
      const configPath = path.join(process.cwd(), 'config', 'ai-alerts', 'config.json');
      
      // Check if file exists, create default if not
      try {
        await fs.access(configPath);
      } catch (error) {
        // File doesn't exist, create default
        await this.createDefaultConfig(configPath);
      }
      
      const configData = await fs.readFile(configPath, 'utf-8');
      const fileConfig = JSON.parse(configData);
      
      // Merge with defaults
      this.config = {
        ...DEFAULT_CONFIG,
        ...fileConfig,
        analysis: {
          ...DEFAULT_CONFIG.analysis,
          ...(fileConfig.analysis || {})
        },
        notifications: {
          ...DEFAULT_CONFIG.notifications,
          ...(fileConfig.notifications || {})
        },
        models: {
          ...DEFAULT_CONFIG.models,
          ...(fileConfig.models || {})
        }
      };
      
      logger.info('Loaded AI alerts configuration');
    } catch (error) {
      logger.warn('Failed to load AI alerts configuration, using defaults', { error: error.message });
    }
  }

  /**
   * Create default AI alerts configuration
   * @param {string} filePath - Path to write the config file
   */
  async createDefaultConfig(filePath) {
    try {
      await fs.writeFile(filePath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
      logger.info('Created default AI alerts configuration');
    } catch (error) {
      logger.error('Failed to create default AI alerts configuration', { error: error.message });
      // Continue execution even if file can't be created
    }
  }

  /**
   * Analyze alert patterns and generate insights
   * @param {Array} alertHistory - Historical alert data
   * @returns {Promise<Object>} - Analysis results
   */
  async analyzeAlertPatterns(alertHistory) {
    if (!this.initialized || !this.aiClient) {
      logger.warn('Alert Analyzer not initialized');
      return { patterns: [], insights: [] };
    }

    if (!this.config.analysis.patternAnalysis.enabled) {
      logger.debug('Pattern analysis is disabled');
      return { patterns: [], insights: [] };
    }

    if (alertHistory.length < this.config.analysis.patternAnalysis.minAlertsForAnalysis) {
      logger.debug('Not enough alerts for pattern analysis', {
        current: alertHistory.length,
        required: this.config.analysis.patternAnalysis.minAlertsForAnalysis
      });
      return { patterns: [], insights: [] };
    }

    try {
      logger.info('Analyzing alert patterns', { 
        alertCount: alertHistory.length 
      });

      const result = await this.aiClient.analyzeAlertPattern(alertHistory);
      
      // Handle null or undefined result
      if (!result) {
        logger.warn('No result returned from AI client for pattern analysis');
        return { patterns: [], insights: [] };
      }
      
      // Ensure patterns and insights exist
      if (!result.patterns) result.patterns = [];
      if (!result.insights) result.insights = [];
      
      logger.info('Alert pattern analysis completed', {
        patternCount: result.patterns.length,
        insightCount: result.insights.length
      });

      return result;
    } catch (error) {
      logger.error('Error analyzing alert patterns', { error: error.message });
      return { 
        patterns: [], 
        insights: [], 
        error: error.message 
      };
    }
  }

  /**
   * Generate recommendations for an alert
   * @param {Object} alert - Alert data
   * @param {Array} recentAlerts - Recent alert history
   * @param {Object} metrics - Current metrics
   * @returns {Promise<Object>} - Recommendations
   */
  async generateRecommendations(alert, recentAlerts, metrics) {
    if (!this.initialized || !this.aiClient) {
      logger.warn('Alert Analyzer not initialized');
      return { recommendations: [] };
    }

    if (!this.config.analysis.recommendations.enabled) {
      logger.debug('Recommendations are disabled');
      return { recommendations: [] };
    }

    // Check severity threshold
    const severityLevels = { info: 0, warning: 1, error: 2, critical: 3 };
    const alertSeverity = severityLevels[alert.severity] || 0;
    const minSeverity = severityLevels[this.config.analysis.recommendations.minSeverity] || 0;

    if (alertSeverity < minSeverity) {
      logger.debug('Alert severity below minimum threshold', {
        alertSeverity: alert.severity,
        minSeverity: this.config.analysis.recommendations.minSeverity
      });
      return { 
        recommendations: [],
        message: `Alert severity ${alert.severity} below minimum threshold ${this.config.analysis.recommendations.minSeverity}`
      };
    }

    try {
      logger.info('Generating recommendations for alert', { 
        alertId: alert.id 
      });

      const result = await this.aiClient.getRecommendations({
        alert,
        recentAlerts: this.config.analysis.recommendations.includeHistoricalContext ? recentAlerts : [],
        metrics
      });

      // Handle null or undefined result
      if (!result) {
        logger.warn('No result returned from AI client for recommendations', { alertId: alert.id });
        return { recommendations: [] };
      }
      
      // Ensure recommendations exist
      if (!result.recommendations) {
        result.recommendations = [];
      } else {
        // Limit number of recommendations
        result.recommendations = result.recommendations
          .slice(0, this.config.analysis.recommendations.maxRecommendations);

        logger.info('Recommendations generated', {
          recommendationCount: result.recommendations.length
        });
      }

      return result;
    } catch (error) {
      logger.error('Error generating recommendations', { error: error.message });
      return { 
        recommendations: [], 
        error: error.message 
      };
    }
  }

  /**
   * Analyze metric correlations for an alert
   * @param {Object} alert - Alert data
   * @param {Object} metrics - Current metrics
   * @param {Array} recentAlerts - Recent alert history
   * @returns {Promise<Object>} - Correlation analysis
   */
  async analyzeCorrelations(alert, metrics, recentAlerts) {
    if (!this.initialized || !this.aiClient) {
      logger.warn('Alert Analyzer not initialized');
      return { correlations: [] };
    }

    if (!this.config.analysis.correlations.enabled) {
      logger.debug('Correlation analysis is disabled');
      return { correlations: [] };
    }

    try {
      logger.info('Analyzing metric correlations for alert', { 
        alertId: alert.id 
      });

      const result = await this.aiClient.correlateMetrics({
        alert,
        metrics,
        recentAlerts: recentAlerts.slice(-Math.floor(this.config.analysis.correlations.lookbackPeriod / 3600000))
      });

      // Handle null or undefined result
      if (!result) {
        logger.warn('No result returned from AI client for correlations', { alertId: alert.id });
        return { correlations: [] };
      }
      
      // Ensure correlations exist
      if (!result.correlations) {
        result.correlations = [];
      } else {
        // Filter by significance and limit number
        result.correlations = result.correlations
          .filter(c => {
            const significanceLevels = { low: 0, medium: 1, high: 2 };
            const correlationSignificance = significanceLevels[c.significance] || 0;
            const minSignificance = significanceLevels[this.config.analysis.correlations.minSignificance] || 0;
            return correlationSignificance >= minSignificance;
          })
          .slice(0, this.config.analysis.correlations.maxCorrelations);

        logger.info('Correlation analysis completed', {
          correlationCount: result.correlations.length
        });
      }

      return result;
    } catch (error) {
      logger.error('Error analyzing correlations', { error: error.message });
      return { 
        correlations: [], 
        error: error.message 
      };
    }
  }

  /**
   * Get detailed explanation for an anomaly
   * @param {Object} anomaly - Anomaly data or metrics
   * @param {Object} contextData - Additional context data
   * @returns {Promise<Object>} - Detailed explanation
   */
  async explainAnomaly(anomaly, contextData = {}) {
    if (!this.initialized || !this.aiClient) {
      logger.warn('Alert Analyzer not initialized');
      return { anomalies: [], explanation: "Alert analyzer not initialized" };
    }

    if (!this.config.analysis.anomalyDetection.enabled) {
      logger.debug('Anomaly detection is disabled');
      return { anomalies: [], explanation: "Anomaly detection is disabled" };
    }

    // Check if resource type is enabled
    const resourceType = contextData.resourceType || 'general';
    if (!this.config.analysis.anomalyDetection.resourceTypes.includes(resourceType)) {
      logger.debug('Resource type not enabled for anomaly detection', { resourceType });
      return { anomalies: [], explanation: `Resource type ${resourceType} not enabled for anomaly detection` };
    }

    try {
      // Log with anomaly ID if available, otherwise log resource type
      const anomalyId = anomaly.id || contextData.alertId || 'unknown';
      logger.info('Getting explanation for anomaly', { 
        anomalyId,
        resourceType
      });

      const result = await this.aiClient.explainAnomaly(anomaly, contextData);

      // If result is null or undefined, return empty arrays
      if (!result) {
        logger.warn('No result returned from AI client for anomaly', { resourceType });
        return { anomalies: [], explanation: "No anomalies detected" };
      }

      // Handle case where anomalies might not be present
      if (result.anomalies) {
        // Filter by confidence and limit number
        result.anomalies = result.anomalies
          .filter(a => (a.confidence || 0) >= this.config.analysis.anomalyDetection.minConfidence)
          .slice(0, this.config.analysis.anomalyDetection.maxAnomaliesPerResource);

        logger.info('Anomaly explanation generated', {
          anomalyCount: result.anomalies.length
        });
      } else {
        result.anomalies = [];
      }

      // Ensure explanation property exists
      if (!result.explanation) {
        result.explanation = result.description || "No detailed explanation available";
      }

      return result;
    } catch (error) {
      logger.error('Error explaining anomaly', { error: error.message });
      return { 
        anomalies: [], 
        explanation: `Error in anomaly detection: ${error.message}`, 
        error: error.message 
      };
    }
  }

  /**
   * Predict future resource usage based on historical data
   * @param {Object} historicalData - Historical metrics data
   * @param {number} hours - Hours to forecast
   * @returns {Promise<Object>} - Resource usage predictions
   */
  async predictResourceUsage(historicalData, hours = 24) {
    if (!this.initialized || !this.aiClient) {
      logger.warn('Alert Analyzer not initialized');
      return { predictions: [] };
    }

    if (!this.config.analysis.predictions.enabled) {
      logger.debug('Resource usage predictions are disabled');
      return { predictions: [] };
    }

    try {
      logger.info('Predicting resource usage', { 
        forecastHours: hours 
      });

      const result = await this.aiClient.predictResourceUsage(
        historicalData,
        hours || this.config.analysis.predictions.forecastHours
      );

      // Handle null or undefined result
      if (!result) {
        logger.warn('No result returned from AI client for resource usage prediction');
        return { predictions: [] };
      }
      
      // Ensure predictions exist
      if (!result.predictions) {
        result.predictions = [];
      } else {
        // Filter by confidence
        result.predictions = result.predictions.filter(p => 
          (p.confidence || 0) >= this.config.analysis.predictions.minConfidence
        );

        logger.info('Resource usage prediction completed', {
          predictionCount: result.predictions.length
        });
      }

      return result;
    } catch (error) {
      logger.error('Error predicting resource usage', { error: error.message });
      return { 
        predictions: [], 
        error: error.message 
      };
    }
  }
}

export default new AlertAnalyzer(); 