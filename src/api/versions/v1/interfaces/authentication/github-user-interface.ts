export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
  html_url: string;
}
