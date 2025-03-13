/**
 * Chart Generator module for creating visualization configurations
 * This module generates configurations for charts that can be rendered
 * by frontend libraries like Chart.js or embedded in Grafana
 */

/**
 * Generate a time series chart configuration
 * @param {Object} options - Chart options
 * @param {Array} data - Time series data
 * @returns {Object} - Chart configuration
 */
export function generateTimeSeriesChart(options, data) {
  // Validate inputs
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Invalid data for time series chart');
  }
  
  // Default options
  const chartOptions = {
    title: options.title || 'Time Series Chart',
    xAxisLabel: options.xAxisLabel || 'Time',
    yAxisLabel: options.yAxisLabel || 'Value',
    type: options.type || 'line',
    colors: options.colors || ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6'],
    timeFormat: options.timeFormat || 'HH:mm:ss',
    dateFormat: options.dateFormat || 'YYYY-MM-DD',
    showLegend: options.showLegend !== undefined ? options.showLegend : true,
    ...options
  };
  
  // Process data for the chart
  const chartData = processTimeSeriesData(data, chartOptions);
  
  // Generate chart configuration
  return {
    type: chartOptions.type,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      title: {
        display: true,
        text: chartOptions.title
      },
      legend: {
        display: chartOptions.showLegend
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: determineTimeUnit(data),
            displayFormats: {
              minute: chartOptions.timeFormat,
              hour: chartOptions.timeFormat,
              day: chartOptions.dateFormat
            }
          },
          title: {
            display: true,
            text: chartOptions.xAxisLabel
          }
        },
        y: {
          title: {
            display: true,
            text: chartOptions.yAxisLabel
          }
        }
      },
      animation: {
        duration: 0 // Disable animations for performance
      },
      elements: {
        point: {
          radius: determinePointRadius(data.length)
        },
        line: {
          tension: 0.1 // Slight curve for better visualization
        }
      }
    },
    data: chartData
  };
}

/**
 * Generate a gauge chart configuration
 * @param {Object} options - Chart options
 * @param {number} value - Current value
 * @returns {Object} - Chart configuration
 */
export function generateGaugeChart(options, value) {
  // Default options
  const chartOptions = {
    title: options.title || 'Gauge Chart',
    min: options.min !== undefined ? options.min : 0,
    max: options.max !== undefined ? options.max : 100,
    thresholds: options.thresholds || [
      { value: 0.33, color: '#2ecc71' },  // Green for low values
      { value: 0.66, color: '#f39c12' },  // Yellow for medium values
      { value: 1, color: '#e74c3c' }      // Red for high values
    ],
    ...options
  };
  
  // Calculate percentage for thresholds
  const range = chartOptions.max - chartOptions.min;
  const percentage = (value - chartOptions.min) / range;
  
  // Determine color based on thresholds
  let color = chartOptions.thresholds[0].color;
  for (const threshold of chartOptions.thresholds) {
    if (percentage <= threshold.value) {
      color = threshold.color;
      break;
    }
  }
  
  // Generate chart configuration
  return {
    type: 'gauge',
    options: {
      responsive: true,
      title: {
        display: true,
        text: chartOptions.title
      },
      needle: {
        radiusPercentage: 2,
        widthPercentage: 3.2,
        color: '#000000'
      },
      valueLabel: {
        display: true,
        formatter: (value) => {
          return value.toFixed(chartOptions.precision || 0);
        }
      }
    },
    data: {
      datasets: [{
        value: value,
        minValue: chartOptions.min,
        maxValue: chartOptions.max,
        backgroundColor: generateGaugeColorGradient(chartOptions.thresholds)
      }]
    }
  };
}

/**
 * Generate a pie chart configuration
 * @param {Object} options - Chart options
 * @param {Array} data - Pie chart data
 * @returns {Object} - Chart configuration
 */
export function generatePieChart(options, data) {
  // Validate inputs
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Invalid data for pie chart');
  }
  
  // Default options
  const chartOptions = {
    title: options.title || 'Pie Chart',
    colors: options.colors || [
      '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
      '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad'
    ],
    showLegend: options.showLegend !== undefined ? options.showLegend : true,
    showLabels: options.showLabels !== undefined ? options.showLabels : true,
    ...options
  };
  
  // Process data for the chart
  const labels = data.map(item => item.label);
  const values = data.map(item => item.value);
  const backgroundColors = data.map((_, index) => chartOptions.colors[index % chartOptions.colors.length]);
  
  // Generate chart configuration
  return {
    type: 'pie',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      title: {
        display: true,
        text: chartOptions.title
      },
      legend: {
        display: chartOptions.showLegend,
        position: 'right'
      },
      plugins: {
        datalabels: {
          display: chartOptions.showLabels,
          formatter: (value, ctx) => {
            const dataset = ctx.chart.data.datasets[0];
            const sum = dataset.data.reduce((a, b) => a + b, 0);
            const percentage = (value * 100 / sum).toFixed(1) + '%';
            return percentage;
          },
          color: '#ffffff',
          font: {
            weight: 'bold'
          }
        }
      }
    },
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: backgroundColors
      }]
    }
  };
}

/**
 * Generate a table configuration for tabular data
 * @param {Object} options - Table options
 * @param {Array} data - Table data
 * @returns {Object} - Table configuration
 */
export function generateTable(options, data) {
  // Validate inputs
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('Invalid data for table');
  }
  
  // Default options
  const tableOptions = {
    title: options.title || 'Data Table',
    columns: options.columns || Object.keys(data[0]).map(key => ({
      id: key,
      header: key.charAt(0).toUpperCase() + key.slice(1),
      accessor: key
    })),
    pagination: options.pagination !== undefined ? options.pagination : true,
    pageSize: options.pageSize || 10,
    sortable: options.sortable !== undefined ? options.sortable : true,
    filterable: options.filterable !== undefined ? options.filterable : true,
    ...options
  };
  
  // Generate table configuration
  return {
    type: 'table',
    options: tableOptions,
    data: data
  };
}

// Helper functions

/**
 * Process time series data for chart rendering
 * @param {Array} data - Raw time series data
 * @param {Object} options - Chart options
 * @returns {Object} - Processed chart data
 */
function processTimeSeriesData(data, options) {
  // Check if data is multi-series (array of arrays) or single series
  const isMultiSeries = Array.isArray(data[0]) || data[0].datasets;
  
  if (isMultiSeries) {
    // Handle multi-series data
    const datasets = [];
    
    if (data[0].datasets) {
      // Data already in datasets format
      return {
        labels: data.map(point => point.timestamp || point.x || point.time || point.date),
        datasets: data[0].datasets
      };
    } else {
      // Convert array of arrays to datasets
      data.forEach((series, index) => {
        datasets.push({
          label: options.series && options.series[index] ? options.series[index].label : `Series ${index + 1}`,
          data: series.map(point => ({
            x: point.timestamp || point.x || point.time || point.date,
            y: point.value || point.y
          })),
          borderColor: options.colors[index % options.colors.length],
          backgroundColor: `${options.colors[index % options.colors.length]}33`, // 20% opacity
          fill: options.fill !== undefined ? options.fill : false
        });
      });
      
      return { datasets };
    }
  } else {
    // Handle single series data
    return {
      labels: data.map(point => point.timestamp || point.x || point.time || point.date),
      datasets: [{
        label: options.series && options.series[0] ? options.series[0].label : 'Series 1',
        data: data.map(point => point.value || point.y),
        borderColor: options.colors[0],
        backgroundColor: `${options.colors[0]}33`, // 20% opacity
        fill: options.fill !== undefined ? options.fill : false
      }]
    };
  }
}

/**
 * Determine the appropriate point radius based on data size
 * @param {number} dataLength - Number of data points
 * @returns {number} - Point radius
 */
function determinePointRadius(dataLength) {
  if (dataLength > 100) return 0;
  if (dataLength > 50) return 1;
  if (dataLength > 20) return 2;
  return 3;
}

/**
 * Determine the appropriate time unit based on data
 * @param {Array} data - Time series data
 * @returns {string} - Time unit
 */
function determineTimeUnit(data) {
  // Get first and last timestamps
  const firstDate = new Date(data[0].timestamp || data[0].x || data[0].time || data[0].date);
  const lastDate = new Date(data[data.length - 1].timestamp || data[data.length - 1].x || data[data.length - 1].time || data[data.length - 1].date);
  
  // Calculate time span in milliseconds
  const timeSpan = lastDate - firstDate;
  
  // Determine appropriate time unit
  if (timeSpan < 1000 * 60 * 60 * 2) {
    // Less than 2 hours, use minutes
    return 'minute';
  } else if (timeSpan < 1000 * 60 * 60 * 24 * 2) {
    // Less than 2 days, use hours
    return 'hour';
  } else {
    // More than 2 days, use days
    return 'day';
  }
}

/**
 * Generate color gradient for gauge chart
 * @param {Array} thresholds - Threshold values and colors
 * @returns {Array} - Color stops for gradient
 */
function generateGaugeColorGradient(thresholds) {
  return thresholds.map(threshold => {
    return {
      offset: threshold.value * 100,
      color: threshold.color
    };
  });
} 