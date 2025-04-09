import { render, screen } from "@testing-library/react"
import { MetricCard } from "@/components/metrics/metric-card"

describe("MetricCard", () => {
  test("renders the metric title and value", () => {
    render(<MetricCard title="CPU Usage" value="68%" trend="up" trendValue="+12%" status="warning" />)

    expect(screen.getByText("CPU Usage")).toBeInTheDocument()
    expect(screen.getByText("68%")).toBeInTheDocument()
  })

  test("displays correct status indicator for warning state", () => {
    render(<MetricCard title="CPU Usage" value="68%" trend="up" trendValue="+12%" status="warning" />)

    expect(screen.getByText("Warning")).toBeInTheDocument()
  })

  test("displays correct trend indicator for upward trend", () => {
    render(<MetricCard title="CPU Usage" value="68%" trend="up" trendValue="+12%" status="warning" />)

    expect(screen.getByText("+12% from previous period")).toBeInTheDocument()
  })
})
