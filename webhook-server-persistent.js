const express = require('express');
const { spawn } = require('child_process');
const app = express();

// Parse JSON requests
app.use(express.json());

// Claude process management
let claudeProcess = null;
let lastActivity = Date.now();
let responseBuffer = '';
let isProcessing = false;
let pendingCallback = null;

const TIMEOUT_MINUTES = 20;
const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;

// Start or restart Claude Code
function startClaude() {
  console.log('🚀 Starting new Claude Code session');
  
  if (claudeProcess) {
    claudeProcess.kill();
    claudeProcess = null;
  }
  
  claudeProcess = spawn('/Users/gypsytalesmini/.npm-global/bin/claude', [], {
    cwd: '/Users/gypsytalesmini/Documents/Gypsy-Tales_Media-V2',
    env: {
      ...process.env,
      PATH: `${process.env.PATH}:/Users/gypsytalesmini/.npm-global/bin`,
      HOME: '/Users/gypsytalesmini'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  claudeProcess.stdout.on('data', (data) => {
    const chunk = data.toString();
    responseBuffer += chunk;
    
    // Look for Claude's prompt to know when response is complete
    if (responseBuffer.includes('\n\nHuman: ')) {
      // Extract the response (everything before the Human: prompt)
      const response = responseBuffer.split('\n\nHuman:')[0];
      responseBuffer = '';
      isProcessing = false;
      
      if (pendingCallback) {
        pendingCallback(response);
        pendingCallback = null;
      }
    }
  });
  
  claudeProcess.stderr.on('data', (data) => {
    console.error('Claude stderr:', data.toString());
  });
  
  claudeProcess.on('exit', (code) => {
    console.log(`Claude process exited with code ${code}`);
    claudeProcess = null;
  });
}

// Check for timeout
function checkTimeout() {
  if (claudeProcess && Date.now() - lastActivity > TIMEOUT_MS) {
    console.log('⏰ Session timeout - closing Claude');
    claudeProcess.kill();
    claudeProcess = null;
  }
}

// Check timeout every minute
setInterval(checkTimeout, 60000);

// Send message to Claude
function sendToClaude(message, callback) {
  lastActivity = Date.now();
  
  // Start Claude if not running
  if (!claudeProcess) {
    startClaude();
    // Wait a bit for Claude to initialize
    setTimeout(() => sendToClaude(message, callback), 1000);
    return;
  }
  
  if (isProcessing) {
    callback('⚠️ Still processing previous message, please wait...');
    return;
  }
  
  isProcessing = true;
  pendingCallback = callback;
  responseBuffer = '';
  
  // Send the message
  claudeProcess.stdin.write(message + '\n');
}

// Webhook endpoint
app.post('/claude', async (req, res) => {
  const { prompt } = req.body;
  
  console.log('🎯 Received request:', prompt);
  
  sendToClaude(prompt, (response) => {
    console.log('✅ Sending response, length:', response.length);
    res.send(response);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    sessionActive: !!claudeProcess,
    lastActivity: new Date(lastActivity).toISOString(),
    timeUntilTimeout: claudeProcess ? Math.max(0, TIMEOUT_MS - (Date.now() - lastActivity)) / 1000 + ' seconds' : 'N/A'
  });
});

// Start the webhook server
const PORT = 3001;
app.listen(PORT, () => {
  console.log('🌐 Persistent Claude webhook server running on port', PORT);
  console.log(`⏰ Sessions timeout after ${TIMEOUT_MINUTES} minutes of inactivity`);
});