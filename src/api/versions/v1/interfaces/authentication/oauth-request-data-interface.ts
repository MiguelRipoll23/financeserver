export interface OAuthRequestData {
  requestId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  resource?: string;
  status: "pending" | "approved" | "denied";
  createdAt: number;
  expiresAt: number;
}
