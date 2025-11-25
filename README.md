<div align='center'>
   <br/>
   <br/>
   <h3>🤖</h3>
   <h3>PokeCode Discord Bot</h3>
   <p>A Discord bot built on Cloudflare Workers that allows users to store and manage game codes (friend codes, referral codes, etc.) on a per-server basis.</p>
   <br/>
   <br/>
</div>

## Features

- **Store game codes** - Save friend codes, referral codes, and other game-related codes
- **Per-server storage** - Each Discord server has isolated code storage
- **Simple commands** - Easy-to-use slash commands for managing codes
- **Serverless architecture** - Runs on Cloudflare Workers for global low-latency
- **Persistent storage** - Uses Cloudflare KV for reliable data persistence

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: [Hono](https://hono.dev/)
- **Discord API**: [discord-interactions](https://github.com/discord/discord-interactions-js)
- **Storage**: Cloudflare KV
- **Language**: TypeScript
- **Package Manager**: Bun
- **Code Quality**: Biome

## Prerequisites

- [Bun](https://bun.sh/) installed
- A [Discord Application](https://discord.com/developers/applications) with bot enabled
- A [Cloudflare account](https://dash.cloudflare.com/) with Workers access

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/nurodev/pokecode-discord-bot.git
   cd pokecode-discord-bot
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:
   ```
   BACKUP_AUTH_TOKEN="your_backup_auth_token"
   DISCORD_BOT_TOKEN="your_discord_bot_token"
   DISCORD_CLIENT_ID="your_discord_client_id"
   DISCORD_PUBLIC_KEY="your_discord_public_key"
   ```

   Get your Discord public key from the [Discord Developer Portal](https://discord.com/developers/applications).

4. **Register Discord commands**

   Run the `register` script to register the bot's slash commands with Discord:
   ```bash
   bun run register
   ```

## Development

Start the local development server:
```bash
bun dev
```

The bot will be available at `http://localhost:8787`. Configure this URL as your Discord bot's Interactions Endpoint URL during development (you may need to use a tunnel like ngrok).

### Code Quality Commands

```bash
bun check              # Run linting and formatting checks
bun lint               # Auto-fix linting issues
bun format             # Auto-format code
```

## Deployment

Deploy to Cloudflare Workers:
```bash
bun deploy
```

After deployment, update your Discord bot's Interactions Endpoint URL in the Discord Developer Portal to your Cloudflare Worker URL (e.g., `https://your-worker.your-subdomain.workers.dev/interactions`).

## Usage

The bot provides a single `/code` command with three subcommands:

### List codes

```
/code list
```
Displays all your saved codes for the current server.

```
/code list user:<@user>
```
Displays all saved codes for the mentioned user in the current server.

### Add a code

```
/code add name:<label> code:<your-code>
```
Adds a new code with a custom label. Duplicate names are not allowed.

### Remove a code

```
/code remove name:<label>
```
Removes a code by its label.

## Storage

Data is stored in Cloudflare KV with the following structure:

- **Key pattern**: `user_codes/{guild_id}/{user_id}`
- **Value**: Array of code entries with `name` and `code` fields

Each user's codes are isolated per Discord server.

## Contributing

This project uses Biome for code formatting and linting. Please run `bun check` before committing changes to ensure code quality standards are met.

## License

MIT
