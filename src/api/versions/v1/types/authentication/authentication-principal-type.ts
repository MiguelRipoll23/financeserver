export type AuthenticationProviderType = "internal" | "oauth";

export type AuthenticationPrincipalType = {
  id: string;
  name: string;
  roles: string[];
  provider: AuthenticationProviderType;
  avatarUrl?: string;
  userHandle?: string;
};
