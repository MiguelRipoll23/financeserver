export interface RegisteredOAuthClient {
  clientId: string;
  redirectUris: string[];
  clientIdIssuedAt: number;
  clientSecret: string | null;
  clientSecretExpiresAt: number | null;
  grantTypes: ["authorization_code"];
  responseTypes: ["code"];
  tokenEndpointAuthMethod: "none";
}
