# Real-Time Alerting and Monitoring System

A comprehensive monitoring and alerting system built with Node.js that integrates Azure Monitor, Prometheus, and Grafana with AI-driven analytics powered by Ollama.

![System Architecture](/public/images/system_architecture.svg)

## Overview

This system provides real-time monitoring, alerting, and AI-powered analytics for your infrastructure and applications. It collects metrics from various sources, processes them, detects anomalies, and visualizes data through customizable dashboards.

### Key Features

- **Multi-source Monitoring**: Collect metrics from Azure resources, Prometheus endpoints, and custom sources
- **Intelligent Alerting**: Rule-based and AI-driven alerting with customizable notification channels
- **AI Analytics**: Anomaly detection, trend analysis, and resource optimization using Ollama AI models
- **Real-time Visualization**: Custom dashboards and Grafana integration for comprehensive data visualization
- **Color-enhanced Console Output**: Visually distinct alerts, metrics, and logs with color coding by severity and type
- **Extensible Architecture**: Modular design for easy integration with additional data sources and AI models

## Technology Stack

- **Backend**: Node.js with Express
- **Monitoring**: Azure Monitor, Prometheus
- **Visualization**: Grafana, Custom UI
- **AI Integration**: Ollama with Llama2 models
- **Containerization**: Docker and Docker Compose
- **Development**: ESLint, Prettier, Jest for testing

## Prerequisites

- Node.js 18 or later
- Docker and Docker Compose (for containerized deployment)
- Azure subscription (for Azure Monitor integration)
- Ollama (automatically managed with Docker or installed separately for local development)

## Quick Start

### Using Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/realtime-alerting-and-monitoring-system.git
   cd realtime-alerting-and-monitoring-system
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start the system:
   ```bash
   npm run docker:up
   # Or use: docker-compose up -d
   ```

4. Access the services:
   - Custom UI Dashboard: http://localhost:3000
   - Grafana Dashboards: http://localhost:3001 (default credentials: admin/admin)
   - Prometheus UI: http://localhost:9090

5. Demo the pretty logger functionality:
   ```bash
   node scripts/demo-pretty-logger.js
   ```

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Install and start Ollama locally:
   ```bash
   # Follow instructions at https://ollama.ai to install Ollama
   ollama pull llama2
   ollama serve
   ```

4. Start the application in development mode:
   ```bash
   npm run dev
   ```

5. Demo the pretty logger functionality:
   ```bash
   node scripts/demo-pretty-logger.js
   ```

## Configuration

### Environment Variables

Key environment variables (defined in `.env`):

```
# Azure Configuration
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_SUBSCRIPTION_ID=your_subscription_id
AZURE_LOG_ANALYTICS_WORKSPACE_ID=your_workspace_id

# Prometheus Configuration
PROMETHEUS_URL=http://prometheus:9090

# Ollama AI Configuration
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=llama2

# Application Configuration
PORT=3000
LOG_LEVEL=info
```

### Alert Rules

Alert rules are configured in `config/alert-rules.json`. Example:

```json
{
  "rules": [
    {
      "id": "cpu-high-usage",
      "name": "High CPU Usage",
      "description": "Alert when CPU usage is consistently high",
      "type": "prometheus",
      "severity": "warning",
      "query": "avg(system_cpu_usage) > 80",
      "duration": "5m",
      "labels": {
        "resource": "cpu",
        "team": "infrastructure"
      },
      "annotations": {
        "summary": "High CPU usage detected",
        "description": "CPU usage has been above 80% for more than 5 minutes"
      }
    }
  ]
}
```

### Azure Monitor

Azure Monitor configuration is in `config/azure/azure-monitor-config.json` and specifies:
- Resources to monitor
- Metrics and logs to collect
- Query schedules

### Grafana Dashboards

Preconfigured dashboards are available in `config/grafana/dashboards/`:
- System overview
- Azure resources
- Application metrics
- AI insights

### Pretty Logger

The system includes a pretty console logger that enhances terminal output with color coding for improved readability:

- **Color-coded Severity Levels**: Critical (red background), High (red), Medium (yellow), Low (blue), Info (green)
- **Distinct Visual Formats**: Different formats for alerts, metrics, AI insights, and general logs
- **Winston Integration**: Enhanced winston logger transport with color formatting
- **Demo Script**: Run `node scripts/demo-pretty-logger.js` to see examples of all output types

Example usage in your code:

```javascript
// Import the pretty logger utilities
import { prettyPrintAlert, prettyPrintMetric } from '../utils/pretty-logger.js';

// Print a formatted alert
prettyPrintAlert({
  id: 'alert-123',
  name: 'High CPU Usage',
  severity: 'critical',
  status: 'active',
  timestamp: new Date().toISOString(),
  service: 'web-server',
  message: 'CPU usage above 90% threshold',
  description: 'Server experiencing high load'
});

// Print a formatted metric
prettyPrintMetric({
  name: 'Memory Usage',
  value: 75.5,
  timestamp: new Date(),
  unit: '%',
  labels: { instance: 'server-01' }
});
```

## Architecture

The system is composed of the following layers:

### Data Collection Layer

- **Azure Monitor Collector**: Collects metrics and logs from Azure resources
- **Prometheus Collector**: Collects metrics from Prometheus endpoints
- **Custom Collectors**: Extensible framework for custom data collection

### Data Processing Layer

- **Stream Processor**: Processes metrics in real-time
- **Batch Processor**: Handles historical data analysis
- **AI Processor**: Routes data to AI models for analysis

### AI Integration Layer

- **Anomaly Detection**: Identifies unusual patterns in metrics
- **Trend Analysis**: Analyzes metrics to identify trends and patterns
- **Recommendation Engine**: Suggests optimizations based on resource usage

### Alerting Layer

- **Rule-based Alerts**: Traditional threshold-based alerting
- **AI-driven Alerts**: Anomaly-based alerting
- **Alert Manager**: Handles alert aggregation, deduplication, and routing
- **Pretty Logger**: Enhanced visual logging for alerts, metrics, and insights

### Visualization Layer

- **Grafana Dashboards**: Comprehensive data visualization
- **Custom UI**: Tailored dashboards for specific needs
- **API Endpoints**: RESTful API for data access

## Project Structure

```
├── config/                 # Configuration files
│   ├── azure/              # Azure Monitor configuration
│   │   └── azure-monitor-config.json # Azure Monitor configuration
│   ├── grafana/            # Grafana dashboards and provisioning
│   │   └── dashboards/       # Grafana dashboards
│   ├── ollama/             # Ollama AI model configuration
│   ├── prometheus/         # Prometheus configuration
│   └── alert-rules.json    # Alert rules configuration
├── docs/                   # Documentation
│   ├── api/                # API documentation
│   ├── images/             # Documentation images
│   └── system_architecture.md # Architecture diagram
├── public/                 # Static files
│   └── images/             # Generated images
├── scripts/                # Utility scripts
│   └── utils/              # Additional utilities
├── src/                    # Source code
│   ├── ai-integration/     # AI integration modules
│   │   └── ollama-client.js # Ollama client implementation
│   ├── alerting/           # Alert management
│   │   └── alert-manager.js # Alert manager implementation
│   ├── data-collectors/    # Data collection modules
│   │   ├── azure-monitor.js # Azure Monitor collector
│   │   └── prometheus-collector.js # Prometheus collector
│   ├── data-processors/    # Data processing logic
│   │   └── trend-analyzer.js # Trend analysis implementation
│   ├── visualization/      # Visualization components
│   │   └── chart-generator.js # Chart generation utilities
│   ├── __tests__/          # Test files
│   └── index.js            # Application entry point
├── .dockerignore           # Docker ignore file
├── .env.example            # Example environment variables
├── .eslintrc.json          # ESLint configuration
├── .gitignore              # Git ignore file
├── .prettierrc             # Prettier configuration
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile              # Docker configuration
├── jest.config.json        # Jest testing configuration
├── package.json            # Node.js dependencies
└── README.md               # This file
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

### Linting and Formatting

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Adding a New Data Source

1. Create a new collector in `src/data-collectors/`
2. Implement the required interface with at least:
   - `setup()` method for initialization
   - `collectMetrics()` method for data collection
3. Register the collector in `src/index.js`
4. Add appropriate configuration in `config/`

### Creating a Custom Dashboard

1. Design your dashboard in Grafana UI
2. Export the dashboard JSON
3. Add it to `config/grafana/dashboards/`
4. Update provisioning configuration as needed

## Contributors

- **You**
  - **Frontend**: Real-time visualization dashboards, UI components, and responsive design
  - **Backend**: Data processing layer, API endpoints, and alerting system integration

- **Anshuman**
  - **Frontend**: Grafana dashboard customizations, chart components, and user interactions
  - **Backend**: Data collectors, AI integration, and system architecture

## AI Analytics

The system uses Ollama to provide three types of AI-driven analytics:

1. **Anomaly Detection**: Identifies unusual patterns in metrics that may indicate issues
2. **Trend Analysis**: Analyzes historical data to identify patterns and forecast future trends
3. **Recommendation Engine**: Suggests optimizations based on resource usage patterns

AI models and configurations are stored in `