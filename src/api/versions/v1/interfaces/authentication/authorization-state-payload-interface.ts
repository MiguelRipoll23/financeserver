export interface AuthorizationStatePayload {
  nonce: string;
  iat: number;
  clientState: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  scope: string;
  resource?: string;
}
