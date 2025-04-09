/**
 * Pretty logger utility for colorful console output
 * Uses chalk for terminal coloring
 */
import chalk from 'chalk';

/**
 * Alert severity level colors
 */
const SEVERITY_COLORS = {
  critical: chalk.bgRed.white.bold,
  high: chalk.red.bold,
  medium: chalk.yellow.bold,
  low: chalk.blue,
  info: chalk.green
};

/**
 * Log level colors
 */
const LOG_LEVEL_COLORS = {
  error: chalk.red.bold,
  warn: chalk.yellow.bold,
  info: chalk.blue,
  debug: chalk.gray,
  verbose: chalk.magenta,
  silly: chalk.cyan
};

/**
 * Pretty prints an alert to the console
 * @param {Object} alert - The alert object to print
 */
export function prettyPrintAlert(alert) {
  const { id, name, severity, status, timestamp, service, message, description } = alert;
  const severityFn = SEVERITY_COLORS[severity.toLowerCase()] || chalk.white;
  
  const statusColor = status === 'active' ? chalk.bgRed.white.bold : chalk.bgGreen.black;
  const formattedTime = new Date(timestamp).toLocaleTimeString();
  
  console.log('\n' + chalk.bold('⚠️  ALERT') + ' ' + severityFn(`[${severity.toUpperCase()}]`));
  console.log(chalk.bold('Name:     ') + name);
  console.log(chalk.bold('ID:       ') + id);
  console.log(chalk.bold('Status:   ') + statusColor(` ${status.toUpperCase()} `));
  console.log(chalk.bold('Service:  ') + (service || 'N/A'));
  console.log(chalk.bold('Time:     ') + formattedTime);
  console.log(chalk.bold('Message:  ') + message);
  
  if (description) {
    console.log(chalk.bold('Details:  ') + description);
  }
  
  console.log(chalk.gray('─'.repeat(80)));
}

/**
 * Pretty prints a metric to the console
 * @param {Object} metric - The metric object to print
 * @param {Object} options - Display options
 */
export function prettyPrintMetric(metric, options = {}) {
  const { name, value, timestamp, unit, labels } = metric;
  const { showLabels = true } = options;
  
  let valueColor = chalk.white;
  if (value > 80) valueColor = chalk.red;
  else if (value > 60) valueColor = chalk.yellow;
  else valueColor = chalk.green;
  
  const formattedValue = typeof value === 'number' ? 
    valueColor(value.toFixed(2)) : 
    valueColor(value);
  
  const formattedUnit = unit ? chalk.gray(unit) : '';
  const formattedTime = new Date(timestamp).toLocaleTimeString();
  
  console.log(
    chalk.blue.bold(name.padEnd(30)) + 
    formattedValue + formattedUnit + 
    chalk.gray(` (${formattedTime})`)
  );
  
  if (showLabels && labels) {
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${chalk.gray(k)}=${chalk.cyan(v)}`)
      .join(', ');
    console.log('  ' + labelStr);
  }
}

/**
 * Pretty prints an AI insight to the console
 * @param {Object} insight - The AI insight object to print
 */
export function prettyPrintInsight(insight) {
  const { type, message, confidence, relatedServices, timestamp } = insight;
  
  const typeColor = {
    'anomaly': chalk.red.bold,
    'trend': chalk.blue.bold,
    'correlation': chalk.magenta.bold,
    'recommendation': chalk.green.bold,
    'prediction': chalk.cyan.bold
  }[type.toLowerCase()] || chalk.white.bold;
  
  const confidenceColor = 
    confidence >= 0.8 ? chalk.green :
    confidence >= 0.5 ? chalk.yellow :
    chalk.red;
  
  const formattedTime = new Date(timestamp).toLocaleTimeString();
  
  console.log('\n' + chalk.bold('🧠 AI INSIGHT') + ' ' + typeColor(`[${type.toUpperCase()}]`));
  console.log(message);
  
  if (confidence !== undefined) {
    const confidencePercent = Math.round(confidence * 100);
    console.log(chalk.bold('Confidence: ') + confidenceColor(`${confidencePercent}%`));
  }
  
  if (relatedServices && relatedServices.length > 0) {
    console.log(chalk.bold('Related:    ') + relatedServices.join(', '));
  }
  
  console.log(chalk.gray('Time:       ') + formattedTime);
  console.log(chalk.gray('─'.repeat(80)));
}

/**
 * Creates a winston format that includes colorized output for console
 * @param {Object} options - Format options
 * @returns {Object} - Winston format
 */
export function createPrettyConsoleFormat(winston, options = {}) {
  const { showTimestamp = true, showLevel = true, showService = true } = options;
  
  // This depends on winston being passed in
  return winston.format.printf(info => {
    const { timestamp, level, message, service, ...rest } = info;
    
    // Color the level
    const levelFn = LOG_LEVEL_COLORS[level.toLowerCase()] || chalk.white;
    const coloredLevel = levelFn(level.toUpperCase().padEnd(7));
    
    // Format timestamp if needed
    let timeStr = '';
    if (showTimestamp && timestamp) {
      const date = new Date(timestamp);
      timeStr = chalk.gray(`[${date.toLocaleTimeString()}] `);
    }
    
    // Format service if needed
    let serviceStr = '';
    if (showService && service) {
      serviceStr = chalk.cyan(`[${service}] `);
    }
    
    // Build the main message
    let output = `${timeStr}${coloredLevel} ${serviceStr}${message}`;
    
    // Add any additional metadata
    const metadata = { ...rest };
    delete metadata.splat;
    
    if (Object.keys(metadata).length > 0) {
      output += '\n' + chalk.gray(JSON.stringify(metadata, null, 2));
    }
    
    return output;
  });
}

/**
 * Get Winston transport configured for pretty console output
 * @param {Object} winston - Winston module
 * @param {Object} options - Transport options
 * @returns {Object} - Configured transport
 */
export function createPrettyConsoleTransport(winston, options = {}) {
  return new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      createPrettyConsoleFormat(winston, options)
    )
  });
} 