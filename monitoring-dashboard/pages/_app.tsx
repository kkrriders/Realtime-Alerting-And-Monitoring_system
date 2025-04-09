import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { MonitoringProvider } from '@/context/MonitoringContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MonitoringProvider initialData={pageProps.initialMonitoringData}>
      <Component {...pageProps} />
    </MonitoringProvider>
  );
} 