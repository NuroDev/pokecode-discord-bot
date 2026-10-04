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
- **Package Manager**: pnpm 12.9.1
- **Code Quality**: Vite Plus (Oxfmt / Oxlint)

## Prerequisites

- [pnpm 12.9.1](https://pnpm.io/) installed
- [Node.js 24.21.0 LTS](https://nodejs.org/) or a newer 24.x release (`.node-version` pins 24.21.0)
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
    pnpm install
    pnpm cf-typegen
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
    pnpm register
    ```

## Development

Start the local development server:

```bash
pnpm dev
```

The bot will be available at `http://localhost:5173`. Configure this URL as your Discord bot's Interactions Endpoint URL during development (you may need to use a tunnel like ngrok).

The scripts use the [Cloudflare CLI (`cf`)](https://developers.cloudflare.com/cf/).
Worker settings, bindings, and the daily backup cron are in `cloudflare.config.ts`.
`cf` uses Vite and the Cloudflare Vite plugin to bundle this TypeScript Worker,
with build, Oxfmt, and Oxlint settings in `vite.config.ts`. Development and builds regenerate Worker types.
The Worker enables `nodejs_compat` for the Discord interaction library's crypto import.

KV and R2 bindings access the existing remote resources during development.
To test the scheduled handler, visit `http://localhost:5173/cdn-cgi/local/scheduled?cron=0+0+*+*+*`.
This runs the backup and pruning jobs against those resources.

### Code Quality Commands

```bash
pnpm check              # Run linting and formatting checks
pnpm lint               # Auto-fix linting issues
pnpm format             # Auto-format code
pnpm cf-typegen     # Generate Worker types in .cloudflare/types
pnpm typecheck      # Check TypeScript (generate types first)
pnpm build          # Build without deploying
```

## Deployment

Deploy to Cloudflare Workers:

```bash
pnpm exec cf auth login
pnpm deploy
```

Validate deployment without uploading:

```bash
pnpm exec cf deploy --dry-run
```

For a new Worker, set `BACKUP_AUTH_TOKEN` and `DISCORD_PUBLIC_KEY` in the
Cloudflare dashboard before deployment, or upload a file containing those two
secrets with `pnpm exec cf deploy --secrets-file <path>`. Existing deployed secrets
are preserved. `DISCORD_BOT_TOKEN` and `DISCORD_CLIENT_ID` are used only by the
local command registration script.

After deployment, update your Discord bot's Interactions Endpoint URL in the Discord Developer Portal to your Cloudflare Worker URL (e.g., `https://your-worker.your-subdomain.workers.dev/interactions`).

## Worker Previews

[Worker Previews](https://developers.cloudflare.com/workers/previews/) deploy the current branch with separate storage and no scheduled backup trigger.

Create the shared Preview resources once:

```bash
pnpm exec cf kv namespaces create --title pokecode-preview-codes
pnpm exec cf r2 buckets create --name pokecode-preview-backups
```

Export the returned KV namespace ID before deploying a Preview:

```bash
export CLOUDFLARE_PREVIEW_KV_NAMESPACE_ID='<preview-namespace-id>'
pnpm preview                 # Preview name defaults to the current branch
pnpm preview my-feature      # Or use an explicit name
```

Set `BACKUP_AUTH_TOKEN` and `DISCORD_PUBLIC_KEY` in the Worker's Previews Base configuration in the Cloudflare dashboard before the first Preview. Use a separate Discord application for Preview interactions and its public key. All branches share the Preview KV namespace and R2 bucket; production storage is separate. Preview deployments require Cloudflare credentials and upload immediately.

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

This project uses Vite Plus for code formatting and linting. Please run `pnpm check` before committing changes to ensure code quality standards are met.

## License

MIT
