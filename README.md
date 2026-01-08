# Finance server

A Deno-based finance server with MCP integration that helps you manage bills,
subscriptions and receipts through natural language interactions.

[![Deploy on Deno](https://deno.com/button)](https://console.deno.com/new?clone=https://github.com/MiguelRipoll23/financeserver)

## Usage

Ask or tell the AI whatever you want to manage your finances:

- Add my electricity bill for $85 from today
- Show me all bills over $100 from last month
- Create a Netflix subscription for $15.99 monthly
- List all my active subscriptions
- Save this grocery receipt (with attached photo)
- Find receipts containing coffee items
- Which products had the biggest price increases recently?
- Summarize my spending patterns from last month

## Installation

### Prerequisites

- [Deno](https://deno.land/)
- PostgreSQL database (Neon or Prisma work great)
- GitHub account (for OAuth setup)

### Application setup

Clone the repository and create your own `.env` file using the following
commands:

```bash
git clone https://github.com/MiguelRipoll23/financeserver.git
cd financeserver
cp .env.example .env
```

Update your `JWT_SECRET` in your `.env` file with a solid passphrase wrapped in
quotes:

```env
JWT_SECRET="this is my biggest secret"
```

### Database setup

Spin up a PostgreSQL database (self-hosted or cloud), then point the
`DATABASE_URL` in `.env` to your database.

Then apply the migrations:

```bash
deno task push
```

### GitHub OAuth setup

The MCP servers use GitHub OAuth for authentication. In order to use them,
you’ll need to set up a GitHub OAuth app using the steps below:

1. Create a GitHub OAuth app in your GitHub settings
2. Set the Authorization callback URL to
   `http://localhost:8000/api/v1/oauth/github/callback`
3. Copy the `Client ID` and `Client Secret` value to your `GITHUB_CLIENT_ID` and
   `GITHUB_CLIENT_SECRET` environment variables respectively from your `.env`
   file

### Running the server

Use the following command to start the server:

```bash
deno task dev
```

The console will drop a fresh token (look for the 🔑). Head to the root URL at
port 8080 using a browser and you’ll land on the Scalar UI with all API routes
ready to poke at.

Paste your token into the authentication section and call the `Add user`
endpoint to authorize your GitHub handle and unlock access to the MCP servers.

The MCP servers are available at:

- `/api/v1/mcp/global`
- `/api/v1/mcp/bills`
- `/api/v1/mcp/receipts`
