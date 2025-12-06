import { z } from "@hono/zod-openapi";

export const OAuthProtectedResourceMetadataSchema = z.object({
  issuer: z
    .string()
    .url()
    .describe("Issuer base URL for the OAuth 2.0 authorization server"),
  resource: z.string().url().describe("Identifier for the protected resource"),
  authorization_servers: z
    .array(z.string().url())
    .nonempty()
    .describe("List of compatible authorization servers"),
  scopes_supported: z
    .array(z.string())
    .nonempty()
    .describe("OAuth scopes available for this resource"),
  resource_documentation: z
    .string()
    .url()
    .describe("Documentation describing the protected resource"),
});
