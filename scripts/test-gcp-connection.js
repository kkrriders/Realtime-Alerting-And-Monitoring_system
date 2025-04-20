#!/usr/bin/env node

/**
 * Script to test Google Cloud Monitoring connection 
 * 
 * Usage: node scripts/test-gcp-connection.js
 */

import 'dotenv/config';
import { Monitoring } from '@google-cloud/monitoring';

async function testGcpConnection() {
  try {
    console.log('Initializing Google Cloud Monitoring client...');
    
    // Create the monitoring client
    const client = new Monitoring.MetricServiceClient();
    
    // Get the project ID from environment variables
    const projectId = process.env.GCP_PROJECT_ID;
    
    if (!projectId) {
      throw new Error('GCP_PROJECT_ID environment variable is not set');
    }
    
    console.log(`Attempting to connect to Google Cloud Monitoring for project: ${projectId}`);
    
    // Try to list metric descriptors as a simple connection test
    const [descriptors] = await client.listMetricDescriptors({
      name: `projects/${projectId}`,
      filter: 'metric.type="compute.googleapis.com/instance/cpu/utilization"'
    });
    
    console.log(`Connection successful! Found ${descriptors.length} metric descriptors.`);
    
    if (descriptors.length > 0) {
      const firstDescriptor = descriptors[0];
      console.log('Sample metric descriptor:');
      console.log(`- Name: ${firstDescriptor.name}`);
      console.log(`- Type: ${firstDescriptor.type}`);
      console.log(`- Display name: ${firstDescriptor.displayName}`);
      console.log(`- Description: ${firstDescriptor.description}`);
      console.log(`- Unit: ${firstDescriptor.unit || 'None'}`);
    }
    
    console.log('\nGCP connection test completed successfully!');
  } catch (error) {
    console.error('Error connecting to Google Cloud Monitoring:');
    console.error(error);
    
    if (error.message.includes('PERMISSION_DENIED')) {
      console.log('\nTips for fixing permission issues:');
      console.log('1. Make sure your service account has the "Monitoring Viewer" role or higher');
      console.log('2. Check that your service account key is valid and correctly formatted in .env');
      console.log('3. Verify that GCP_PROJECT_ID is correct');
    }
    
    process.exit(1);
  }
}

testGcpConnection().catch(console.error); 