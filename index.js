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

// Listen for all messages
app.event('message', async ({ event, say, client }) => {
  // Skip if it's from a bot
  if (event.bot_id) return;
  
  // Only respond to your user ID
  const ALLOWED_USER = 'U036NNSBF6J'; // Your Slack user ID
  if (event.user !== ALLOWED_USER) {
    return; // Ignore messages from other users
  }
  
  console.log('📨 Message event:', {
    text: event.text,
    channel: event.channel,
    channel_type: event.channel_type,
    user: event.user
  });
  
  // Check if it's a DM (channel starts with 'D') or contains "claude"
  const isDM = event.channel_type === 'im' || event.channel.startsWith('D');
  const mentionsClaude = /claude/i.test(event.text);
  
  if (!isDM && !mentionsClaude) {
    return; // Ignore if not a DM and doesn't mention claude
  }
  
  console.log('✅ Processing message:', event.text, 'isDM:', isDM);
  
  // For DMs, use the full message. For channel messages, remove "claude"
  let prompt = event.text;
  if (!isDM) {
    prompt = event.text.replace(/claude/i, '').trim();
  }
  
  if (!prompt || prompt === '') {
    await say('👋 Hi! Ask me to do something, like:\n• `sync YouTube videos`\n• `check my channel stats`\n• `help`');
    return;
  }
  
  // Show typing indicator and save the message timestamp
  const processingMsg = await say('🤔 Processing your request...');
  
  // Call Claude on your home machine
  const result = await callClaude(prompt);
  
  // Delete the processing message
  try {
    await client.chat.delete({
      channel: event.channel,
      ts: processingMsg.ts
    });
  } catch (error) {
    console.log('Could not delete processing message:', error);
  }
  
  // Send the result back to Slack
  await say(result);
});

// Handle app mentions (when someone types @claude)
app.event('app_mention', async ({ event, say, client }) => {
  console.log('App mentioned:', event.text);
  
  // Only respond to your user ID
  const ALLOWED_USER = 'U036NNSBF6J';
  if (event.user !== ALLOWED_USER) {
    return; // Ignore mentions from other users
  }
  
  // Extract the prompt (remove the bot mention)
  const prompt = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
  
  if (!prompt) {
    await say('👋 Hi! Ask me to do something with Claude Code!');
    return;
  }
  
  // Show typing indicator and save the message timestamp
  const processingMsg = await say('🤔 Processing your request...');
  const result = await callClaude(prompt);
  
  // Delete the processing message
  try {
    await client.chat.delete({
      channel: event.channel,
      ts: processingMsg.ts
    });
  } catch (error) {
    console.log('Could not delete processing message:', error);
  }
  
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