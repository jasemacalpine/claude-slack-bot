const { App } = require('@slack/bolt');
const express = require('express');
require('dotenv').config();

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
  port: process.env.PORT || 3000
});

// Function to call Claude on your home machine
async function callClaude(prompt) {
  try {
    const response = await fetch(process.env.CLAUDE_HOME_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt })
    });
    
    if (!response.ok) {
      return `❌ Home machine not responding (${response.status})`;
    }
    
    const result = await response.text();
    return result || '✅ Task completed (no output)';
  } catch (error) {
    console.error('Error calling Claude:', error);
    return `❌ Failed to reach home machine: ${error.message}`;
  }
}

// Listen for messages mentioning the bot or direct messages
app.message(/claude/i, async ({ message, say }) => {
  console.log('Received message:', message.text);
  
  // Extract the prompt (remove "claude" from the message)
  const prompt = message.text.replace(/claude/i, '').trim();
  
  if (!prompt) {
    await say('👋 Hi! Ask me to do something, like:\n• `claude sync YouTube videos`\n• `claude check my channel stats`\n• `claude help`');
    return;
  }
  
  // Show typing indicator
  await say('🤔 Processing your request...');
  
  // Call Claude on your home machine
  const result = await callClaude(prompt);
  
  // Send the result back to Slack
  await say(result);
});

// Handle app mentions (when someone types @claude)
app.event('app_mention', async ({ event, say }) => {
  console.log('App mentioned:', event.text);
  
  // Extract the prompt (remove the bot mention)
  const prompt = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
  
  if (!prompt) {
    await say('👋 Hi! Ask me to do something with Claude Code!');
    return;
  }
  
  await say('🤔 Processing your request...');
  const result = await callClaude(prompt);
  await say(result);
});

// Health check endpoint
const healthApp = express();
healthApp.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
healthApp.listen(3001, () => {
  console.log('🔍 Health check endpoint running on port 3001');
});

// Start the app
(async () => {
  try {
    await app.start();
    console.log('⚡️ Claude Slack bot is running!');
    console.log(`📱 Listening on port ${process.env.PORT || 3000}`);
    console.log('🏠 Will forward Claude requests to:', process.env.CLAUDE_HOME_WEBHOOK_URL);
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
})();