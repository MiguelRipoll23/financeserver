# Finance server

A Deno-based finance server with MCP integration that helps you manage bills,
subscriptions, receipts, and investment portfolios through natural-language
interactions and programmatic MCP tools.

[![Deploy on Deno](https://deno.com/button)](https://console.deno.com/new?clone=https://github.com/MiguelRipoll23/financeserver&predeploy=deno%20task%20push)

## Deno Deploy configuration

Follow the steps below after using the Deploy on Deno button at the top of this
README.

- On the Deno Deploy project page go to Settings → Environment Variables.
- Drag & drop a `.env.template` file onto the Environment Variables panel, or
  click Import and select the file. Deno Deploy will parse the key/value pairs
  and show them for review.

## Database configuration

Below is a short example showing how to create and connect a Neon database and
point the app's `DATABASE_URL` environment variable to it.

Example service — Neon:

- Sign up at [Neon](https://neon.tech) and create a new project.
- Create a database branch (Neon uses branches for isolated environments).
- From the Neon dashboard open "Connection strings" and copy the PostgreSQL
  connection URL for the branch you created.
- Paste that URL into your deployment or local `.env` as the `DATABASE_URL`.

## OpenAI configuration

Configure the OpenAI-compatible LLM settings in your `.env` file:

- `OPENAI_API_KEY` — your API key for the LLM provider
- `OPENAI_BASE_URL` — base URL for the LLM API

Example provider — OpenCode Zen:

- Base URL: `https://opencode.ai/zen/v1` (set in `OPENAI_BASE_URL`)
- Create an API key at [OpenCode Auth](https://opencode.ai/auth)

### Running the server

Start the server in development mode:

```bash
deno task dev
```

The MCP servers are available at:

- `/api/v1/mcp/global`
- `/api/v1/mcp/portfolio`
- `/api/v1/mcp/expenses`

Each MCP domain exposes programmatic tools the assistant can invoke when
performing tasks.
