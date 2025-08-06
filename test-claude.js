const { spawn } = require('child_process');

console.log('Testing Claude Code CLI...');

const child = spawn('/Users/gypsytalesmini/.npm-global/bin/claude', ['-p', 'say hello'], {
  cwd: '/Users/gypsytalesmini',
  env: {
    ...process.env,
    PATH: process.env.PATH + ':/Users/gypsytalesmini/.npm-global/bin',
    HOME: '/Users/gypsytalesmini'
  },
  stdio: 'inherit'
});

child.on('close', (code, signal) => {
  console.log('Process closed with code:', code, 'signal:', signal);
});

child.on('error', (error) => {
  console.error('Error:', error);
});