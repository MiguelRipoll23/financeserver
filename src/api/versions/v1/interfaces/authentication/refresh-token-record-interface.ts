import type { GitHubUser } from "./github-user-interface.ts";

export interface RefreshTokenRecord {
  refreshToken: string;
  accessToken: string;
  clientId: string;
  scope: string;
  tokenType: string;
  user: GitHubUser;
  expiresAt: number;
  resource?: string;
}
