#!/usr/bin/env node

/**
 * This script extracts the architecture diagram from the Markdown file and generates an SVG image.
 * 
 * Usage: node scripts/generate-diagram.js
 * 
 * Requirements:
 * - Install mermaid-cli: npm install -g @mermaid-js/mermaid-cli
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function generateDiagram() {
  try {
    console.log('Reading architecture markdown file...');
    const markdownContent = await fs.readFile(
      path.join(process.cwd(), 'docs', 'system_architecture.md'),
      'utf8'
    );

    // Extract the diagram code between backticks
    const diagramMatch = markdownContent.match(/```([\s\S]*?)```/);
    
    if (!diagramMatch) {
      throw new Error('No diagram code found in the markdown file');
    }

    const diagramText = diagramMatch[1].trim();

    // Define the system architecture diagram using Mermaid syntax
    const diagram = `
graph TD
    %% Main Components
    UI[User Interface]
    API[API Server]
    AM[Google Cloud Monitoring]
    PR[Prometheus]
    GR[Grafana]
    AI[Ollama AI]
    DR[Data Repository]
    AM[Google Cloud Monitoring]
    
    %% Google Cloud Resources
    GC[Google Cloud]
    VM[GCE Instances]
    APP[App Engine]
    SQL[Cloud SQL]
    
    %% Process Components
    DP[Data Processors]
    AP[Alerting Pipeline]
    AE[Alert Evaluator]
    AR[Alert Router]
    NM[Notification Manager]
    MP[Metric Processors]
    
    %% Data Flow
    UI --> API
    API --> DR
    API --> DP
    
    %% Google Cloud Integration
    GC --> AM
    VM --> GC
    APP --> GC
    SQL --> GC
    AM --> DP
    
    %% Prometheus Integration
    PR --> DP
    
    %% Data Processing
    DP --> MP
    DP --> AP
    MP --> DR
    AP --> AE
    AE --> AR
    AR --> NM
    AR --> DR
    
    %% AI Integration
    DP --> AI
    AI --> MP
    AI --> AP
    
    %% Visualization
    DR --> GR
    GR --> UI
    
    %% Classes for styling
    classDef gcp fill:#e7f5fd,stroke:#4285F4,stroke-width:1px
    classDef ui fill:#f9f9f9,stroke:#999999,stroke-width:1px
    classDef processor fill:#f1f8e9,stroke:#8bc34a,stroke-width:1px
    classDef storage fill:#fffde7,stroke:#ffc107,stroke-width:1px
    classDef alert fill:#fbe9e7,stroke:#ff5722,stroke-width:1px
    
    %% Apply classes
    class UI,GR ui
    class DP,MP,AP processor
    class DR storage
    class AE,AR,NM alert
    class GC,VM,APP,SQL,AM gcp
`;

    // Create a temporary mermaid file
    console.log('Creating temporary mermaid file...');
    const mermaidFilePath = path.join(process.cwd(), 'temp-diagram.mmd');
    await fs.writeFile(mermaidFilePath, diagram);

    // Create the output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'public', 'images');
    await fs.mkdir(outputDir, { recursive: true });

    // Generate the SVG using mermaid-cli
    console.log('Generating SVG diagram...');
    try {
      await execAsync(`npx mmdc -i ${mermaidFilePath} -o ${path.join(outputDir, 'system_architecture.svg')} -t neutral`);
      console.log('Diagram generated successfully at public/images/system_architecture.svg');
    } catch (execError) {
      console.error('Error generating diagram. Make sure mermaid-cli is installed:', execError.message);
      console.log('You can install it with: npm install -g @mermaid-js/mermaid-cli');
    }

    // Clean up the temporary file
    await fs.unlink(mermaidFilePath);
    
    // Update the README.md to reference the SVG image
    console.log('Updating README.md to reference the SVG image...');
    const readmePath = path.join(process.cwd(), 'README.md');
    const readmeContent = await fs.readFile(readmePath, 'utf8');
    
    const updatedReadme = readmeContent.replace(
      '![System Architecture](docs/system_architecture.md)',
      '![System Architecture](/public/images/system_architecture.svg)'
    );
    
    await fs.writeFile(readmePath, updatedReadme);
    console.log('README.md updated successfully.');

  } catch (error) {
    console.error('Error generating diagram:', error.message);
    process.exit(1);
  }
}

generateDiagram().catch(console.error); 