export interface Alert {
  id: string
  title: string
  description: string
  severity: "critical" | "warning" | "info"
  status: "active" | "acknowledged" | "resolved"
  resource: string
  time: string
}
