# API Documentation

This document describes the REST API endpoints exposed by the Real-Time Alerting and Monitoring System.

## Base URL

All API endpoints are relative to the base URL of your deployment:

```
http://localhost:3000/api
```

## Authentication

Most API endpoints require authentication. Include an Authorization header with a valid token:

```
Authorization: Bearer <your-token>
```

## Endpoints

### Health Check

#### `GET /health`

Check if the service is running properly.

**Authorization:** None required

**Response:**

```json
{
  "status": "healthy"
}
```

### Metrics

#### `GET /metrics`

Get Prometheus metrics.

**Authorization:** None required

**Response:** Plain text Prometheus metrics

### Alerts

#### `GET /api/alerts`

Get all active alerts.

**Authorization:** Required

**Query Parameters:**

- `severity` - Filter by severity (info, warning, error, critical)
- `type` - Filter by alert type
- `limit` - Limit number of results (default: 100)
- `offset` - Offset for pagination (default: 0)

**Response:**

```json
{
  "alerts": [
    {
      "id": "alert-123",
      "name": "High CPU Usage",
      "description": "CPU usage is above threshold",
      "severity": "warning",
      "status": "active",
      "createdAt": "2023-03-15T14:30:45Z",
      "resourceId": "server-001",
      "resourceType": "vm",
      "value": 92.5,
      "threshold": 80
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

#### `GET /api/alerts/:id`

Get details of a specific alert.

**Authorization:** Required

**Path Parameters:**

- `id` - Alert ID

**Response:**

```json
{
  "id": "alert-123",
  "name": "High CPU Usage",
  "description": "CPU usage is above threshold",
  "severity": "warning",
  "status": "active",
  "createdAt": "2023-03-15T14:30:45Z",
  "resourceId": "server-001",
  "resourceType": "vm",
  "value": 92.5,
  "threshold": 80,
  "history": [
    {
      "timestamp": "2023-03-15T14:30:45Z",
      "status": "active",
      "value": 92.5
    }
  ]
}
```

#### `POST /api/alerts/:id/acknowledge`

Acknowledge an alert.

**Authorization:** Required

**Path Parameters:**

- `id` - Alert ID

**Request Body:**

```json
{
  "comment": "Investigating the issue"
}
```

**Response:**

```json
{
  "id": "alert-123",
  "status": "acknowledged",
  "acknowledgedAt": "2023-03-15T15:05:10Z",
  "acknowledgedBy": "user@example.com",
  "comment": "Investigating the issue"
}
```

#### `POST /api/alerts/:id/resolve`

Resolve an alert.

**Authorization:** Required

**Path Parameters:**

- `id` - Alert ID

**Request Body:**

```json
{
  "resolution": "Restarted the service",
  "rootCause": "Memory leak in application"
}
```

**Response:**

```json
{
  "id": "alert-123",
  "status": "resolved",
  "resolvedAt": "2023-03-15T16:20:30Z",
  "resolvedBy": "user@example.com",
  "resolution": "Restarted the service",
  "rootCause": "Memory leak in application"
}
```

### AI Insights

#### `GET /api/insights`

Get AI-generated insights.

**Authorization:** Required

**Query Parameters:**

- `type` - Type of insights (anomaly, trend, recommendation)
- `resourceType` - Type of resource (cpu, memory, network, etc.)
- `limit` - Limit number of results (default: 10)

**Response:**

```json
{
  "insights": [
    {
      "id": "insight-456",
      "type": "anomaly",
      "description": "Unusual spike in memory usage detected",
      "createdAt": "2023-03-15T12:10:20Z",
      "confidence": 0.85,
      "resourceId": "server-002",
      "resourceType": "memory",
      "relatedAlerts": ["alert-789"]
    }
  ],
  "total": 1
}
```

#### `GET /api/insights/:id`

Get details of a specific insight.

**Authorization:** Required

**Path Parameters:**

- `id` - Insight ID

**Response:**

```json
{
  "id": "insight-456",
  "type": "anomaly",
  "description": "Unusual spike in memory usage detected",
  "createdAt": "2023-03-15T12:10:20Z",
  "confidence": 0.85,
  "resourceId": "server-002",
  "resourceType": "memory",
  "details": {
    "anomalyScore": 0.92,
    "expectedValue": 45.3,
    "actualValue": 87.6,
    "analysisMethod": "isolation-forest"
  },
  "relatedAlerts": ["alert-789"],
  "recommendations": [
    "Check for memory leaks in applications running on this server",
    "Consider increasing memory allocation if workload has increased"
  ]
}
```

### Metrics and Monitoring

#### `GET /api/metrics/query`

Query metrics data.

**Authorization:** Required

**Query Parameters:**

- `query` - Prometheus or Azure Monitor query
- `start` - Start time (ISO 8601)
- `end` - End time (ISO 8601)
- `step` - Time step for data points
- `source` - Data source (prometheus, azure)

**Response:**

```json
{
  "status": "success",
  "data": {
    "resultType": "matrix",
    "result": [
      {
        "metric": {
          "__name__": "system_cpu_usage",
          "core": "core-0"
        },
        "values": [
          [1678891845, "75.2"],
          [1678892145, "78.5"],
          [1678892445, "82.1"]
        ]
      }
    ]
  }
}
```

## Error Responses

All API endpoints return appropriate HTTP status codes:

- `200 OK` - The request was successful
- `400 Bad Request` - The request was invalid
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Not authorized to access the resource
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error response body:

```json
{
  "error": {
    "code": "resource_not_found",
    "message": "Alert with ID 'alert-999' not found",
    "details": {
      "resourceType": "alert",
      "resourceId": "alert-999"
    }
  }
}
``` 