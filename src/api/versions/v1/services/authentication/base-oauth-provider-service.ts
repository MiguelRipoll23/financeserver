import { ServerError } from "../../models/server-error.ts";

/**
 * Base class for OAuth provider services that handles common
 * initialization and validation patterns
 */
export abstract class BaseOAuthProviderService {
  protected isEnabled: boolean = false;

  /**
   * Validates that required credentials are present and not empty
   */
  protected validateCredentials(
    ...credentials: Array<string | undefined>
  ): boolean {
    return credentials.every(Boolean);
  }

  /**
   * Asserts that the OAuth provider is enabled, throwing an error if not
   */
  protected assertEnabled(providerName: string): void {
    if (!this.isEnabled) {
      throw new ServerError(
        `${providerName.toUpperCase()}_OAUTH_UNAVAILABLE`,
        `${providerName} OAuth is not configured on this server`,
        503
      );
    }
  }

  /**
   * Checks if the OAuth provider is enabled
   */
  public isProviderEnabled(): boolean {
    return this.isEnabled;
  }
}
