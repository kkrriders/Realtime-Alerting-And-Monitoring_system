import axios from 'axios';
import winston from 'winston';
import fs from 'fs/promises';
import path from 'path';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ollama-client' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/ai-integration.log' })
  ]
});

// Default configuration
const DEFAULT_CONFIG = {
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  models: {
    anomalyDetection: 'llama2',
    trendAnalysis: 'llama2',
    recommendationEngine: 'llama2'
  },
  promptTemplates: {
    anomalyDetection: 'As a monitoring system, analyze the following metrics for anomalies:\n{{context}}\n\nIdentify any patterns that indicate potential issues or anomalies.',
    trendAnalysis: 'As a monitoring system, analyze the following historical data:\n{{context}}\n\nIdentify trends, patterns, and forecasted behavior for the next 24 hours.',
    recommendationEngine: 'Based on the following system performance data:\n{{context}}\n\nProvide recommendations for optimizing resource utilization and preventing potential issues.'
  }
};

let configData = { ...DEFAULT_CONFIG };
let anomalyModels = {
  cpu: null,
  memory: null,
  network: null
};

/**
 * Initialize the AI integration with Ollama
 */
export async function initializeAI() {
  logger.info('Initializing AI integration with Ollama...');
  
  try {
    // Load custom configuration if available
    configData = await loadConfiguration();
    
    // Check if Ollama is available
    await checkOllamaAvailability();
    
    // Load specialized models
    await loadAnomalyModels();
    
    logger.info('AI integration initialized successfully');
    
    return {
      // Core functions
      detectAnomalies: detectAnomalies,
      analyzeTrends: analyzeTrends,
      getRecommendations: getRecommendations,
      
      // Direct model access
      generateCompletion: generateCompletion,
      generateEmbeddings: generateEmbeddings,
      
      // Configuration access
      getConfiguration: () => ({ ...configData })
    };
  } catch (error) {
    logger.error('Failed to initialize AI integration', { error: error.message });
    
    // Return limited functionality for graceful degradation
    return {
      detectAnomalies: () => ({ error: 'AI integration unavailable', severity: 'unknown' }),
      analyzeTrends: () => ({ error: 'AI integration unavailable', trends: [] }),
      getRecommendations: () => ({ error: 'AI integration unavailable', recommendations: [] }),
      getConfiguration: () => ({ ...configData })
    };
  }
}

/**
 * Load configuration from file
 */
async function loadConfiguration() {
  try {
    // Try to load from config file
    const configFile = path.join(process.cwd(), 'config', 'ollama', 'config.json');
    const fileData = await fs.readFile(configFile, 'utf-8');
    const fileConfig = JSON.parse(fileData);
    
    logger.info('Loaded AI configuration from file');
    
    // Merge with defaults
    return {
      ...DEFAULT_CONFIG,
      ...fileConfig,
      promptTemplates: {
        ...DEFAULT_CONFIG.promptTemplates,
        ...(fileConfig.promptTemplates || {})
      }
    };
  } catch (error) {
    logger.warn('Failed to load AI configuration, using defaults', { error: error.message });
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Check if Ollama is available
 */
async function checkOllamaAvailability() {
  try {
    const response = await axios.get(`${configData.baseUrl}/api/tags`);
    logger.info('Ollama is available', { models: response.data.models?.length || 0 });
    return true;
  } catch (error) {
    logger.error('Ollama is not available', { error: error.message });
    throw new Error('Ollama service is not available. Please ensure Ollama is running.');
  }
}

/**
 * Load specialized anomaly detection models
 */
async function loadAnomalyModels() {
  // Note: In a real implementation, these would be specialized models
  // For this example, we're using the same base model
  const modelName = configData.models.anomalyDetection;
  
  try {
    // Check if the model exists
    const response = await axios.get(`${configData.baseUrl}/api/tags`);
    const availableModels = response.data.models || [];
    
    if (availableModels.some(model => model.name === modelName)) {
      logger.info(`Model ${modelName} is available for anomaly detection`);
      
      // In a real implementation, we would load different specialized models
      // Here we're just using the same model for different resource types
      anomalyModels.cpu = modelName;
      anomalyModels.memory = modelName;
      anomalyModels.network = modelName;
    } else {
      logger.warn(`Model ${modelName} is not available, attempting to pull it`);
      
      // Try to pull the model
      await axios.post(`${configData.baseUrl}/api/pull`, { name: modelName });
      logger.info(`Model ${modelName} pulled successfully`);
      
      anomalyModels.cpu = modelName;
      anomalyModels.memory = modelName;
      anomalyModels.network = modelName;
    }
  } catch (error) {
    logger.error('Failed to load anomaly models', { error: error.message });
    throw error;
  }
}

/**
 * Detect anomalies in system metrics
 * @param {Object} data - System metrics data
 * @param {string} resourceType - Type of resource (cpu, memory, network, etc.)
 * @returns {Promise<Object>} - Anomaly detection results
 */
async function detectAnomalies(data, resourceType = 'general') {
  logger.debug('Detecting anomalies', { resourceType });
  
  try {
    // Choose appropriate model based on resource type
    const modelName = anomalyModels[resourceType] || configData.models.anomalyDetection;
    
    // Prepare context from data
    const context = JSON.stringify(data, null, 2);
    
    // Prepare prompt using template
    const prompt = configData.promptTemplates.anomalyDetection.replace('{{context}}', context);
    
    // Generate completion
    const response = await generateCompletion(modelName, prompt);
    
    // Process and analyze the response
    const result = analyzeAnomalyResponse(response, data);
    
    logger.info('Anomaly detection completed', { 
      resourceType, 
      anomaliesDetected: result.anomalies.length
    });
    
    return result;
  } catch (error) {
    logger.error('Error detecting anomalies', { error: error.message, resourceType });
    return {
      timestamp: new Date(),
      anomalies: [],
      severity: 'unknown',
      message: 'Failed to detect anomalies'
    };
  }
}

/**
 * Analyze trends in historical data
 * @param {Object} data - Historical metrics data
 * @returns {Promise<Object>} - Trend analysis results
 */
async function analyzeTrends(data) {
  logger.debug('Analyzing trends');
  
  try {
    const modelName = configData.models.trendAnalysis;
    
    // Prepare context from data
    const context = JSON.stringify(data, null, 2);
    
    // Prepare prompt using template
    const prompt = configData.promptTemplates.trendAnalysis.replace('{{context}}', context);
    
    // Generate completion
    const response = await generateCompletion(modelName, prompt);
    
    // Process the response
    const result = parseTrendAnalysisResponse(response);
    
    logger.info('Trend analysis completed', { 
      trendsIdentified: result.trends.length
    });
    
    return result;
  } catch (error) {
    logger.error('Error analyzing trends', { error: error.message });
    return {
      timestamp: new Date(),
      trends: [],
      forecast: {},
      message: 'Failed to analyze trends'
    };
  }
}

/**
 * Get recommendations for optimization
 * @param {Object} data - System performance data
 * @returns {Promise<Object>} - Recommendations
 */
async function getRecommendations(data) {
  logger.debug('Generating recommendations');
  
  try {
    const modelName = configData.models.recommendationEngine;
    
    // Prepare context from data
    const context = JSON.stringify(data, null, 2);
    
    // Prepare prompt using template
    const prompt = configData.promptTemplates.recommendationEngine.replace('{{context}}', context);
    
    // Generate completion
    const response = await generateCompletion(modelName, prompt);
    
    // Process the response
    const recommendations = parseRecommendationsResponse(response);
    
    logger.info('Recommendations generated', { 
      count: recommendations.recommendations.length
    });
    
    return recommendations;
  } catch (error) {
    logger.error('Error generating recommendations', { error: error.message });
    return {
      timestamp: new Date(),
      recommendations: [],
      message: 'Failed to generate recommendations'
    };
  }
}

/**
 * Generate completion from a model
 * @param {string} model - Model name
 * @param {string} prompt - Prompt text
 * @returns {Promise<string>} - Model response
 */
async function generateCompletion(model, prompt) {
  try {
    const response = await axios.post(`${configData.baseUrl}/api/generate`, {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.1, // Low temperature for more deterministic outputs
        num_predict: 1024 // Limit output size
      }
    });
    
    return response.data.response;
  } catch (error) {
    logger.error('Error generating completion', { error: error.message, model });
    throw error;
  }
}

/**
 * Generate embeddings for a text
 * @param {string} model - Model name
 * @param {string} text - Input text
 * @returns {Promise<Array<number>>} - Embedding vector
 */
async function generateEmbeddings(model, text) {
  try {
    const response = await axios.post(`${configData.baseUrl}/api/embeddings`, {
      model,
      prompt: text
    });
    
    return response.data.embedding;
  } catch (error) {
    logger.error('Error generating embeddings', { error: error.message, model });
    throw error;
  }
}

/**
 * Analyze the anomaly detection response
 * @param {string} response - Model response
 * @param {Object} originalData - Original input data
 * @returns {Object} - Structured anomaly results
 */
function analyzeAnomalyResponse(response, originalData) {
  // This is a simplified implementation
  // In a real system, this would use more sophisticated analysis
  
  // Extract potential anomalies (this is very simplified)
  const anomalyPatterns = [
    /anomaly detected.*?([\w\s]+)/gi,
    /unusual pattern.*?([\w\s]+)/gi,
    /suspicious activity.*?([\w\s]+)/gi,
    /abnormal.*?([\w\s]+)/gi,
    /outside normal range.*?([\w\s]+)/gi
  ];
  
  let anomalies = [];
  let highestSeverity = 'info';
  
  // Extract anomalies using patterns
  anomalyPatterns.forEach(pattern => {
    const matches = [...response.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1]) {
        anomalies.push({
          description: match[0],
          resource: match[1].trim(),
          severity: determineSeverity(match[0])
        });
      }
    });
  });
  
  // Remove duplicates and determine highest severity
  anomalies = deduplicateAnomalies(anomalies);
  anomalies.forEach(anomaly => {
    highestSeverity = upgradeSeverity(highestSeverity, anomaly.severity);
  });
  
  return {
    timestamp: new Date(),
    anomalies,
    severity: highestSeverity,
    raw_response: response
  };
}

/**
 * Parse trend analysis response
 * @param {string} response - Model response
 * @returns {Object} - Structured trend analysis
 */
function parseTrendAnalysisResponse(response) {
  // This is a simplified implementation
  // In a real system, this would use more sophisticated parsing
  
  const trends = [];
  const forecastData = {};
  
  // Extract trends (very simplified)
  const trendPatterns = [
    /trend:.*?([\w\s]+)/gi,
    /pattern:.*?([\w\s]+)/gi,
    /forecast:.*?([\w\s]+)/gi
  ];
  
  trendPatterns.forEach(pattern => {
    const matches = [...response.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1]) {
        trends.push({
          description: match[0],
          details: match[1].trim()
        });
      }
    });
  });
  
  // Try to extract forecast data (simplified)
  // In a real system, this would be more structured
  const forecastMatch = response.match(/forecast for next 24 hours:.*?([\s\S]+?)(?:\n\n|\Z)/i);
  if (forecastMatch && forecastMatch[1]) {
    forecastData.description = forecastMatch[1].trim();
  }
  
  return {
    timestamp: new Date(),
    trends,
    forecast: forecastData,
    raw_response: response
  };
}

/**
 * Parse recommendations response
 * @param {string} response - Model response
 * @returns {Object} - Structured recommendations
 */
function parseRecommendationsResponse(response) {
  // This is a simplified implementation
  // In a real system, this would use more sophisticated parsing
  
  const recommendationsList = [];
  
  // Extract numbered recommendations
  const numbered = response.match(/\d+\.\s+.*?(?=\d+\.|$)/gs);
  if (numbered) {
    numbered.forEach(rec => {
      // Try to determine category
      let category = 'general';
      if (rec.toLowerCase().includes('cpu')) category = 'cpu';
      else if (rec.toLowerCase().includes('memory')) category = 'memory';
      else if (rec.toLowerCase().includes('network')) category = 'network';
      else if (rec.toLowerCase().includes('storage')) category = 'storage';
      
      recommendationsList.push({
        description: rec.trim(),
        category: category,
        priority: determinePriority(rec)
      });
    });
  } else {
    // Try to split by line breaks
    const lines = response.split('\n').filter(line => line.trim().length > 0);
    lines.forEach(line => {
      let category = 'general';
      if (line.toLowerCase().includes('cpu')) category = 'cpu';
      else if (line.toLowerCase().includes('memory')) category = 'memory';
      else if (line.toLowerCase().includes('network')) category = 'network';
      else if (line.toLowerCase().includes('storage')) category = 'storage';
      
      recommendationsList.push({
        description: line.trim(),
        category: category,
        priority: determinePriority(line)
      });
    });
  }
  
  return {
    timestamp: new Date(),
    recommendations: recommendationsList,
    raw_response: response
  };
}

/**
 * Determine the severity of an anomaly
 * @param {string} text - Anomaly description
 * @returns {string} - Severity level (info, warning, error, critical)
 */
function determineSeverity(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('critical') || 
      lowerText.includes('severe') || 
      lowerText.includes('failure')) {
    return 'critical';
  } else if (lowerText.includes('error') || 
             lowerText.includes('high') || 
             lowerText.includes('significant')) {
    return 'error';
  } else if (lowerText.includes('warning') || 
             lowerText.includes('unusual') || 
             lowerText.includes('attention')) {
    return 'warning';
  } else {
    return 'info';
  }
}

/**
 * Determine priority of a recommendation
 * @param {string} text - Recommendation text
 * @returns {string} - Priority level (low, medium, high)
 */
function determinePriority(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('critical') || 
      lowerText.includes('urgent') || 
      lowerText.includes('immediately') ||
      lowerText.includes('high priority')) {
    return 'high';
  } else if (lowerText.includes('recommend') || 
             lowerText.includes('should') || 
             lowerText.includes('important')) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Upgrade severity if new severity is higher
 * @param {string} currentSeverity - Current severity
 * @param {string} newSeverity - New severity
 * @returns {string} - Highest severity
 */
function upgradeSeverity(currentSeverity, newSeverity) {
  const severityLevels = {
    'info': 0,
    'warning': 1,
    'error': 2,
    'critical': 3
  };
  
  if (severityLevels[newSeverity] > severityLevels[currentSeverity]) {
    return newSeverity;
  }
  
  return currentSeverity;
}

/**
 * Remove duplicate anomalies
 * @param {Array} anomalies - List of anomalies
 * @returns {Array} - Deduplicated list
 */
function deduplicateAnomalies(anomalies) {
  const seen = new Set();
  return anomalies.filter(anomaly => {
    const key = `${anomaly.resource}-${anomaly.description.substring(0, 20)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
} 