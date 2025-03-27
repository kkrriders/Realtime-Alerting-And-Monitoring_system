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
    anomalyDetection: 'As a monitoring system, analyze the following metrics for anomalies:\n{{context}}\n\nIdentify any patterns that indicate potential issues or anomalies. For each anomaly, specify its severity (info, warning, error, critical) and explain why it's concerning.',
    trendAnalysis: 'As a monitoring system, analyze the following historical data:\n{{context}}\n\nIdentify trends, patterns, and forecasted behavior for the next 24 hours. Include specific metrics that show notable trends and provide quantifiable predictions where possible.',
    recommendationEngine: 'Based on the following system performance data:\n{{context}}\n\nProvide specific recommendations for optimizing resource utilization and preventing potential issues. Number each recommendation and include its priority (low, medium, high) and the specific resource it targets (CPU, memory, network, etc.).'
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
      getConfiguration: () => ({ ...configData }),
      
      // Enhanced AI functions
      analyzeAlertPattern: analyzeAlertPattern,
      explainAnomaly: explainAnomaly,
      predictResourceUsage: predictResourceUsage,
      correlateMetrics: correlateMetrics
    };
  } catch (error) {
    logger.error('Failed to initialize AI integration', { error: error.message });
    
    // Return limited functionality for graceful degradation
    return {
      detectAnomalies: () => ({ error: 'AI integration unavailable', severity: 'unknown', anomalies: [] }),
      analyzeTrends: () => ({ error: 'AI integration unavailable', trends: [] }),
      getRecommendations: () => ({ error: 'AI integration unavailable', recommendations: [] }),
      getConfiguration: () => ({ ...configData }),
      analyzeAlertPattern: () => ({ error: 'AI integration unavailable', patterns: [] }),
      explainAnomaly: () => ({ error: 'AI integration unavailable', explanation: 'AI analysis unavailable' }),
      predictResourceUsage: () => ({ error: 'AI integration unavailable', predictions: [] }),
      correlateMetrics: () => ({ error: 'AI integration unavailable', correlations: [] })
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
 * Load specialized models for anomaly detection
 */
async function loadAnomalyModels() {
  try {
    // Get available models
    const response = await axios.get(`${configData.baseUrl}/api/tags`);
    const availableModels = response.data.models?.map(model => model.name) || [];
    
    // Configure specialized models based on what's available
    // Prefer more specialized models if available, fall back to defaults
    
    if (availableModels.includes('llama2-anomaly')) {
      // Specialized models are available
      anomalyModels.cpu = 'llama2-anomaly';
      anomalyModels.memory = 'llama2-anomaly';
      anomalyModels.network = 'llama2-anomaly';
      logger.info('Using specialized anomaly detection model: llama2-anomaly');
    } else {
      // Use default models
      anomalyModels.cpu = configData.models.anomalyDetection;
      anomalyModels.memory = configData.models.anomalyDetection;
      anomalyModels.network = configData.models.anomalyDetection;
      logger.info('Using default model for anomaly detection: ' + configData.models.anomalyDetection);
    }
  } catch (error) {
    logger.error('Failed to load anomaly models', { error: error.message });
    
    // Fall back to defaults
    anomalyModels.cpu = configData.models.anomalyDetection;
    anomalyModels.memory = configData.models.anomalyDetection;
    anomalyModels.network = configData.models.anomalyDetection;
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
 * Analyze patterns in alert history
 * @param {Array} alertHistory - Historical alert data
 * @returns {Promise<Object>} - Alert pattern analysis
 */
async function analyzeAlertPattern(alertHistory) {
  logger.debug('Analyzing alert patterns');
  
  try {
    const modelName = configData.models.trendAnalysis;
    
    // Prepare context
    const context = JSON.stringify(alertHistory, null, 2);
    
    // Prepare prompt
    const prompt = `As a monitoring system, analyze the following alert history:\n${context}\n\n` +
                  `Identify patterns, correlations, and recurring issues. Look for time-based patterns, ` +
                  `resource relationships, and potential root causes. Provide insights on how to reduce alert fatigue.`;
    
    // Generate completion
    const response = await generateCompletion(modelName, prompt);
    
    // Process and structure the response
    const patterns = [];
    const insights = [];
    
    // Extract patterns (simple implementation)
    const patternSection = response.match(/Patterns:([\s\S]*?)(?:Correlations:|$)/i);
    if (patternSection && patternSection[1]) {
      const patternLines = patternSection[1].split('\n').filter(line => line.trim());
      for (const line of patternLines) {
        if (line.includes(':') || line.includes('-') || line.includes('•')) {
          patterns.push({
            description: line.replace(/^[•\-\d\.\s]+/, '').trim()
          });
        }
      }
    }
    
    // Extract insights
    const insightSection = response.match(/Insights:([\s\S]*?)(?:Recommendations:|$)/i);
    if (insightSection && insightSection[1]) {
      const insightLines = insightSection[1].split('\n').filter(line => line.trim());
      for (const line of insightLines) {
        if (line.includes(':') || line.includes('-') || line.includes('•')) {
          insights.push({
            description: line.replace(/^[•\-\d\.\s]+/, '').trim()
          });
        }
      }
    }
    
    logger.info('Alert pattern analysis completed', {
      patternCount: patterns.length,
      insightCount: insights.length
    });
    
    return {
      timestamp: new Date(),
      patterns,
      insights,
      raw_response: response
    };
  } catch (error) {
    logger.error('Error analyzing alert patterns', { error: error.message });
    return {
      timestamp: new Date(),
      patterns: [],
      insights: [],
      message: 'Failed to analyze alert patterns'
    };
  }
}

/**
 * Explain an anomaly in detail
 * @param {Object} anomaly - Anomaly data
 * @param {Object} contextData - Additional context data
 * @returns {Promise<Object>} - Detailed explanation
 */
async function explainAnomaly(anomaly, contextData = {}) {
  logger.debug('Explaining anomaly', { anomalyId: anomaly.id });
  
  try {
    const modelName = configData.models.anomalyDetection;
    
    // Prepare context
    const context = JSON.stringify({
      anomaly,
      context: contextData
    }, null, 2);
    
    // Prepare prompt
    const prompt = `As a monitoring system expert, explain the following anomaly in detail:\n${context}\n\n` +
                  `Provide a detailed explanation of what might be causing this anomaly, its potential impact, ` +
                  `and recommended troubleshooting steps. Include technical details that would help an engineer understand and address the issue.`;
    
    // Generate completion
    const response = await generateCompletion(modelName, prompt);
    
    // Extract key sections
    const causeSection = response.match(/Cause:([\s\S]*?)(?:Impact:|$)/i);
    const impactSection = response.match(/Impact:([\s\S]*?)(?:Troubleshooting:|$)/i);
    const troubleshootingSection = response.match(/Troubleshooting:([\s\S]*?)(?:$)/i);
    
    const explanation = {
      cause: causeSection && causeSection[1] ? causeSection[1].trim() : response.substring(0, 200),
      impact: impactSection && impactSection[1] ? impactSection[1].trim() : null,
      troubleshooting: troubleshootingSection && troubleshootingSection[1] ? 
        troubleshootingSection[1].split('\n')
          .filter(line => line.trim())
          .map(line => line.replace(/^[•\-\d\.\s]+/, '').trim())
          .filter(line => line.length > 0) : 
        []
    };
    
    logger.info('Anomaly explanation completed');
    
    return {
      timestamp: new Date(),
      explanation,
      raw_response: response
    };
  } catch (error) {
    logger.error('Error explaining anomaly', { error: error.message });
    return {
      timestamp: new Date(),
      explanation: {
        cause: 'Failed to generate explanation',
        impact: null,
        troubleshooting: []
      },
      message: 'Failed to explain anomaly'
    };
  }
}

/**
 * Predict future resource usage
 * @param {Object} historicalData - Historical metrics data
 * @param {number} hours - Hours to forecast
 * @returns {Promise<Object>} - Resource usage predictions
 */
async function predictResourceUsage(historicalData, hours = 24) {
  logger.debug('Predicting resource usage', { hours });
  
  try {
    const modelName = configData.models.trendAnalysis;
    
    // Prepare context
    const context = JSON.stringify({
      historicalData,
      forecast_hours: hours
    }, null, 2);
    
    // Prepare prompt
    const prompt = `As a monitoring system, analyze the following historical data and predict resource usage for the next ${hours} hours:\n${context}\n\n` +
                  `For each resource type (CPU, memory, network, disk), provide predicted values at 4-hour intervals. ` +
                  `Include confidence levels and potential peak times. Format predictions as JSON.`;
    
    // Generate completion
    const response = await generateCompletion(modelName, prompt);
    
    // Try to extract JSON
    let predictions = [];
    try {
      // Look for JSON in the response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        if (parsed.predictions) {
          predictions = parsed.predictions;
        } else if (Array.isArray(parsed)) {
          predictions = parsed;
        } else {
          // Try to extract from object structure
          predictions = Object.keys(parsed).map(key => {
            if (typeof parsed[key] === 'object') {
              return {
                resource: key,
                ...parsed[key]
              };
            }
            return null;
          }).filter(item => item !== null);
        }
      }
    } catch (e) {
      // JSON parsing failed, try to extract manually
      logger.warn('Failed to parse JSON from prediction response', { error: e.message });
      
      // Look for resource sections
      const resources = ['CPU', 'Memory', 'Network', 'Disk'];
      
      for (const resource of resources) {
        const resourceSection = response.match(new RegExp(`${resource}[:\\s]+(.*?)(?=(?:${resources.join('|')})[:\\s]+|$)`, 'is'));
        
        if (resourceSection && resourceSection[1]) {
          // Try to extract predictions from text
          const prediction = {
            resource: resource.toLowerCase(),
            values: []
          };
          
          const lines = resourceSection[1].split('\n');
          for (const line of lines) {
            // Look for time + value patterns (e.g., "4 hours: 45%")
            const timeValueMatch = line.match(/(\d+)\s*hours?:\s*([\d\.]+)%?/i);
            if (timeValueMatch) {
              prediction.values.push({
                hour: parseInt(timeValueMatch[1]),
                value: parseFloat(timeValueMatch[2])
              });
            }
          }
          
          if (prediction.values.length > 0) {
            predictions.push(prediction);
          }
        }
      }
    }
    
    logger.info('Resource usage prediction completed', {
      resourceTypes: predictions.length
    });
    
    return {
      timestamp: new Date(),
      predictions,
      forecast_hours: hours,
      raw_response: response
    };
  } catch (error) {
    logger.error('Error predicting resource usage', { error: error.message });
    return {
      timestamp: new Date(),
      predictions: [],
      message: 'Failed to predict resource usage'
    };
  }
}

/**
 * Correlate metrics to find relationships
 * @param {Object} metricsData - Multiple metrics data
 * @returns {Promise<Object>} - Correlation analysis
 */
async function correlateMetrics(metricsData) {
  logger.debug('Correlating metrics');
  
  try {
    const modelName = configData.models.anomalyDetection;
    
    // Prepare context
    const context = JSON.stringify(metricsData, null, 2);
    
    // Prepare prompt
    const prompt = `As a monitoring system, analyze the following metrics data to identify correlations and relationships:\n${context}\n\n` +
                  `Identify metrics that show strong correlations, causal relationships, or interesting patterns when viewed together. ` +
                  `Explain each correlation and its potential significance for system health or performance.`;
    
    // Generate completion
    const response = await generateCompletion(modelName, prompt);
    
    // Process the response to extract correlations
    const correlations = [];
    
    // Extract correlation sections
    const correlationPatterns = [
      /Correlation (\d+):([\s\S]*?)(?=Correlation \d+:|$)/gi,
      /(\d+)\.\s+([^:]+):([\s\S]*?)(?=\d+\.\s+|$)/g,
      /([^:]+) and ([^:]+):([\s\S]*?)(?=\n\n|$)/g
    ];
    
    for (const pattern of correlationPatterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const description = match[2] || `${match[1]} and ${match[2]}`;
        const details = match[3] || match[2] || match[1];
        
        if (description && details) {
          correlations.push({
            description: description.trim(),
            details: details.trim(),
            significance: determineSignificance(details)
          });
        }
      }
      
      if (correlations.length > 0) {
        break; // Stop after the first successful pattern match
      }
    }
    
    // If pattern matching failed, try to split by double newlines
    if (correlations.length === 0) {
      const sections = response.split('\n\n').filter(s => s.trim().length > 0);
      for (const section of sections) {
        if (section.includes(':')) {
          const parts = section.split(':');
          correlations.push({
            description: parts[0].trim(),
            details: parts.slice(1).join(':').trim(),
            significance: determineSignificance(section)
          });
        }
      }
    }
    
    logger.info('Metric correlation completed', {
      correlationsFound: correlations.length
    });
    
    return {
      timestamp: new Date(),
      correlations,
      raw_response: response
    };
  } catch (error) {
    logger.error('Error correlating metrics', { error: error.message });
    return {
      timestamp: new Date(),
      correlations: [],
      message: 'Failed to correlate metrics'
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
 * Process the anomaly detection response
 * @param {string} response - Model response
 * @param {Object} originalData - Original metrics data
 * @returns {Object} - Structured anomaly results
 */
function analyzeAnomalyResponse(response, originalData) {
  // This is a simplified implementation
  // In a real system, this would use more sophisticated parsing
  const anomalies = [];
  let overallSeverity = 'info';
  
  // Extract severity information from the response
  const severityMapping = {
    'critical': 4,
    'error': 3,
    'warning': 2,
    'info': 1
  };
  
  // Check for severity mentions
  if (response.toLowerCase().includes('critical')) {
    overallSeverity = 'critical';
  } else if (response.toLowerCase().includes('error')) {
    overallSeverity = 'error';
  } else if (response.toLowerCase().includes('warning')) {
    overallSeverity = 'warning';
  }
  
  // Extract anomalies from response
  // Try to find numbered lists, bullet points, or paragraph breaks
  
  // First check for numbered lists or bullet points
  const bulletMatches = response.match(/(?:^|\n)(?:\d+\.|\*|-)\s+(.*?)(?=(?:\n(?:\d+\.|\*|-)|$))/g);
  if (bulletMatches && bulletMatches.length > 0) {
    bulletMatches.forEach(match => {
      const text = match.replace(/(?:^|\n)(?:\d+\.|\*|-)\s+/, '').trim();
      if (text.length > 0) {
        let anomalySeverity = 'info';
        
        // Try to determine severity from text
        if (text.toLowerCase().includes('critical')) {
          anomalySeverity = 'critical';
        } else if (text.toLowerCase().includes('error')) {
          anomalySeverity = 'error';
        } else if (text.toLowerCase().includes('warning')) {
          anomalySeverity = 'warning';
        }
        
        anomalies.push({
          description: text,
          severity: anomalySeverity,
          confidence: 0.8,
          detectedAt: new Date()
        });
        
        // Update overall severity if this anomaly is more severe
        if (severityMapping[anomalySeverity] > severityMapping[overallSeverity]) {
          overallSeverity = anomalySeverity;
        }
      }
    });
  } else {
    // If no bullet points, split by paragraphs
    const paragraphs = response.split('\n\n').filter(p => p.trim().length > 0);
    paragraphs.forEach(paragraph => {
      let anomalySeverity = 'info';
      
      // Try to determine severity from text
      if (paragraph.toLowerCase().includes('critical')) {
        anomalySeverity = 'critical';
      } else if (paragraph.toLowerCase().includes('error')) {
        anomalySeverity = 'error';
      } else if (paragraph.toLowerCase().includes('warning')) {
        anomalySeverity = 'warning';
      }
      
      anomalies.push({
        description: paragraph.trim(),
        severity: anomalySeverity,
        confidence: 0.7,
        detectedAt: new Date()
      });
      
      // Update overall severity if this anomaly is more severe
      if (severityMapping[anomalySeverity] > severityMapping[overallSeverity]) {
        overallSeverity = anomalySeverity;
      }
    });
  }
  
  return {
    timestamp: new Date(),
    anomalies,
    severity: overallSeverity,
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
  
  // Extract trends from response
  // Look for specific sections or patterns
  const trendSection = response.match(/Trends:([\s\S]*?)(?:Forecast:|$)/i);
  
  if (trendSection && trendSection[1]) {
    // Split by bullet points or numbered lists
    const trendLines = trendSection[1].split('\n').filter(line => line.trim().length > 0);
    
    trendLines.forEach(line => {
      // Clean up the line
      const cleanLine = line.replace(/^(?:\d+\.|\*|-)\s+/, '').trim();
      
      if (cleanLine.length > 0) {
        let direction = 'stable';
        if (cleanLine.toLowerCase().includes('increase') || cleanLine.toLowerCase().includes('rising')) {
          direction = 'increasing';
        } else if (cleanLine.toLowerCase().includes('decrease') || cleanLine.toLowerCase().includes('declining')) {
          direction = 'decreasing';
        } else if (cleanLine.toLowerCase().includes('fluctuat') || cleanLine.toLowerCase().includes('oscillat')) {
          direction = 'fluctuating';
        }
        
        trends.push({
          description: cleanLine,
          direction,
          confidence: 0.8
        });
      }
    });
  }
  
  // Extract forecast information
  const forecastSection = response.match(/Forecast:([\s\S]*?)(?:$)/i);
  let forecast = {};
  
  if (forecastSection && forecastSection[1]) {
    forecast = {
      description: forecastSection[1].trim(),
      generatedAt: new Date()
    };
  }
  
  return {
    timestamp: new Date(),
    trends,
    forecast,
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
 * Determine priority from text
 */
function determinePriority(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('high priority') || lowerText.includes('critical') || lowerText.includes('urgent')) {
    return 'high';
  } else if (lowerText.includes('medium priority') || lowerText.includes('moderate')) {
    return 'medium';
  } else if (lowerText.includes('low priority')) {
    return 'low';
  }
  
  // If no explicit priority, try to determine from language
  if (lowerText.includes('immediately') || lowerText.includes('as soon as possible') || 
      lowerText.includes('crucial') || lowerText.includes('severe')) {
    return 'high';
  } else if (lowerText.includes('consider') || lowerText.includes('might want to') || 
      lowerText.includes('could')) {
    return 'low';
  }
  
  // Default to medium
  return 'medium';
}

/**
 * Determine significance of correlation
 */
function determineSignificance(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('strong correlation') || lowerText.includes('highly significant') || 
      lowerText.includes('critical relationship') || lowerText.includes('major impact')) {
    return 'high';
  } else if (lowerText.includes('moderate correlation') || lowerText.includes('some significance') || 
      lowerText.includes('potential relationship')) {
    return 'medium';
  } else if (lowerText.includes('weak correlation') || lowerText.includes('minor significance') || 
      lowerText.includes('slight relationship')) {
    return 'low';
  }
  
  // Default to medium
  return 'medium';
} 