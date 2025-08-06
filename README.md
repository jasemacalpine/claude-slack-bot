# Claude Slack Bot

A Slack bot that interfaces with Claude Code running on your home machine.

## Setup

1. **Create Slack App**: https://api.slack.com/apps
   - Create new app "From scratch"
   - Add scopes: `chat:write`, `app_mentions:read`, `channels:history`
   - Install to workspace

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your tokens
   ```

4. **Run locally**:
   ```bash
   npm run dev
   ```

## Environment Variables

- `SLACK_BOT_TOKEN`: Bot token from Slack (starts with `xoxb-`)
- `SLACK_SIGNING_SECRET`: Signing secret from Slack app
- `CLAUDE_HOME_WEBHOOK_URL`: URL to your home machine webhook
- `PORT`: Port to run on (default: 3000)

## Usage in Slack

- `claude sync YouTube videos`
- `@claude check my channel stats`
- `claude help`

## Deployment

Deploy to Railway, Render, or any Node.js hosting platform.