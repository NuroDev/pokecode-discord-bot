# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PokeCode is a Discord bot built on Cloudflare Workers that allows users to store and manage game codes (friend codes, referral codes, etc.) per-server. The bot uses Hono for routing, Discord Interactions for bot functionality, and Cloudflare KV for persistent storage.

## Development Commands

### Development Server
```bash
bun dev                 # Start local development server with wrangler (includes --test-scheduled flag for cron testing)
```

### Code Quality
```bash
bun check              # Run biome check (lint + format)
bun lint               # Run biome lint with auto-fix
bun format             # Run biome format with auto-write
```

### Deployment
```bash
bun register           # Register Discord slash commands (requires DISCORD_CLIENT_ID and DISCORD_BOT_TOKEN env vars)
bun deploy             # Deploy to Cloudflare Workers
bun run cf-typegen     # Generate Cloudflare Worker types
```

### Environment Variables
Set these environment variables for registration:
- `DISCORD_CLIENT_ID` - Your Discord application's client ID
- `DISCORD_BOT_TOKEN` - Your Discord bot token

The worker requires (in `.env` or Cloudflare dashboard):
- `DISCORD_PUBLIC_KEY` - For verifying Discord interaction requests (discord-interactions)
- `BACKUP_AUTH_TOKEN` - Bearer token for authenticating backup endpoint requests

## Architecture

### Request Flow
1. Discord sends interaction requests to the `POST /interactions` endpoint
2. Middleware verifies request signature using Ed25519 (discord-interactions)
3. PING interactions return PONG (required for Discord verification)
4. Command interactions are routed to subcommand handlers
5. Data is stored/retrieved from Cloudflare KV with key pattern: `user_codes/{serverId}/{userId}`

### Storage Schema
KV stores an array of `CodeEntry` objects per user per server:
```typescript
interface CodeEntry {
  code: string;  // The actual game code
  name: string;  // User-defined label
}
```

Key structure: `user_codes/{guild_id}/{user_id}`

### Command Structure
The bot exposes a single `/code` slash command with three subcommands:
- `/code list` - Lists all codes for the requesting user
- `/code list user:<@user>` - Lists all codes for a mentioned user (note: command definition supports this option, but handler currently doesn't implement fetching other users' codes)
- `/code add <name> <code>` - Adds a new code with duplicate checking (checks both name and code for duplicates)
- `/code remove <name>` - Removes a code by name

All command definitions are in `scripts/register.ts` and must be registered using `bun register` before they appear in Discord.

### Backup System
The bot includes automated backup functionality that stores KV data to Cloudflare R2:
- **Scheduled backups**: Runs daily at midnight UTC via cron trigger (`0 0 * * *`)
- **Manual backups**: POST to `/backup` endpoint with bearer authentication
- **Storage location**: R2 bucket `pokecode-backups` (binding: `BACKUPS`)
- **Backup format**: JSON files named `backup-{timestamp}.json` with metadata

The backup system uses a custom `ScheduleController` utility (src/utils/scheduled.ts) that provides a fluent API for registering cron handlers.

### File Organization
- `src/index.ts` - Main Hono app with interaction handling, business logic, backup endpoint, and scheduled task export
- `src/constants.ts` - Shared constants (command names, KV key prefix)
- `src/types.ts` - TypeScript interfaces (CodeEntry)
- `src/utils/backup.ts` - Backup utility function that exports all KV data to R2
- `src/utils/scheduled.ts` - ScheduleController class for managing cron jobs
- `scripts/register.ts` - Discord command registration script (uses discord.js REST API)
- `wrangler.jsonc` - Cloudflare Worker configuration with KV binding, R2 bucket, and cron triggers
- `biome.jsonc` - Code formatting and linting rules

## Code Style

This project uses Biome for linting and formatting:
- **Indentation**: Tabs (width 4)
- **Line width**: 90 characters
- **Quotes**: Single quotes for JS/TS
- **Semicolons**: Always required
- **Array types**: Generic syntax (`Array<T>` not `T[]`)

Always run `bun check` before committing changes.

## Environment Configuration

Create a `.env` file (gitignored) based on `.example.env`:
```
BACKUP_AUTH_TOKEN="your_backup_auth_token"
DISCORD_BOT_TOKEN="your_discord_bot_token"
DISCORD_CLIENT_ID="your_discord_client_id"
DISCORD_PUBLIC_KEY="your_public_key_here"
```

For production, set these in Cloudflare Workers dashboard or via wrangler secrets.

## Cloudflare Bindings

### KV Namespace
- Binding name: `KV`
- Remote binding enabled (can access production KV during dev)
- Namespace ID: `992d2f8a71614989bf2a48b8eba1956c`

### R2 Bucket
- Binding name: `BACKUPS`
- Bucket name: `pokecode-backups`
- Remote binding enabled

Access bindings in code via `c.env.KV` and `c.env.BACKUPS` (Hono context).

## Observability

The worker has observability enabled in `wrangler.jsonc`:
- Logs enabled
- Traces enabled
