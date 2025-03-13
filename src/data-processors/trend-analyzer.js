import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'trend-analyzer' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/trend-analyzer.log' })
  ]
});

/**
 * Analyzes historical metrics data to identify trends
 * @param {Array} metricsData - Array of metrics data points
 * @param {Object} options - Analysis options
 * @returns {Object} - Trend analysis results
 */
export async function analyzeTrends(metricsData, options = {}) {
  logger.info('Analyzing trends in metrics data', {
    dataPoints: metricsData.length,
    options
  });
  
  try {
    // Default timeframe to analyze (in hours)
    const timeframe = options.timeframe || 24;
    
    // Apply different analysis techniques based on the data type
    const results = {
      timestamp: new Date(),
      trends: [],
      statistics: calculateStatistics(metricsData),
      forecast: forecastValues(metricsData, timeframe)
    };
    
    // Identify trends in the data
    results.trends = identifyTrends(metricsData, results.statistics);
    
    logger.info('Trend analysis completed', {
      trendsIdentified: results.trends.length
    });
    
    return results;
  } catch (error) {
    logger.error('Error analyzing trends', { error: error.message });
    throw error;
  }
}

/**
 * Calculate statistical properties of the metrics data
 * @param {Array} data - Metrics data
 * @returns {Object} - Statistical properties
 */
function calculateStatistics(data) {
  if (!data || data.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0
    };
  }
  
  // Extract values (assuming data is an array of objects with a 'value' property)
  const values = data.map(point => typeof point.value === 'number' ? point.value : 0);
  
  // Calculate mean
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / values.length;
  
  // Calculate median
  const sortedValues = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sortedValues.length / 2);
  const median = sortedValues.length % 2 === 0
    ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
    : sortedValues[mid];
  
  // Calculate standard deviation
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Find min and max
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return {
    mean,
    median,
    stdDev,
    min,
    max
  };
}

/**
 * Identify trends in the data based on statistical properties
 * @param {Array} data - Metrics data
 * @param {Object} stats - Statistical properties
 * @returns {Array} - Identified trends
 */
function identifyTrends(data, stats) {
  const trends = [];
  
  if (!data || data.length < 2) {
    return trends;
  }
  
  // Check for consistent upward trend
  let isIncreasing = true;
  let isDecreasing = true;
  
  for (let i = 1; i < data.length; i++) {
    const current = data[i].value;
    const previous = data[i - 1].value;
    
    if (current <= previous) {
      isIncreasing = false;
    }
    
    if (current >= previous) {
      isDecreasing = false;
    }
  }
  
  if (isIncreasing) {
    trends.push({
      type: 'increasing',
      description: 'Values are consistently increasing',
      confidence: 'high'
    });
  } else if (isDecreasing) {
    trends.push({
      type: 'decreasing',
      description: 'Values are consistently decreasing',
      confidence: 'high'
    });
  }
  
  // Check for oscillation
  let changes = 0;
  let increasing = null;
  
  for (let i = 1; i < data.length; i++) {
    const current = data[i].value;
    const previous = data[i - 1].value;
    
    if (current > previous && (increasing === null || increasing === false)) {
      increasing = true;
      if (increasing !== null) changes++;
    } else if (current < previous && (increasing === null || increasing === true)) {
      increasing = false;
      if (increasing !== null) changes++;
    }
  }
  
  // If there are many direction changes, it might be oscillating
  if (changes >= data.length / 3) {
    trends.push({
      type: 'oscillating',
      description: 'Values are oscillating',
      confidence: 'medium'
    });
  }
  
  // Check for outliers (values outside 2 standard deviations)
  const outliers = data.filter(point => 
    Math.abs(point.value - stats.mean) > 2 * stats.stdDev
  );
  
  if (outliers.length > 0) {
    trends.push({
      type: 'outliers',
      description: `Found ${outliers.length} outlier(s)`,
      confidence: 'medium',
      outliers: outliers.map(o => ({ timestamp: o.timestamp, value: o.value }))
    });
  }
  
  // Check for stability (low standard deviation relative to mean)
  if (stats.stdDev < 0.1 * stats.mean) {
    trends.push({
      type: 'stable',
      description: 'Values are stable with low variability',
      confidence: 'high'
    });
  }
  
  return trends;
}

/**
 * Generate a simple forecast for future values
 * @param {Array} data - Historical data
 * @param {number} hours - Hours to forecast
 * @returns {Object} - Forecast results
 */
function forecastValues(data, hours) {
  if (!data || data.length < 2) {
    return { values: [] };
  }
  
  // For simplicity, use linear regression for forecasting
  // In a real implementation, this would use more sophisticated methods
  const x = [];
  const y = [];
  
  // Convert timestamps to relative hours for simplicity
  const firstTimestamp = new Date(data[0].timestamp).getTime();
  
  data.forEach((point, index) => {
    const timestamp = new Date(point.timestamp).getTime();
    const hoursDiff = (timestamp - firstTimestamp) / (1000 * 60 * 60);
    x.push(hoursDiff);
    y.push(point.value);
  });
  
  // Calculate linear regression
  const n = x.length;
  const sumX = x.reduce((acc, val) => acc + val, 0);
  const sumY = y.reduce((acc, val) => acc + val, 0);
  const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
  const sumXX = x.reduce((acc, val) => acc + val * val, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Generate forecast points
  const forecastPoints = [];
  const lastX = x[x.length - 1];
  
  for (let i = 1; i <= hours; i++) {
    const forecastX = lastX + i;
    const forecastY = slope * forecastX + intercept;
    
    forecastPoints.push({
      timestamp: new Date(firstTimestamp + forecastX * 60 * 60 * 1000),
      value: forecastY
    });
  }
  
  return {
    method: 'linear-regression',
    values: forecastPoints,
    model: {
      slope,
      intercept
    }
  };
} 