import { spawn } from 'child_process';
import chalk from 'chalk';

// Configuration
const BACKEND_DIR = './';
const BACKEND_CMD = 'npm';
const BACKEND_ARGS = ['run', 'dev'];

const FRONTEND_DIR = './monitoring-dashboard';
const FRONTEND_CMD = 'npm';
const FRONTEND_ARGS = ['run', 'dev'];

// Process tracking
const processes = [];

/**
 * Start a process with colored output
 * @param {string} name - Process name for logging
 * @param {string} dir - Working directory
 * @param {string} cmd - Command to run
 * @param {string[]} args - Command arguments
 * @param {string} color - Chalk color to use for output
 */
function startProcess(name, dir, cmd, args, color) {
  console.log(chalk[color](`Starting ${name}...`));
  
  const proc = spawn(cmd, args, {
    cwd: dir,
    shell: true,
    stdio: 'pipe'
  });
  
  processes.push(proc);
  
  // Handle stdout
  proc.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(chalk[color](`[${name}] ${line}`));
      }
    });
  });
  
  // Handle stderr
  proc.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(chalk[color].bold(`[${name} ERROR] ${line}`));
      }
    });
  });
  
  // Handle process exit
  proc.on('close', (code) => {
    console.log(chalk[color].bold(`[${name}] Process exited with code ${code}`));
    
    // If one process exits, terminate all others
    if (code !== 0) {
      console.log(chalk.red('One process terminated unexpectedly, shutting down...'));
      killAllProcesses();
    }
  });
  
  return proc;
}

/**
 * Kill all running processes
 */
function killAllProcesses() {
  console.log(chalk.yellow('Shutting down all processes...'));
  processes.forEach(proc => {
    if (!proc.killed) {
      proc.kill('SIGTERM');
    }
  });
}

// Start backend
startProcess('Backend', BACKEND_DIR, BACKEND_CMD, BACKEND_ARGS, 'cyan');
console.log(chalk.cyan('Backend dev server starting...'));

// Wait 5 seconds before starting frontend to let backend initialize first
setTimeout(() => {
  startProcess('Frontend', FRONTEND_DIR, FRONTEND_CMD, FRONTEND_ARGS, 'magenta');
  console.log(chalk.magenta('Frontend dev server starting...'));
}, 5000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nReceived SIGINT. Graceful shutdown...'));
  killAllProcesses();
  
  // Give processes a moment to terminate
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

console.log(chalk.green('Development servers starting. Press Ctrl+C to stop.')); 