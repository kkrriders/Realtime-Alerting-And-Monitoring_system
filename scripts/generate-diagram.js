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

    // Create a temporary mermaid file
    console.log('Creating temporary mermaid file...');
    const mermaidContent = `
graph TD
    %% Data Collection Layer
    DCL[Data Collection Layer]
    PC[Prometheus Collector]
    AM[Azure Monitor]
    DCL --> PC
    DCL --> AM

    %% Azure Resources
    AR[Azure Resources]
    AS[App Services]
    VMs[VMs]
    AR --> AS
    AR --> VMs
    PC -.REST API.- AR
    AM -.REST API.- AR

    %% Data Processing Layer
    DPL[Data Processing Layer]
    SP[Stream Processing]
    BP[Batch Processing]
    AI[AI/ML Processing]
    DPL --> SP
    DPL --> BP
    DPL --> AI
    PC --> DPL
    AM --> DPL

    %% Ollama AI
    OAI[Ollama AI Models]
    AD[Anomaly Detection]
    TA[Trend Analysis]
    RE[Recommendation]
    OAI --> AD
    OAI --> TA
    OAI --> RE
    AI --> OAI

    %% Alerting Layer
    AL[Alerting Layer]
    RBA[Rule-based Alerts]
    ADA[AI-driven Anomalies]
    ALM[Alert Management]
    AL --> RBA
    AL --> ADA
    AL --> ALM
    DPL --> AL

    %% Visualization Layer
    VL[Visualization Layer]
    GD[Grafana Dashboards]
    CUI[Custom UI]
    HA[Historical Analysis]
    VL --> GD
    VL --> CUI
    VL --> HA
    AL --> VL

    %% Styling
    classDef layer fill:#f9f9f9,stroke:#333,stroke-width:2px
    classDef component fill:#e1f5fe,stroke:#0288d1,stroke-width:1px
    classDef azure fill:#e3f2fd,stroke:#1976d2,stroke-width:1px
    classDef ai fill:#f3e5f5,stroke:#9c27b0,stroke-width:1px

    class DCL,DPL,AL,VL layer
    class PC,AM,SP,BP,RBA,ADA,ALM,GD,CUI,HA component
    class AR,AS,VMs azure
    class AI,OAI,AD,TA,RE ai
`;

    const mermaidFilePath = path.join(process.cwd(), 'temp-diagram.mmd');
    await fs.writeFile(mermaidFilePath, mermaidContent);

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