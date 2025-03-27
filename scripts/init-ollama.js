#!/usr/bin/env node

/**
 * Ollama Model Initialization Script
 * 
 * This script initializes Ollama by ensuring required models are pulled and available.
 * Run this script before starting the application to ensure all AI models are ready.
 * 
 * Usage: 
 *   node scripts/init-ollama.js
 * 
 * Environment variables:
 *   OLLAMA_BASE_URL - Base URL for Ollama API (default: http://localhost:11434)
 *   OLLAMA_TIMEOUT - Timeout for Ollama API requests in ms (default: 300000 - 5 minutes)
 */

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT || '300000');
const CONFIG_PATH = path.join(process.cwd(), 'config', 'ollama', 'config.json');

// Define required model mappings for fallbacks
const MODEL_MAPPINGS = {
  'llama2': ['llama2', 'llama2:latest'],
  'llama2:13b': ['llama2:13b', 'llama2:latest'],
  'mistral': ['mistral', 'mistral:latest', 'mistral:7b', 'llama2'],
  'orca-mini': ['orca-mini', 'orca-mini:latest', 'llama2']
};

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Initializing Ollama models...');
    
    // Load configuration
    const config = await loadConfiguration();
    
    // Check Ollama availability
    await checkOllamaAvailability();
    
    // Get required models from config
    const requiredModels = getRequiredModelsFromConfig(config);
    
    // Check and pull required models
    await ensureModelsAvailable(requiredModels);
    
    console.log('✅ Ollama initialization complete. All required models are available.');
  } catch (error) {
    console.error('❌ Ollama initialization failed:', error.message);
    process.exit(1);
  }
}

/**
 * Load configuration from file
 */
async function loadConfiguration() {
  try {
    const fileData = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(fileData);
    console.log('📝 Loaded configuration from file');
    return config;
  } catch (error) {
    console.warn('⚠️ Failed to load configuration from file, using defaults');
    return {
      baseUrl: OLLAMA_BASE_URL,
      models: {
        anomalyDetection: 'llama2',
        trendAnalysis: 'llama2',
        recommendationEngine: 'llama2'
      }
    };
  }
}

/**
 * Check if Ollama is available
 */
async function checkOllamaAvailability() {
  try {
    console.log(`🔍 Checking Ollama availability at ${OLLAMA_BASE_URL}...`);
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 10000 });
    
    if (response.status === 200) {
      const modelCount = response.data.models?.length || 0;
      console.log(`✅ Ollama is available. Found ${modelCount} existing models.`);
      return true;
    } else {
      throw new Error(`Unexpected status code: ${response.status}`);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error(`Cannot connect to Ollama at ${OLLAMA_BASE_URL}. Please ensure Ollama is running.`);
    }
    throw new Error(`Ollama check failed: ${error.message}`);
  }
}

/**
 * Get required models from config
 */
function getRequiredModelsFromConfig(config) {
  const uniqueModels = new Set();
  
  // Add models from configuration
  Object.values(config.models || {}).forEach(model => {
    uniqueModels.add(model);
  });
  
  // If no models are configured, add default model
  if (uniqueModels.size === 0) {
    uniqueModels.add('llama2');
  }
  
  return Array.from(uniqueModels);
}

/**
 * Ensure all required models are available
 */
async function ensureModelsAvailable(requiredModels) {
  try {
    // Get available models
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 10000 });
    const availableModels = response.data.models?.map(model => model.name) || [];
    
    console.log(`📋 Available models: ${availableModels.join(', ') || 'none'}`);
    console.log(`📋 Required models: ${requiredModels.join(', ')}`);
    
    // Check each required model
    for (const model of requiredModels) {
      if (isModelAvailable(model, availableModels)) {
        console.log(`✅ Model ${model} is available`);
      } else {
        console.log(`⏳ Model ${model} is not available. Attempting to pull...`);
        await pullModel(model);
      }
    }
  } catch (error) {
    throw new Error(`Failed to ensure models are available: ${error.message}`);
  }
}

/**
 * Check if a model is available
 */
function isModelAvailable(model, availableModels) {
  // Check exact match
  if (availableModels.includes(model)) {
    return true;
  }
  
  // Check for equivalent models
  const equivalents = MODEL_MAPPINGS[model] || [model];
  return equivalents.some(m => availableModels.includes(m));
}

/**
 * Pull a model from Ollama
 */
async function pullModel(model) {
  try {
    console.log(`⏳ Pulling model ${model}. This may take some time...`);
    
    // Start the pull
    const pullResponse = await axios.post(
      `${OLLAMA_BASE_URL}/api/pull`,
      { name: model },
      { 
        timeout: OLLAMA_TIMEOUT,
        responseType: 'stream'
      }
    );
    
    // For stream response, just wait for it to complete
    return new Promise((resolve, reject) => {
      let lastPercentage = 0;
      let responseData = '';
      
      pullResponse.data.on('data', (chunk) => {
        try {
          responseData += chunk.toString();
          // Try to parse progress information
          const lines = responseData.split('\n');
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              const update = JSON.parse(line);
              
              if (update.status && update.completed && update.total) {
                const percentage = Math.round((update.completed / update.total) * 100);
                
                if (percentage % 10 === 0 && percentage !== lastPercentage) {
                  console.log(`📥 Pulling ${model}: ${percentage}% complete`);
                  lastPercentage = percentage;
                }
              }
            } catch (e) {
              // JSON parse error - ignore incomplete JSON
            }
          }
          
          // Reset response data keeping only the last potentially incomplete line
          const lastNewlineIndex = responseData.lastIndexOf('\n');
          if (lastNewlineIndex !== -1) {
            responseData = responseData.substring(lastNewlineIndex + 1);
          }
        } catch (error) {
          // Ignore errors parsing the progress
        }
      });
      
      pullResponse.data.on('end', () => {
        console.log(`✅ Model ${model} pulled successfully`);
        resolve();
      });
      
      pullResponse.data.on('error', (error) => {
        reject(new Error(`Error pulling model ${model}: ${error.message}`));
      });
    });
  } catch (error) {
    // Check if the model is already available despite pull error
    try {
      const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 10000 });
      const availableModels = response.data.models?.map(model => model.name) || [];
      
      if (availableModels.includes(model)) {
        console.log(`✅ Model ${model} is already available despite pull error`);
        return;
      }
    } catch (e) {
      // Ignore error checking availability
    }
    
    throw new Error(`Failed to pull model ${model}: ${error.message}`);
  }
}

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
}); 