export type AuthenticationProviderType = "internal" | "github";

export type AuthenticationPrincipalType = {
  id: string;
  name: string;
  roles: string[];
  provider: AuthenticationProviderType;
  avatarUrl?: string;
  userHandle?: string;
};
