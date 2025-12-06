import { z } from "@hono/zod-openapi";

export const OAuthAuthorizationServerSchema = z.object({
  issuer: z
    .string()
    .url()
    .describe("Issuer base URL for the OAuth 2.0 authorization server"),
  authorization_endpoint: z
    .string()
    .url()
    .describe("OAuth 2.0 authorization endpoint"),
  token_endpoint: z.string().url().describe("OAuth 2.0 token endpoint"),
  scopes_supported: z
    .array(z.string())
    .nonempty()
    .describe("List of supported OAuth 2.0 scopes"),
  response_types_supported: z
    .array(z.string())
    .nonempty()
    .describe("List of supported OAuth 2.0 response types"),
  grant_types_supported: z
    .array(z.string())
    .nonempty()
    .describe("List of supported OAuth 2.0 grant types"),
  token_endpoint_auth_methods_supported: z
    .array(z.string())
    .nonempty()
    .describe(
      "Supported token endpoint client authentication methods. Includes 'client_secret_basic' (HTTP Basic Auth), 'client_secret_post' (credentials in POST body), and 'none' (public clients with PKCE)."
    ),
  code_challenge_methods_supported: z
    .array(z.string())
    .nonempty()
    .describe("Supported PKCE code challenge methods"),
  revocation_endpoint: z
    .string()
    .url()
    .describe("OAuth 2.0 revocation endpoint"),
  service_documentation: z.string().url().describe("Service documentation URL"),
  registration_endpoint: z
    .string()
    .url()
    .describe("Dynamic client registration endpoint"),
  access_token_expires_in: z
    .number()
    .positive()
    .describe("Access token lifetime in seconds"),
  refresh_token_expires_in: z
    .number()
    .positive()
    .describe("Refresh token lifetime in seconds"),
});
