import type { TimeSeriesDataPoint } from "@/types/metrics"

/**
 * Downsample time series data to a specified number of points
 * using the Largest-Triangle-Three-Buckets algorithm
 */
export function downsampleTimeSeries(data: TimeSeriesDataPoint[], targetPoints: number): TimeSeriesDataPoint[] {
  if (data.length <= targetPoints) return data

  // Sort data by timestamp if not already sorted
  const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  // Always include first and last points
  const result: TimeSeriesDataPoint[] = [sortedData[0]]

  // Bucket size
  const bucketSize = (sortedData.length - 2) / (targetPoints - 2)

  for (let i = 0; i < targetPoints - 2; i++) {
    const bucketStart = Math.floor(i * bucketSize) + 1
    const bucketEnd = Math.floor((i + 1) * bucketSize) + 1

    // Find point with maximum value in this bucket
    let maxPoint = sortedData[bucketStart]
    for (let j = bucketStart; j < bucketEnd; j++) {
      if (sortedData[j].value > maxPoint.value) {
        maxPoint = sortedData[j]
      }
    }

    result.push(maxPoint)
  }

  // Add the last point
  result.push(sortedData[sortedData.length - 1])

  return result
}

/**
 * Calculate appropriate data resolution based on time range
 */
export function calculateResolution(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours <= 3) return "1m" // 1 minute resolution for <= 3 hours
  if (diffHours <= 24) return "5m" // 5 minute resolution for <= 24 hours
  if (diffHours <= 72) return "15m" // 15 minute resolution for <= 3 days
  if (diffHours <= 168) return "1h" // 1 hour resolution for <= 7 days
  return "1d" // 1 day resolution for > 7 days
}
