import React from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import DashboardHeader from '@/components/DashboardHeader';
import MetricsPanel from '@/components/MetricsPanel';
import AlertsPanel from '@/components/AlertsPanel';
import InsightsPanel from '@/components/InsightsPanel';
import { MetricData, AlertData, AIInsight, DashboardStats } from '@/types/metrics';
import { getEndpoint, USE_MOCK_DATA } from '@/lib/config';

interface HomeProps {
  initialMonitoringData: {
    metrics: MetricData[];
    alerts: AlertData[];
    insights: AIInsight[];
    stats: DashboardStats;
  };
}

export default function Home({ initialMonitoringData }: HomeProps) {
  return (
    <>
      <Head>
        <title>System Monitoring Dashboard</title>
        <meta name="description" content="Real-time alerting and monitoring system" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <DashboardHeader />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <MetricsPanel />
            </div>
            <div>
              <AlertsPanel />
            </div>
          </div>
          
          <div className="mb-6">
            <InsightsPanel />
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  // Default empty stats object
  const defaultStats: DashboardStats = {
    activeAlertCount: 0,
    acknowledgedAlertCount: 0,
    totalAlertCount: 0,
    avgCpuUsage: 0,
    avgMemoryUsage: 0,
    topConsumingServices: [],
    systemHealth: 'healthy',
    lastUpdated: Date.now()
  };
  
  try {
    // Get the appropriate endpoint from config
    const endpoint = getEndpoint('ALL');
    
    // Create absolute URL for API calls if needed
    let fullUrl = endpoint;
    
    // For mock data in development, we need to create the full URL
    if (USE_MOCK_DATA && process.env.NODE_ENV !== 'production' && endpoint.startsWith('/api')) {
      const protocol = 'http';
      const host = process.env.VERCEL_URL || 'localhost:3000';
      fullUrl = `${protocol}://${host}${endpoint}`;
    }
    
    // Fetch initial data
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      props: {
        initialMonitoringData: {
          metrics: data.metrics || [],
          alerts: data.alerts || [],
          insights: data.insights || [],
          stats: data.stats || defaultStats,
        }
      }
    };
  } catch (error) {
    console.error('Error fetching initial data:', error);
    
    // Return empty data if there's an error
    return {
      props: {
        initialMonitoringData: {
          metrics: [],
          alerts: [],
          insights: [],
          stats: defaultStats
        }
      }
    };
  }
}; 