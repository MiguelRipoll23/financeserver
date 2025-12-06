import type { GitHubUser } from "./github-user-interface.ts";

export interface AuthorizationCodeRecord {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  scope: string;
  accessToken: string;
  tokenType: string;
  user: GitHubUser;
  expiresAt: number;
  resource?: string;
}
