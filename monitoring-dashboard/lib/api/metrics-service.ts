import type { TimeSeriesDataPoint } from "@/types/metrics"
import { generateTimeSeriesData } from "../mock-data"

// In a real implementation, this would fetch from your metrics API
export async function fetchMetricData(
  metricName: string,
  start: Date,
  end: Date,
  resolution?: string,
): Promise<TimeSeriesDataPoint[]> {
  // For demo purposes, we're using mock data
  // In production, this would be replaced with actual API calls
  try {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // In a real implementation, this would be:
    // const response = await fetch(`/api/metrics/${metricName}?start=${start.toISOString()}&end=${end.toISOString()}&resolution=${resolution}`)
    // if (!response.ok) throw new Error(`Failed to fetch ${metricName} data: ${response.statusText}`)
    // return await response.json()

    return generateTimeSeriesData(start, end, {
      min: metricName.includes("cpu") ? 10 : 30,
      max: metricName.includes("cpu") ? 90 : 80,
    })
  } catch (error) {
    console.error(`Error fetching ${metricName} data:`, error)
    throw error
  }
}

export async function fetchAllSystemMetrics(
  start: Date,
  end: Date,
): Promise<{
  cpu: TimeSeriesDataPoint[]
  memory: TimeSeriesDataPoint[]
  network: TimeSeriesDataPoint[]
  disk: TimeSeriesDataPoint[]
}> {
  try {
    const [cpu, memory, network, disk] = await Promise.all([
      fetchMetricData("cpu", start, end),
      fetchMetricData("memory", start, end),
      fetchMetricData("network", start, end),
      fetchMetricData("disk", start, end),
    ])

    return { cpu, memory, network, disk }
  } catch (error) {
    console.error("Error fetching system metrics:", error)
    throw error
  }
}
