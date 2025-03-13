# Real-Time Alerting and Monitoring System

This project implements a comprehensive real-time monitoring and alerting system that combines Azure Monitor, Prometheus, and Grafana with AI-driven analytics via Ollama. The system provides deep insights into system performance, proactively detects anomalies, and enables data-driven decision-making to ensure high availability and reliability.

## Architecture Overview

![System Architecture](docs/system_architecture.md)

The system consists of the following components:

1. **Data Collection Layer**
   - Azure Monitor integration for Azure resources
   - Prometheus for metrics collection
   - Custom data collectors for application-specific metrics

2. **Data Processing Layer**
   - Stream processing for real-time analysis
   - Batch processing for historical analysis
   - AI/ML processing via Ollama models

3. **Alerting Layer**
   - Rule-based alerts
   - AI-driven anomaly detection
   - Alert management and notification system

4. **Visualization Layer**
   - Grafana dashboards for real-time monitoring
   - Custom visualization for AI insights
   - Historical trend analysis

## Prerequisites

- Azure subscription with appropriate permissions
- Node.js 18 or later
- Docker and Docker Compose
- Kubernetes cluster (optional, for production deployment)

## Quick Start

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/realtime-alerting-and-monitoring-system.git
   cd realtime-alerting-and-monitoring-system
   ```

2. Install the required dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   ```
   cp .env.example .env
   # Edit .env with your configuration details
   ```

4. Start the system using Docker Compose:
   ```
   docker-compose up -d
   ```

5. Access Grafana dashboards:
   - URL: http://localhost:3001
   - Default credentials: admin/admin

6. Access the custom UI dashboard:
   - URL: http://localhost:3000

## Development

To run the system locally without Docker for development:

1. Install dependencies:
   ```
   npm install
   ```

2. Start the application in development mode:
   ```
   npm run dev
   ```

3. The application will be available at http://localhost:3000

## Components

### Azure Monitor Integration

The system integrates with Azure Monitor to collect metrics, logs, and alerts from Azure resources. Configuration files are located in `config/azure/`.

### Prometheus Setup

Prometheus is used for collecting and storing metrics from various sources. Configuration files are located in `config/prometheus/`.

### Grafana Dashboards

Pre-configured Grafana dashboards are provided for visualizing metrics and alerts. Dashboard definitions are located in `config/grafana/dashboards/`.

### AI Analytics with Ollama

The system uses Ollama to run AI models for trend analysis, anomaly detection, and predictive alerting. Models and configurations are located in `config/ollama/`.

## Project Structure

```
├── config/                 # Configuration files
│   ├── azure/              # Azure Monitor configuration
│   ├── grafana/            # Grafana dashboards and provisioning
│   ├── ollama/             # Ollama AI model configuration
│   └── prometheus/         # Prometheus configuration
├── docs/                   # Documentation
├── public/                 # Static files for the web UI
├── src/                    # Source code
│   ├── ai-integration/     # AI integration with Ollama
│   ├── alerting/           # Alert management system
│   ├── data-collectors/    # Data collection modules
│   │   ├── azure-monitor.js  # Azure Monitor integration
│   │   └── prometheus-collector.js # Prometheus collector
│   ├── data-processors/    # Data processing modules
│   ├── visualization/      # Visualization components
│   └── index.js            # Application entry point
├── .env.example            # Example environment variables
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose configuration
├── package.json            # Node.js dependencies
└── README.md               # Project documentation
```

## Deployment

### Docker Deployment

The easiest way to deploy the system is using Docker Compose:

```
docker-compose up -d
```

### Kubernetes Deployment

For production deployment on Kubernetes, refer to the [deployment guide](docs/deployment.md).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 