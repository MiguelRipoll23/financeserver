# Finance server

A finance server that helps you manage your portfolio and expenses using an OpenAPI-documented API and MCP tools.

[![Deploy on Deno](https://deno.com/button)](https://console.deno.com/new?clone=https://github.com/MiguelRipoll23/financeserver&predeploy=deno%20task%20push)

## Deno Deploy configuration

Follow the steps below after using the Deploy button above this section:

- On the Deno Deploy project page, go to Settings → Environment Variables.
- Drag and drop the `.env.example` file from this repository onto the Environment
  Variables panel, or click Import and select the file.

## Database configuration

Below is a short example showing how to create and connect a Neon database and
point the app:

- Sign up at [Neon](https://neon.tech) and create a new project.
- Create a database branch (Neon uses branches for isolated environments).
- From the Neon dashboard, open "Connection strings" and copy the PostgreSQL
  connection URL for the branch you created.
- Paste that URL into your deployment or local `.env` file as `DATABASE_URL`.

## OpenAI configuration

Configure the OpenAI-compatible LLM settings in your deployment or local
`.env` file:

- `OPENAI_API_KEY` — your API key for the LLM provider.
- `OPENAI_BASE_URL` — base URL for the LLM API.

Example provider — OpenCode Zen:

- Base URL: `https://opencode.ai/zen/v1` (set in `OPENAI_BASE_URL`).
- Create an API key at [OpenCode Auth](https://opencode.ai/auth).

## OAuth & WebAuthn configuration

This project includes OAuth and WebAuthn flows used by MCP clients and the
front-end application.

To use these features, set the following environment variables:

- `OAUTH_APP_BASE_URL` — the front-end application's base URL used for OAuth
  redirects (e.g. `https://your-pasta-app.vercel.app`).
- `WEBAUTHN_ORIGINS` — a comma-separated list of allowed origins for WebAuthn
  (e.g. `https://your-pasta-app.vercel.app`).

If you want to use the front-end too,
[see this repository](https://github.com/MiguelRipoll23/pasta)

### Running the server

Start the server in development mode:

```bash
deno task dev
```

The MCP servers are available at:

- `/api/v1/mcp/global`
- `/api/v1/mcp/portfolio`
- `/api/v1/mcp/expenses`
