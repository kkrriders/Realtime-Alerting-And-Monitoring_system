import alertManager from './src/alerts/alert-manager.js';

// Sample metrics for testing
const sampleCpuMetrics = {
  system_cpu_usage: 85, // Will trigger our CPU rule
  cpu: {
    usage: 85,
    cores: [
      { core: "0", usage: 90 },
      { core: "1", usage: 78 },
      { core: "2", usage: 82 },
      { core: "3", usage: 88 }
    ],
    temperature: 65
  }
};

const sampleMemoryMetrics = {
  system_memory_usage_percent: 92, // Will trigger our memory rule
  memory: {
    total: 16384,
    used: 15073,
    free: 1311,
    swap: {
      total: 8192,
      used: 2048
    }
  }
};

// Initialize and start the system
async function startSystem() {
  try {
    console.log("Starting Real-Time Alerting and Monitoring System...");
    
    // Initialize the alert manager
    await alertManager.initialize();
    
    console.log("Alert manager initialized successfully");
    console.log("WebSocket server running on port 3002");
    
    // Register event listeners
    alertManager.on('alert', (alert) => {
      console.log(`🔔 Alert triggered: ${alert.ruleName} (${alert.severity})`);
    });
    
    alertManager.on('alert_resolved', (alert) => {
      console.log(`✅ Alert resolved: ${alert.ruleName}`);
    });
    
    alertManager.on('alert_patterns', (patterns) => {
      console.log(`📊 Detected ${patterns.patterns.length} alert patterns`);
    });
    
    // Send test metrics after 3 seconds
    setTimeout(() => {
      console.log("\n--- Sending CPU test metrics ---");
      alertManager.processMetrics(sampleCpuMetrics, 'prometheus');
    }, 3000);
    
    // Send memory metrics after 6 seconds
    setTimeout(() => {
      console.log("\n--- Sending Memory test metrics ---");
      alertManager.processMetrics(sampleMemoryMetrics, 'prometheus');
    }, 6000);
    
    // Resolve CPU alert after 10 seconds (by sending normal values)
    setTimeout(() => {
      console.log("\n--- Sending normal CPU metrics (should resolve alert) ---");
      alertManager.processMetrics({
        system_cpu_usage: 45,
        cpu: { usage: 45 }
      }, 'prometheus');
    }, 10000);
    
    console.log("System started successfully. Sending test metrics shortly...");
  } catch (error) {
    console.error("Failed to start system:", error);
  }
}

// Start the system
startSystem(); 