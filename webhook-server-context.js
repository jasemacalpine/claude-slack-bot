const express = require('express');
const { spawn } = require('child_process');
const app = express();

// Parse JSON requests
app.use(express.json());

// Store conversation history with timestamps
const conversationHistory = new Map();
const CONTEXT_TIMEOUT = 20 * 60 * 1000; // 20 minutes

// Webhook endpoint that Railway Slack bot calls
app.post('/claude', async (req, res) => {
  const { prompt, userId = 'default' } = req.body;
  
  console.log('🎯 Received request from Slack bot:', prompt);
  
  // Get or create conversation history for this user
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, { messages: [], lastActivity: Date.now() });
  }
  
  const userData = conversationHistory.get(userId);
  
  // Check if conversation has timed out
  if (Date.now() - userData.lastActivity > CONTEXT_TIMEOUT) {
    console.log('🔄 Conversation timeout - starting fresh');
    userData.messages = [];
  }
  
  userData.lastActivity = Date.now();
  
  // Build context from recent messages
  let contextPrompt = prompt;
  
  if (userData.messages.length > 0) {
    const recentMessages = userData.messages.slice(-10); // Last 5 exchanges
    contextPrompt = `Previous conversation:
${recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User: ${prompt}`;
  }
  
  try {
    console.log('🤖 Executing Claude Code with context');
    
    // Use spawn for better process control with MCP access
    const child = spawn('/Users/gypsytalesmini/.npm-global/bin/claude', ['-p', contextPrompt], {
      cwd: '/Users/gypsytalesmini/Documents/Gypsy-Tales_Media-V2',  // Use project directory for MCP access
      env: {
        ...process.env,
        PATH: `${process.env.PATH}:/Users/gypsytalesmini/.npm-global/bin`,
        HOME: '/Users/gypsytalesmini'
      },
      stdio: ['ignore', 'pipe', 'pipe']  // ignore stdin, capture stdout/stderr
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code, signal) => {
      console.log('🔍 Process completed');
      console.log('🔍 Exit code:', code);
      console.log('🔍 Signal:', signal);
      console.log('🔍 Stdout length:', stdout.length);
      console.log('🔍 Stderr length:', stderr.length);
      
      if (code !== 0) {
        console.error('❌ Claude Code failed');
        console.error('❌ Exit code:', code);
        console.error('❌ Signal:', signal);
        console.error('❌ Stderr:', stderr);
        
        const errorMsg = `❌ Claude Code failed with exit code ${code}${signal ? ` (signal: ${signal})` : ''}\nStderr: ${stderr}`;
        res.send(errorMsg);
        return;
      }
      
      if (stderr && stderr.trim()) {
        console.log('⚠️ Claude Code stderr:', stderr);
      }
      
      const result = stdout || '✅ Claude Code completed (no output)';
      console.log('✅ Claude Code result length:', result.length);
      console.log('✅ First 200 chars:', result.substring(0, 200));
      
      // Store this exchange in history
      userData.messages.push({ role: 'user', content: prompt });
      userData.messages.push({ role: 'assistant', content: result });
      
      // Keep only last 20 messages (10 exchanges)
      if (userData.messages.length > 20) {
        userData.messages.splice(0, userData.messages.length - 20);
      }
      
      res.send(result);
    });
    
    child.on('error', (error) => {
      console.error('❌ Spawn error:', error);
      res.status(500).send(`❌ Failed to start Claude Code: ${error.message}`);
    });
    
    // Set timeout - 2 minutes for Claude Code operations
    const timeout = setTimeout(() => {
      console.log('⏰ Claude Code timeout, killing process');
      child.kill('SIGTERM');
    }, 120000); // 2 minutes
    
    // Clear timeout when process closes
    child.once('close', () => {
      clearTimeout(timeout);
    });
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).send(`❌ Server error: ${error.message}`);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Claude Code webhook server is running',
    claudeCodePath: 'Using system Claude Code CLI with MCP access'
  });
});

// Start the webhook server
const PORT = 3001;
app.listen(PORT, () => {
  console.log('🌐 Claude Code webhook server running on port', PORT);
  console.log('🎯 Endpoint: http://localhost:3001/claude');
  console.log('❤️ Health check: http://localhost:3001/health');
  console.log('🔧 Using simple Claude Code CLI from home directory');
});