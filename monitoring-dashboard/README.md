# Real-time Monitoring Dashboard

A Next.js-based dashboard for real-time monitoring and alerting, designed to work with the Realtime-Alerting-And-Monitoring system.

## Features

- Real-time metrics visualization
- Alert management
- AI-driven insights
- WebSocket support for live updates
- Configurable backend connection

## Setup

### Prerequisites

- Node.js 16.x or later
- NPM or Yarn
- A running backend API service (optional, can use mock data)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
cd monitoring-dashboard
npm install
# or
yarn install
```

3. Start the development server:

```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration

The dashboard can use either mock data (simulated locally) or connect to a real backend API. Configuration is managed in `lib/config.ts`.

### Using Mock Data

By default, the dashboard uses mock data for development. No additional configuration is needed.

### Connecting to the Backend

To connect to the real backend:

1. Edit the `.env.local` file (create if it doesn't exist):

```
NEXT_PUBLIC_API_BASE_URL=http://your-backend-server:port/api
NEXT_PUBLIC_WS_URL=ws://your-backend-server:port/ws
```

2. Set `USE_MOCK_DATA` to `false` in `lib/config.ts`:

```typescript
export const USE_MOCK_DATA = false;
```

## Backend API Requirements

The dashboard expects the following API endpoints:

### REST Endpoints

- `GET /api/metrics` - Get current metric values
- `GET /api/metrics/history` - Get historical metric data
- `GET /api/alerts` - Get alerts (supports `?status=active|acknowledged|resolved`)
- `GET /api/insights` - Get AI-generated insights
- `GET /api/stats` - Get dashboard summary statistics
- `GET /api/dashboard/all` - Get all data in a single request

### WebSocket

The dashboard expects a WebSocket server at the configured URL that sends messages in the following format:

```typescript
{
  type: 'metric-update' | 'alert-update' | 'insight-update',
  data: MetricData | AlertData | AIInsight,
  timestamp: number // milliseconds since epoch
}
```

## Development

### Project Structure

- `components/` - React components for the dashboard
- `context/` - React context providers
- `hooks/` - Custom React hooks
- `lib/` - Utility functions and configuration
- `pages/` - Next.js pages
- `pages/api/` - Mock API endpoints (for development)
- `public/` - Static assets
- `styles/` - Global CSS
- `types/` - TypeScript type definitions

### Adding New Components

Place new components in the `components/` directory. Use the existing components as a reference for styling and structure.

### Modifying API Integration

1. Update the relevant types in `types/metrics.ts`
2. Add or modify API endpoints in `lib/config.ts`
3. Update the data fetching logic in `hooks/useRealTimeUpdates.ts`

## Building for Production

```bash
npm run build
# or
yarn build
```

## License

MIT 