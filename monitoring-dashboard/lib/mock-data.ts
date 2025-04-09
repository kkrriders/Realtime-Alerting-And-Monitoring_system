import type { Alert } from "@/types/alerts"
import type { Service } from "@/types/services"

// Generate time series data with random values
export function generateTimeSeriesData(start: Date, end: Date, options: { min: number; max: number; points?: number }) {
  const { min, max, points = 100 } = options
  const data = []
  const step = (end.getTime() - start.getTime()) / (points - 1)

  for (let i = 0; i < points; i++) {
    const timestamp = new Date(start.getTime() + step * i)
    const value = min + Math.random() * (max - min)
    data.push({ timestamp, value })
  }

  return data
}

// Generate time series data with anomalies
export function generateAnomalyData(
  start: Date,
  end: Date,
  options: {
    min: number
    max: number
    points?: number
    anomalyCount: number
    anomalyMagnitude: number
  },
) {
  const { min, max, points = 100, anomalyCount, anomalyMagnitude } = options
  const data = []
  const step = (end.getTime() - start.getTime()) / (points - 1)
  const anomalies = []

  // Generate anomaly positions
  const anomalyPositions = []
  for (let i = 0; i < anomalyCount; i++) {
    // Avoid anomalies at the very beginning or end
    const position = Math.floor(points * 0.2) + Math.floor(Math.random() * (points * 0.6))
    anomalyPositions.push(position)
  }

  for (let i = 0; i < points; i++) {
    const timestamp = new Date(start.getTime() + step * i)
    let value = min + Math.random() * (max - min)

    // Check if this is an anomaly point
    const isAnomaly = anomalyPositions.includes(i)
    if (isAnomaly) {
      const magnitude = anomalyMagnitude * (0.8 + Math.random() * 0.4) // Vary the magnitude slightly
      value = Math.min(100, value + magnitude) // Cap at 100%

      anomalies.push({
        timestamp: timestamp.getTime(),
        magnitude,
        confidence: 70 + Math.random() * 30, // Random confidence between 70-100%
      })
    }

    data.push({ timestamp, value })
  }

  return { data, anomalies }
}

// Mock alerts data
export const mockAlerts: Alert[] = [
  {
    id: "alert-1",
    title: "High CPU Usage",
    description: "CPU usage exceeded 90% threshold for more than 5 minutes",
    severity: "critical",
    status: "active",
    resource: "web-server-01",
    time: "10 minutes ago",
  },
  {
    id: "alert-2",
    title: "Memory Leak Detected",
    description: "Memory usage is increasing steadily without decreasing",
    severity: "warning",
    status: "active",
    resource: "api-service",
    time: "25 minutes ago",
  },
  {
    id: "alert-3",
    title: "Database Connection Failures",
    description: "Multiple failed connection attempts to primary database",
    severity: "critical",
    status: "acknowledged",
    resource: "db-cluster-main",
    time: "1 hour ago",
  },
  {
    id: "alert-4",
    title: "API Response Time Degradation",
    description: "API response time increased by 300% in the last hour",
    severity: "warning",
    status: "acknowledged",
    resource: "payment-api",
    time: "2 hours ago",
  },
  {
    id: "alert-5",
    title: "SSL Certificate Expiring",
    description: "SSL certificate will expire in 7 days",
    severity: "info",
    status: "resolved",
    resource: "www.example.com",
    time: "1 day ago",
  },
]

// Mock services data
export const mockServices: Service[] = [
  {
    id: "service-1",
    name: "Authentication Service",
    description: "Handles user authentication and authorization",
    status: "healthy",
    uptime: "99.99%",
    performance: 98,
  },
  {
    id: "service-2",
    name: "Payment Processing",
    description: "Processes customer payments and transactions",
    status: "degraded",
    uptime: "98.5%",
    performance: 76,
  },
  {
    id: "service-3",
    name: "Data Storage",
    description: "Primary database and storage services",
    status: "healthy",
    uptime: "99.95%",
    performance: 94,
  },
  {
    id: "service-4",
    name: "API Gateway",
    description: "Routes and manages API requests",
    status: "down",
    uptime: "95.2%",
    performance: 32,
  },
  {
    id: "service-5",
    name: "Analytics Engine",
    description: "Processes and analyzes user and system data",
    status: "healthy",
    uptime: "99.7%",
    performance: 91,
  },
]
