export type DashboardLayout = "grid" | "list" | "custom"

export interface DashboardConfig {
  id: string
  name: string
  description?: string
  layout: DashboardLayout
  refreshRate: string
  defaultTimeRange: string
  widgets: DashboardWidget[]
  createdAt: Date
  updatedAt: Date
  createdBy: string
  isDefault?: boolean
  tags?: string[]
}

export interface DashboardWidget {
  id: string
  type: "metric" | "alert" | "service" | "anomaly" | "custom"
  title: string
  description?: string
  position: {
    x: number
    y: number
    w: number
    h: number
  }
  config: any // This would be more specific based on widget type
}
