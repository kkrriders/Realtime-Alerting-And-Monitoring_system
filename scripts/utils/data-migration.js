#!/usr/bin/env node

/**
 * Data Migration Utility
 * 
 * This script helps migrate data between different monitoring systems.
 * It can be used to:
 * - Export data from Prometheus to JSON
 * - Export data from Azure Monitor to JSON
 * - Import JSON data into Prometheus
 * - Convert between different formats
 * 
 * Usage:
 *   node data-migration.js export --source prometheus --query "up" --start "2023-01-01T00:00:00Z" --end "2023-01-02T00:00:00Z" --output data.json
 *   node data-migration.js import --target prometheus --input data.json
 *   node data-migration.js convert --from azure --to prometheus --input azure-data.json --output prometheus-data.json
 */

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { program } from 'commander';
import dotenv from 'dotenv';
import { DefaultAzureCredential } from '@azure/identity';
import { MetricsQueryClient } from '@azure/monitor-query';

// Load environment variables
dotenv.config();

// Configure the command-line interface
program
  .name('data-migration')
  .description('Data migration utility for monitoring systems')
  .version('1.0.0');

// Export command
program
  .command('export')
  .description('Export data from a monitoring system')
  .requiredOption('--source <source>', 'Source system (prometheus, azure)')
  .requiredOption('--query <query>', 'Query to execute')
  .option('--start <start>', 'Start time (ISO 8601)')
  .option('--end <end>', 'End time (ISO 8601)')
  .option('--step <step>', 'Query resolution step (e.g., 15s, 1m, 1h)')
  .requiredOption('--output <file>', 'Output file path')
  .action(async (options) => {
    try {
      console.log(`Exporting data from ${options.source}...`);
      
      let data;
      if (options.source === 'prometheus') {
        data = await exportFromPrometheus(options);
      } else if (options.source === 'azure') {
        data = await exportFromAzure(options);
      } else {
        throw new Error(`Unsupported source: ${options.source}`);
      }
      
      // Write data to output file
      await fs.writeFile(options.output, JSON.stringify(data, null, 2));
      console.log(`Data exported to ${options.output}`);
    } catch (error) {
      console.error('Error exporting data:', error.message);
      process.exit(1);
    }
  });

// Import command
program
  .command('import')
  .description('Import data into a monitoring system')
  .requiredOption('--target <target>', 'Target system (prometheus, azure)')
  .requiredOption('--input <file>', 'Input file path')
  .option('--options <options>', 'Additional options in JSON format')
  .action(async (options) => {
    try {
      console.log(`Importing data to ${options.target}...`);
      
      // Read data from input file
      const data = JSON.parse(await fs.readFile(options.input, 'utf8'));
      
      if (options.target === 'prometheus') {
        await importToPrometheus(data, options);
      } else if (options.target === 'azure') {
        await importToAzure(data, options);
      } else {
        throw new Error(`Unsupported target: ${options.target}`);
      }
      
      console.log('Data imported successfully');
    } catch (error) {
      console.error('Error importing data:', error.message);
      process.exit(1);
    }
  });

// Convert command
program
  .command('convert')
  .description('Convert data between formats')
  .requiredOption('--from <source>', 'Source format (prometheus, azure)')
  .requiredOption('--to <target>', 'Target format (prometheus, azure, csv, json)')
  .requiredOption('--input <file>', 'Input file path')
  .requiredOption('--output <file>', 'Output file path')
  .action(async (options) => {
    try {
      console.log(`Converting data from ${options.from} to ${options.to}...`);
      
      // Read data from input file
      const inputData = JSON.parse(await fs.readFile(options.input, 'utf8'));
      
      // Convert the data
      let outputData;
      if (options.from === 'prometheus' && options.to === 'azure') {
        outputData = convertPrometheusToAzure(inputData);
      } else if (options.from === 'azure' && options.to === 'prometheus') {
        outputData = convertAzureToPrometheus(inputData);
      } else if (options.to === 'csv') {
        outputData = convertToCSV(inputData, options.from);
        await fs.writeFile(options.output, outputData);
        console.log(`Data converted and saved to ${options.output}`);
        return;
      } else {
        throw new Error(`Unsupported conversion: ${options.from} to ${options.to}`);
      }
      
      // Write data to output file
      await fs.writeFile(options.output, JSON.stringify(outputData, null, 2));
      console.log(`Data converted and saved to ${options.output}`);
    } catch (error) {
      console.error('Error converting data:', error.message);
      process.exit(1);
    }
  });

// Parse command-line arguments
program.parse();

/**
 * Export data from Prometheus
 */
async function exportFromPrometheus(options) {
  const prometheusUrl = process.env.PROMETHEUS_URL || 'http://localhost:9090';
  
  const params = {
    query: options.query
  };
  
  if (options.start && options.end) {
    // Range query
    params.start = options.start;
    params.end = options.end;
    params.step = options.step || '15s';
    
    const response = await axios.get(`${prometheusUrl}/api/v1/query_range`, { params });
    return response.data;
  } else {
    // Instant query
    const response = await axios.get(`${prometheusUrl}/api/v1/query`, { params });
    return response.data;
  }
}

/**
 * Export data from Azure Monitor
 */
async function exportFromAzure(options) {
  // Create a credential using environment variables
  const credential = new DefaultAzureCredential();
  
  // Create the metrics client
  const metricsClient = new MetricsQueryClient(credential);
  
  // Parse the query to extract resourceId and metricNames
  const parts = options.query.split(':');
  if (parts.length !== 2) {
    throw new Error('Azure query must be in the format "resourceId:metricName"');
  }
  
  const resourceId = parts[0];
  const metricNames = [parts[1]];
  
  // Set up query options
  const queryOptions = {};
  if (options.start && options.end) {
    queryOptions.timespan = {
      startTime: new Date(options.start),
      endTime: new Date(options.end)
    };
  }
  
  // Execute the query
  const result = await metricsClient.queryResource(resourceId, metricNames, queryOptions);
  
  return {
    status: 'success',
    data: {
      resultType: 'azure',
      result: result.metrics
    }
  };
}

/**
 * Import data into Prometheus
 * Note: This is a simplified implementation and would actually require
 * writing to Prometheus's storage directly or using remote write API
 */
async function importToPrometheus(data, options) {
  console.log('Note: Direct import to Prometheus is not fully implemented.');
  console.log('This would require using Prometheus remote_write API or writing to storage directly.');
  console.log('For now, this function just validates the data format.');
  
  // Validate data format
  if (!data.status || !data.data || !data.data.result) {
    throw new Error('Invalid Prometheus data format');
  }
  
  // In a real implementation, you would send this data to Prometheus
  return true;
}

/**
 * Import data into Azure Monitor
 * Note: This is a simplified implementation as Azure Monitor
 * does not generally support importing metrics directly
 */
async function importToAzure(data, options) {
  console.log('Note: Direct import to Azure Monitor is not fully implemented.');
  console.log('Azure Monitor generally does not support importing metrics directly.');
  console.log('This function is primarily for demonstration purposes.');
  
  // In a real implementation, you might use custom metrics API
  return true;
}

/**
 * Convert Prometheus data to Azure Monitor format
 */
function convertPrometheusToAzure(prometheusData) {
  const result = prometheusData.data.result;
  
  // Create a map to store metrics by name
  const metricsByName = {};
  
  // Process each result
  result.forEach(item => {
    const metricName = item.metric.__name__ || 'unknown';
    const labels = { ...item.metric };
    delete labels.__name__;
    
    if (!metricsByName[metricName]) {
      metricsByName[metricName] = {
        name: metricName,
        timeseries: []
      };
    }
    
    // Convert values to the Azure format
    const timeseriesData = {
      metadataValues: Object.entries(labels).map(([key, value]) => ({
        name: key,
        value: value
      })),
      data: []
    };
    
    // Process values (could be range or instant query)
    if (Array.isArray(item.values)) {
      // Range query
      item.values.forEach(([timestamp, value]) => {
        timeseriesData.data.push({
          timeStamp: new Date(timestamp * 1000).toISOString(),
          average: parseFloat(value)
        });
      });
    } else if (item.value) {
      // Instant query
      const [timestamp, value] = item.value;
      timeseriesData.data.push({
        timeStamp: new Date(timestamp * 1000).toISOString(),
        average: parseFloat(value)
      });
    }
    
    metricsByName[metricName].timeseries.push(timeseriesData);
  });
  
  // Convert to Azure format
  return {
    metrics: Object.values(metricsByName)
  };
}

/**
 * Convert Azure Monitor data to Prometheus format
 */
function convertAzureToPrometheus(azureData) {
  const metrics = azureData.metrics || [];
  
  // Create result array
  const result = [];
  
  // Process each metric
  metrics.forEach(metric => {
    const metricName = metric.name;
    
    // Process each timeseries
    metric.timeseries.forEach(timeseries => {
      // Extract labels from metadataValues
      const labels = {};
      if (timeseries.metadataValues) {
        timeseries.metadataValues.forEach(meta => {
          labels[meta.name] = meta.value;
        });
      }
      
      // Add __name__ label
      labels.__name__ = metricName;
      
      // Convert values
      const values = timeseries.data.map(point => {
        const timestamp = Math.floor(new Date(point.timeStamp).getTime() / 1000);
        const value = point.average || point.total || point.count || 0;
        return [timestamp, value.toString()];
      });
      
      // Add to result
      result.push({
        metric: labels,
        values: values
      });
    });
  });
  
  // Return in Prometheus format
  return {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: result
    }
  };
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data, sourceFormat) {
  let csvRows = [];
  
  if (sourceFormat === 'prometheus') {
    // Add header row
    csvRows.push('timestamp,metric_name,value,' + getLabelsHeader(data));
    
    // Process each result
    data.data.result.forEach(item => {
      const metricName = item.metric.__name__ || 'unknown';
      const labels = { ...item.metric };
      delete labels.__name__;
      
      // Process values
      if (Array.isArray(item.values)) {
        // Range query
        item.values.forEach(([timestamp, value]) => {
          const date = new Date(timestamp * 1000).toISOString();
          const labelsStr = getLabelsString(labels);
          csvRows.push(`${date},${metricName},${value},${labelsStr}`);
        });
      } else if (item.value) {
        // Instant query
        const [timestamp, value] = item.value;
        const date = new Date(timestamp * 1000).toISOString();
        const labelsStr = getLabelsString(labels);
        csvRows.push(`${date},${metricName},${value},${labelsStr}`);
      }
    });
  } else if (sourceFormat === 'azure') {
    // Add header row
    csvRows.push('timestamp,metric_name,value,resource');
    
    // Process each metric
    data.metrics.forEach(metric => {
      const metricName = metric.name;
      
      // Process each timeseries
      metric.timeseries.forEach(timeseries => {
        // Extract resource from metadataValues
        let resource = '';
        if (timeseries.metadataValues && timeseries.metadataValues.length > 0) {
          resource = timeseries.metadataValues.map(m => `${m.name}=${m.value}`).join(',');
        }
        
        // Convert values
        timeseries.data.forEach(point => {
          const timestamp = new Date(point.timeStamp).toISOString();
          const value = point.average || point.total || point.count || 0;
          csvRows.push(`${timestamp},${metricName},${value},${resource}`);
        });
      });
    });
  } else {
    throw new Error(`Unsupported source format for CSV conversion: ${sourceFormat}`);
  }
  
  return csvRows.join('\n');
}

/**
 * Get header row for labels in CSV
 */
function getLabelsHeader(data) {
  const allLabels = new Set();
  
  // Collect all unique label names
  data.data.result.forEach(item => {
    Object.keys(item.metric).forEach(key => {
      if (key !== '__name__') {
        allLabels.add(key);
      }
    });
  });
  
  return Array.from(allLabels).join(',');
}

/**
 * Get values for labels in CSV
 */
function getLabelsString(labels) {
  return Object.values(labels).join(',');
} 