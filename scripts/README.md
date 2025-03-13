# Utility Scripts

This directory contains utility scripts for the Real-Time Alerting and Monitoring System.

## Available Scripts

### `generate-diagram.js`

Generates SVG diagrams from the architecture markdown files.

Usage:
```
npm run generate-diagram
```

This script:
1. Reads the architecture markdown file in `docs/system_architecture.md`
2. Extracts the diagram code
3. Generates an SVG diagram using mermaid-cli
4. Saves the diagram to `public/images/system_architecture.svg`
5. Updates the main README.md to reference the SVG image

### `utils/data-migration.js`

Utility for migrating data between different monitoring systems.

Usage:
```
# Export data from Prometheus
node scripts/utils/data-migration.js export --source prometheus --query "up" --start "2023-01-01T00:00:00Z" --end "2023-01-02T00:00:00Z" --output data.json

# Import data into Prometheus
node scripts/utils/data-migration.js import --target prometheus --input data.json

# Convert data from one format to another
node scripts/utils/data-migration.js convert --from azure --to prometheus --input azure-data.json --output prometheus-data.json
```

## Adding New Scripts

When adding new scripts to this directory:

1. Make sure the script is executable with proper permissions
2. Add appropriate comments and documentation within the script
3. Update this README with usage instructions
4. For commonly used scripts, add an npm script entry in package.json

## Best Practices

- Use ES modules for all new scripts (import/export)
- Include comprehensive error handling
- Add appropriate logging
- Write scripts to be cross-platform compatible
- Include usage documentation at the top of each script 