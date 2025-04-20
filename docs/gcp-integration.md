# Google Cloud Platform Integration Guide

This guide explains how to set up and use Google Cloud Platform (GCP) with the Real-Time Alerting and Monitoring System.

## Prerequisites

1. A Google Cloud Platform account
2. A GCP project with the following APIs enabled:
   - Cloud Monitoring API
   - Cloud Logging API
   - Compute Engine API (if monitoring Compute Engine instances)
   - App Engine API (if monitoring App Engine services)
   - Cloud SQL API (if monitoring Cloud SQL databases)

## Service Account Setup

1. **Create a Service Account**:
   - Go to the [GCP Console](https://console.cloud.google.com/)
   - Navigate to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Enter a name and description
   - Click "Create and Continue"

2. **Assign Required Roles**:
   - Monitoring Viewer: For reading metrics
   - Monitoring Editor: For writing metrics
   - Logs Viewer: For reading logs
   - (Optional) Additional roles based on resources you need to monitor

3. **Create and Download Service Account Key**:
   - Click on the newly created service account
   - Go to the "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose JSON format
   - Click "Create" to download the key file

## Environment Configuration

Add the following to your `.env` file:

```
# Google Cloud Configuration
GCP_PROJECT_ID=your-project-id
GCP_CLIENT_EMAIL=your-service-account-email
GCP_PRIVATE_KEY=your-service-account-key
GCP_MONITORING_SCOPES=https://www.googleapis.com/auth/monitoring.read

# Google Cloud Resources
GCP_INSTANCE_ID=your-instance-id
GCP_APP_ENGINE_SERVICE=your-app-engine-service
GCP_SQL_INSTANCE_ID=your-cloud-sql-instance-id
GCP_FUNCTION_NAME=your-function-name
```

**Important Notes**:

1. For `GCP_PRIVATE_KEY`, copy the entire private key from your JSON file including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines, making sure to escape any newlines with `\n`.

2. For resource IDs:
   - `GCP_INSTANCE_ID`: Your Compute Engine instance ID (e.g., "1234567890123456789")
   - `GCP_APP_ENGINE_SERVICE`: App Engine service name (e.g., "default")
   - `GCP_SQL_INSTANCE_ID`: Cloud SQL instance ID (e.g., "project:region:instance-name")

## Testing the Connection

Run the connection test script:

```bash
npm run test:gcp
```

This will verify that your service account has the necessary permissions and can connect to Google Cloud Monitoring.

## Available Metrics

The system collects metrics for the following GCP resources:

### Compute Engine Instances

- CPU Utilization
- Memory Usage
- Disk Operations
- Network Traffic

### App Engine Applications

- Response Latency
- Instance Count
- Memory Usage
- Request Count

### Cloud SQL Databases

- CPU Utilization
- Memory Utilization
- Disk Utilization
- Connections

## Customizing GCP Monitoring

You can customize metrics collection by editing `config/gcp/gcp-monitoring-config.json`:

- Add new resource types to monitor
- Define additional metrics to collect
- Configure scheduled queries
- Set up custom alert thresholds

## Grafana Integration

The system includes a pre-configured Google Cloud Monitoring data source for Grafana. To use it:

1. Log in to Grafana (default: http://localhost:3001)
2. Go to Dashboards > Browse
3. Look for the "Google Cloud" folder
4. Select any of the pre-configured dashboards

## Troubleshooting

### Common Issues:

1. **Permission Denied Errors**:
   - Verify your service account has the necessary roles
   - Check that the project ID is correct
   - Ensure your service account key is valid and correctly formatted

2. **No Metrics Found**:
   - Confirm that the resources you want to monitor exist in your project
   - Check that the resource IDs in your `.env` file are correct
   - Verify that the metrics are being generated (some metrics only appear when the resources are active)

3. **Authentication Errors**:
   - Check that `GCP_CLIENT_EMAIL` matches the email in your service account key file
   - Ensure `GCP_PRIVATE_KEY` is properly formatted with escaped newlines
   - Verify that the service account key hasn't been revoked

For detailed logs, check the `logs/gcp-monitoring.log` file.

## Additional Resources

- [Google Cloud Monitoring Documentation](https://cloud.google.com/monitoring/docs)
- [Available Metrics for Google Cloud](https://cloud.google.com/monitoring/api/metrics_gcp)
- [Grafana Google Cloud Data Source](https://grafana.com/grafana/plugins/grafana-googlecloud-datasource/) 