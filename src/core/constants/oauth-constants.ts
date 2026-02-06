export const OAUTH_SERVICE_DOCUMENTATION_URL =
  "https://github.com/MiguelRipoll23/financeserver";
export const GITHUB_APPLICATION_CONNECTIONS_BASE_URL =
  "https://github.com/settings/connections/applications";
export const OAUTH_PROTECTED_RESOURCE_PATH = "/api/v1/mcp/global";
export const OAUTH_PROTECTED_RESOURCE_DOCUMENTATION_URL =
  "https://github.com/MiguelRipoll23/financeserver#protected-resource";
export const OAUTH_SCOPES_SUPPORTED: [string, ...string[]] = [
  "read:user",
  "mcp:tools",
  "mcp:resources",
];
export const OAUTH_RESPONSE_TYPES_SUPPORTED: [string, ...string[]] = ["code"];
export const OAUTH_GRANT_TYPES_SUPPORTED: [string, ...string[]] = [
  "authorization_code",
  "refresh_token",
];
export const OAUTH_TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED: [
  string,
  ...string[]
] = ["client_secret_basic", "client_secret_post", "none"];
export const OAUTH_CODE_CHALLENGE_METHODS_SUPPORTED: [string, ...string[]] = [
  "S256",
];
export const OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS = 3600; // 1 hour
export const OAUTH_REFRESH_TOKEN_EXPIRES_IN_SECONDS = 604800; // 7 days
