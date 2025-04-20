import { Monitoring } from '@google-cloud/monitoring';
import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'gcp-monitoring' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/gcp-monitoring.log' })
  ]
});

/**
 * Set up Google Cloud Monitoring integration
 * @returns {Object} GCP monitoring client
 */
export async function setupGcpMonitoring() {
  logger.info('Setting up Google Cloud Monitoring integration...');
  
  try {
    // Create Google Cloud Monitoring clients
    const metricClient = new Monitoring.MetricServiceClient();
    
    // GCP uses project ID as the main identifier
    const projectId = process.env.GCP_PROJECT_ID;
    
    if (!projectId) {
      throw new Error('GCP_PROJECT_ID environment variable is not set');
    }
    
    logger.info('Google Cloud Monitoring integration setup completed');
    
    return {
      queryMetrics: async (metricType, filter, options) => queryMetricsFromGcp(metricClient, projectId, metricType, filter, options),
      queryTimeSeries: async (filter, interval, aggregation) => queryTimeSeriesFromGcp(metricClient, projectId, filter, interval, aggregation),
      listMetrics: async (filter) => listAvailableMetrics(metricClient, projectId, filter),
      executeQueries: async (queries) => executeCustomQueries(metricClient, projectId, queries)
    };
  } catch (error) {
    logger.error('Failed to set up Google Cloud Monitoring integration', { error: error.message });
    throw error;
  }
}

/**
 * Query metrics from Google Cloud Monitoring
 * @param {Object} client - GCP Monitoring client
 * @param {string} projectId - GCP project ID
 * @param {string} metricType - The metric type to query
 * @param {string} filter - Filter for the metric
 * @param {Object} options - Additional options
 */
async function queryMetricsFromGcp(client, projectId, metricType, filter, options = {}) {
  try {
    const timeInterval = options.timeInterval || {
      startTime: { seconds: Math.floor(Date.now() / 1000) - 3600 }, // 1 hour ago
      endTime: { seconds: Math.floor(Date.now() / 1000) }
    };
    
    // Format the request
    const request = {
      name: `projects/${projectId}`,
      filter: `metric.type="${metricType}" AND ${filter}`,
      interval: timeInterval,
      aggregation: options.aggregation || null
    };
    
    // Query time series data
    const [timeSeries] = await client.listTimeSeries(request);
    
    logger.info(`Retrieved ${timeSeries.length} time series for metric ${metricType}`);
    
    return timeSeries;
  } catch (error) {
    logger.error('Error querying Google Cloud Monitoring metrics', {
      error: error.message,
      metricType,
      filter
    });
    throw error;
  }
}

/**
 * Query time series from Google Cloud Monitoring
 * @param {Object} client - GCP Monitoring client
 * @param {string} projectId - GCP project ID
 * @param {string} filter - Filter for the metrics
 * @param {Object} interval - Time interval
 * @param {Object} aggregation - Aggregation options
 */
async function queryTimeSeriesFromGcp(client, projectId, filter, interval, aggregation) {
  try {
    // Format the request
    const request = {
      name: `projects/${projectId}`,
      filter: filter,
      interval: interval,
      aggregation: aggregation
    };
    
    // Query time series data
    const [timeSeries] = await client.listTimeSeries(request);
    
    return timeSeries;
  } catch (error) {
    logger.error('Error querying Google Cloud Monitoring time series', {
      error: error.message,
      filter
    });
    throw error;
  }
}

/**
 * List available metrics from Google Cloud Monitoring
 * @param {Object} client - GCP Monitoring client
 * @param {string} projectId - GCP project ID
 * @param {string} filter - Filter for the metrics
 */
async function listAvailableMetrics(client, projectId, filter = '') {
  try {
    // Format the request
    const request = {
      name: `projects/${projectId}`,
      filter: filter
    };
    
    // List metric descriptors
    const [descriptors] = await client.listMetricDescriptors(request);
    
    return descriptors;
  } catch (error) {
    logger.error('Error listing Google Cloud Monitoring metrics', {
      error: error.message,
      filter
    });
    throw error;
  }
}

/**
 * Execute custom queries against Google Cloud Monitoring
 * @param {Object} client - GCP Monitoring client
 * @param {string} projectId - GCP project ID
 * @param {Array} queries - Array of query objects
 */
async function executeCustomQueries(client, projectId, queries) {
  const results = [];
  
  for (const query of queries) {
    try {
      if (query.type === 'metric') {
        const timeSeries = await queryMetricsFromGcp(
          client,
          projectId,
          query.metricType,
          query.filter,
          query.options
        );
        results.push({
          id: query.id,
          type: 'metric',
          result: timeSeries
        });
      } else if (query.type === 'timeSeries') {
        const timeSeries = await queryTimeSeriesFromGcp(
          client,
          projectId,
          query.filter,
          query.interval,
          query.aggregation
        );
        results.push({
          id: query.id,
          type: 'timeSeries',
          result: timeSeries
        });
      }
    } catch (error) {
      results.push({
        id: query.id,
        error: error.message
      });
    }
  }
  
  return results;
}

// Sample queries for common GCP resource types
export const sampleQueries = {
  computeInstanceCpu: {
    id: 'compute-instance-cpu',
    type: 'metric',
    metricType: 'compute.googleapis.com/instance/cpu/utilization',
    filter: `resource.type="gce_instance" AND resource.labels.instance_id="${process.env.GCP_INSTANCE_ID}"`,
    options: {
      aggregation: {
        alignmentPeriod: { seconds: 60 },
        perSeriesAligner: 'ALIGN_MEAN'
      }
    }
  },
  
  appEngineLatency: {
    id: 'app-engine-latency',
    type: 'metric',
    metricType: 'appengine.googleapis.com/http/server/response_latencies',
    filter: `resource.type="gae_app" AND resource.labels.module_id="${process.env.GCP_APP_ENGINE_SERVICE}"`,
    options: {
      aggregation: {
        alignmentPeriod: { seconds: 60 },
        perSeriesAligner: 'ALIGN_PERCENTILE_99'
      }
    }
  },
  
  cloudFunctionExecutions: {
    id: 'cloud-function-executions',
    type: 'timeSeries',
    filter: `metric.type="cloudfunctions.googleapis.com/function/execution_count" AND resource.labels.function_name="${process.env.GCP_FUNCTION_NAME}"`,
    interval: {
      startTime: { seconds: Math.floor(Date.now() / 1000) - 86400 }, // 24 hours ago
      endTime: { seconds: Math.floor(Date.now() / 1000) }
    },
    aggregation: {
      alignmentPeriod: { seconds: 3600 }, // 1 hour
      perSeriesAligner: 'ALIGN_SUM'
    }
  }
}; 