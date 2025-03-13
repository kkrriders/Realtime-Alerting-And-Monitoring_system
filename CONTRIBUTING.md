# Contributing to the Real-Time Alerting and Monitoring System

Thank you for your interest in contributing to this project! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with the following information:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected and actual behavior
- Screenshots if applicable
- Any relevant logs or error messages

### Feature Requests

We welcome feature requests! Please create an issue with:
- A clear, descriptive title
- Detailed description of the proposed feature
- Any relevant mockups or examples
- Why this feature would be beneficial

### Pull Requests

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Commit your changes: `git commit -m 'Add some feature'`
7. Push to the branch: `git push origin feature/your-feature-name`
8. Submit a pull request

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`
4. Run the development server: `npm run dev`

## Project Structure

Please maintain the existing project structure:
- `/config` - Configuration files
- `/docs` - Documentation
- `/public` - Static files
- `/src` - Source code
  - `/ai-integration` - AI integration modules
  - `/alerting` - Alert management
  - `/data-collectors` - Data collection modules
  - `/data-processors` - Data processing logic

## Coding Standards

- Follow the ESLint and Prettier configurations
- Write meaningful commit messages
- Include comments for complex logic
- Write tests for new features
- Update documentation as needed

## Testing

- All new features should include tests
- Run `npm test` to execute the test suite
- Aim for good test coverage

## Documentation

- Update the README.md when adding new features
- Document API endpoints, configuration options, etc.
- Provide examples where appropriate

## Questions?

If you have questions about contributing, please create an issue labeled 'question'.

Thank you for contributing! 