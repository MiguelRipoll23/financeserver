import { z } from "zod";

export const OAuthAuthorizeQuerySchema = z
  .object({
    response_type: z
      .literal("code")
      .describe(
        "OAuth 2.0 response type, must be 'code' for authorization code flow.",
      ),
    client_id: z
      .string()
      .min(1)
      .describe("Client identifier issued to the client during registration."),
    redirect_uri: z
      .string()
      .url()
      .describe("Redirection URI to which the response will be sent."),
    scope: z
      .string()
      .min(1)
      .optional()
      .describe("Space-delimited list of scopes requested by the client."),
    state: z
      .string()
      .min(1)
      .describe(
        "Opaque value used by the client to maintain state between request and callback.",
      ),
    code_challenge: z
      .string()
      .min(43)
      .max(128)
      .describe("PKCE code challenge derived from the code verifier."),
    code_challenge_method: z
      .literal("S256")
      .describe("Method used for the code challenge, must be 'S256'."),
    resource: z
      .string()
      .url()
      .optional()
      .describe(
        "RFC 8707: Target resource for which the token is being requested. Must be the canonical URI of the MCP server.",
      ),
  })
  .describe("OAuth 2.0 Authorization Request Query Parameters");

export type OAuthAuthorizeQuery = z.infer<typeof OAuthAuthorizeQuerySchema>;

export const GitHubCallbackQuerySchema = z
  .object({
    code: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Authorization code returned by GitHub after user authorization.",
      ),
    state: z
      .string()
      .min(1)
      .describe("State parameter to prevent CSRF attacks and maintain state."),
    error: z
      .string()
      .min(1)
      .optional()
      .describe("Error code if the authorization request failed."),
    error_description: z
      .string()
      .min(1)
      .optional()
      .describe("Human-readable description of the error."),
    error_uri: z
      .string()
      .url()
      .optional()
      .describe("URI to a web page with information about the error."),
  })
  .describe("GitHub OAuth Callback Query Parameters");

export type GitHubCallbackQuery = z.infer<typeof GitHubCallbackQuerySchema>;

export const OAuthTokenRequestFormSchema = z
  .union([
    z.object({
      grant_type: z
        .literal("authorization_code")
        .describe("Grant type for exchanging authorization code for tokens."),
      code: z
        .string()
        .min(1)
        .describe("Authorization code received from the authorization server."),
      redirect_uri: z
        .string()
        .url()
        .describe("Redirection URI used in the initial authorization request."),
      client_id: z
        .string()
        .min(1)
        .describe(
          "Client identifier issued to the client during registration.",
        ),
      code_verifier: z
        .string()
        .min(43)
        .max(128)
        .describe("PKCE code verifier used to generate the code challenge."),
      resource: z
        .string()
        .url()
        .optional()
        .describe(
          "RFC 8707: Target resource for which the token is being requested.",
        ),
    }),
    z.object({
      grant_type: z
        .literal("refresh_token")
        .describe("Grant type for obtaining new tokens using a refresh token."),
      refresh_token: z
        .string()
        .min(1)
        .describe("Refresh token issued to the client."),
      client_id: z
        .string()
        .min(1)
        .describe(
          "Client identifier issued to the client during registration.",
        ),
      scope: z
        .string()
        .min(1)
        .optional()
        .describe("Space-delimited list of scopes requested by the client."),
    }),
  ])
  .describe("OAuth 2.0 Token Request Form Data");

export const OAuthTokenRequestSchema = z.discriminatedUnion("grant_type", [
  z.object({
    grant_type: z
      .literal("authorization_code")
      .describe("Grant type for exchanging authorization code for tokens."),
    code: z
      .string()
      .min(1)
      .describe("Authorization code received from the authorization server."),
    redirect_uri: z
      .string()
      .url()
      .describe("Redirection URI used in the initial authorization request."),
    client_id: z
      .string()
      .min(1)
      .describe("Client identifier issued to the client during registration."),
    code_verifier: z
      .string()
      .min(43)
      .max(128)
      .describe("PKCE code verifier used to generate the code challenge."),
    resource: z
      .string()
      .url()
      .optional()
      .describe(
        "RFC 8707: Target resource for which the token is being requested.",
      ),
  }),
  z.object({
    grant_type: z
      .literal("refresh_token")
      .describe("Grant type for obtaining new tokens using a refresh token."),
    refresh_token: z
      .string()
      .min(1)
      .describe("Refresh token issued to the client."),
    client_id: z
      .string()
      .min(1)
      .describe("Client identifier issued to the client during registration."),
    scope: z
      .string()
      .min(1)
      .optional()
      .describe("Space-delimited list of scopes requested by the client."),
  }),
]);

export type OAuthTokenRequest = z.infer<typeof OAuthTokenRequestSchema>;

export const OAuthTokenResponseSchema = z.object({
  access_token: z
    .string()
    .min(1)
    .describe("Access token issued by the authorization server."),
  token_type: z
    .string()
    .min(1)
    .describe("Type of the token issued (usually 'Bearer')."),
  scope: z.string().min(1).describe("Scopes granted by the access token."),
  expires_in: z
    .number()
    .positive()
    .optional()
    .describe("Lifetime in seconds of the access token."),
  refresh_token: z
    .string()
    .min(1)
    .optional()
    .describe("Refresh token issued to the client."),
  user: z
    .object({
      id: z.number().describe("Unique identifier for the user."),
      login: z.string().min(1).describe("User's login name."),
      name: z
        .string()
        .nullable()
        .describe("User's display name, if available."),
      avatarUrl: z
        .string()
        .url()
        .nullable()
        .describe("URL to the user's avatar image."),
      htmlUrl: z.string().url().describe("URL to the user's profile page."),
    })
    .describe("Authenticated user information."),
});

export type OAuthTokenResponse = z.infer<typeof OAuthTokenResponseSchema>;

export const OAuthClientRegistrationRequestSchema = z.object({
  redirect_uris: z
    .array(z.string().url())
    .nonempty()
    .describe("Array of valid redirection URIs for the client."),
  client_name: z
    .string()
    .min(1)
    .optional()
    .describe("Human-readable name of the client."),
  scope: z
    .string()
    .min(1)
    .optional()
    .describe("Space-delimited list of default scopes for the client."),
  grant_types: z
    .array(z.string())
    .optional()
    .describe("Array of OAuth 2.0 grant types supported by the client."),
  response_types: z
    .array(z.string())
    .optional()
    .describe("Array of OAuth 2.0 response types supported by the client."),
  token_endpoint_auth_method: z
    .enum(["client_secret_basic", "client_secret_post", "none"])
    .optional()
    .describe(
      "Authentication method for the token endpoint. Supported values: 'client_secret_basic', 'client_secret_post', 'none'.",
    ),
  client_secret: z
    .string()
    .nullable()
    .optional()
    .describe("Client secret issued to the client, if applicable."),
  client_secret_expires_at: z
    .union([
      z
        .number()
        .int()
        .nonnegative()
        .describe("Expiration time of the client secret as a Unix timestamp."),
      z.null().describe("No expiration for the client secret."),
    ])
    .optional(),
});

export type OAuthClientRegistrationRequest = z.infer<
  typeof OAuthClientRegistrationRequestSchema
>;

export const OAuthClientRegistrationResponseSchema = z.object({
  client_id: z
    .string()
    .min(1)
    .describe("Unique identifier issued to the client."),
  client_id_issued_at: z
    .number()
    .int()
    .nonnegative()
    .describe("Timestamp when the client ID was issued."),
  client_secret: z
    .string()
    .optional()
    .describe("Client secret issued to the client, if applicable."),
  client_secret_expires_at: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Expiration time of the client secret as a Unix timestamp."),
  redirect_uris: z
    .array(z.string().url())
    .describe("Array of valid redirection URIs for the client."),
  token_endpoint_auth_method: z
    .enum(["client_secret_basic", "client_secret_post", "none"])
    .describe(
      "Authentication method for the token endpoint. 'client_secret_basic' and 'client_secret_post' are for confidential clients, 'none' is for public clients.",
    ),
  grant_types: z
    .array(z.literal("authorization_code"))
    .nonempty()
    .describe("Array of OAuth 2.0 grant types supported by the client."),
  response_types: z
    .array(z.literal("code"))
    .nonempty()
    .describe("Array of OAuth 2.0 response types supported by the client."),
});

export type OAuthClientRegistrationResponse = z.infer<
  typeof OAuthClientRegistrationResponseSchema
>;

export const OAuthRevokeRequestFormSchema = z.object({
  token: z
    .string()
    .min(1)
    .describe("The token to revoke (access token or refresh token)."),
  token_type_hint: z
    .enum(["access_token", "refresh_token"])
    .optional()
    .describe("A hint about the type of the token being revoked."),
  client_id: z
    .string()
    .min(1)
    .describe("Client identifier issued to the client during registration."),
});

export type OAuthRevokeRequest = z.infer<typeof OAuthRevokeRequestFormSchema>;
