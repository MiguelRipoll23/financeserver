# AGENTS.md

## Project rules

- Always follow naming conventions in this file
- Never use abbreviations either for arguments or variables
- Use the subdirectories constants, enums, interfaces, schemas, types, utils of
  this project structure unless other rule says otherwise
- Use strings for fields that contain prices (no currency symbol)

### API rules

- All API endpoints must use OpenAPI and be documented

### MCP rules

- Each MCP tool is a new service, under the tools subdirectory
- MCP tools must follow naming convention: `domain.action` (e.g., bills.save,
  bills.filter)
- MCP tool descriptions must start with "Use this when…" and include disallowed
  cases (e.g., "Do not use for…")
- Read-only MCP tools must be annotated with `readOnlyHint: true` so AI agents
  can streamline confirmation dialogs
- Paginated MCP tool responses must include the pagination message when
  `nextCursor` exists:
  `The response is paginated; use the tool input "cursor" with value "${nextCursor}" to keep retrieving more data.`

## Naming conventions

- Use snake_case for file names (receipts-service.ts)
- Use PascalCase for services names (ReceiptsService)
- Use camelCase for JSON input for API (totalAmount)
- Use snake_case for database table and columns names
- Use kebab-case (hyphens) for API paths

## Project hierarchy

### Core services (src/core/)

- `constants/` - Core application constants
- `middlewares/` - CORS and caching middlewares
- `routers/` - Root application routers
- `schemas/` - OAuth and core validation schemas
- `services/` - Core services (database, JWT, OAuth, OpenAPI, error handling)
- `types/` - Core type definitions
- `utils/` - Core utility functions

### Database (src/db/)

- `tables/` - Database table definitions using Drizzle ORM
- `schema.ts` - Main database schema
- `rls.ts` - Row Level Security definitions

### API structure (src/api/)

- `middlewares/` - Authentication and authorization middlewares
- `routers/api-router.ts` - Main API router

### Versioned API (src/api/versions/v1/)

````text
.
├─ constants/                # API constants (env vars, OAuth config, pagination defaults)
├─ enums/                    # Sort fields + sort order enums
├─ interfaces/               # TypeScript interfaces by domain
│  ├─ authentication/        # Auth-related shapes
│  ├─ bills/                 # Bill data structures
│  ├─ products/              # Product definitions
│  ├─ receipts/              # Receipt structures
│  ├─ users/                 # User profile shapes
│  └─ pagination/            # Pagination interfaces
├─ models/                   # Server error + response models
├─ routers/                  # API route handlers
│  ├─ public/                # Unauthenticated endpoints
│  └─ authenticated/         # Auth-required endpoints
├─ schemas/                  # Zod validation schemas for API endpoints
├─ services/                 # Business logic
│  ├─ authentication/        # Login + token flow logic
│  ├─ bills/
│  │  ├─ prompts/            # AI prompts for bill processing
│  │  └─ tools/              # MCP tools for bill operations
│  ├─ products/              # Product catalog + management
│  ├─ receipts/
│  │  ├─ prompts/            # AI prompts for receipt analysis
│  │  └─ tools/              # MCP tools for receipt operations
│  └─ users/                 # User management + profiles
├─ types/                    # Shared TypeScript type definitions
└─ utils/                    # Reusable utility functions
```

## Testing

The server runs on port 8000 with endpoints accessible at `/api/v1/`. Routes
exposed by the authenticated router require a JWT token in the Authorization
header.
````
