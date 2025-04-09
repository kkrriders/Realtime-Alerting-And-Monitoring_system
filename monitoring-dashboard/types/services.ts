export interface Service {
  id: string
  name: string
  description: string
  status: "healthy" | "degraded" | "down"
  uptime: string
  performance: number
}
