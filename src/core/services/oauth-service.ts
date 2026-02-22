import { injectable } from "@needle-di/core";
import {
  OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  OAUTH_CODE_CHALLENGE_METHODS_SUPPORTED,
  OAUTH_GRANT_TYPES_SUPPORTED,
  OAUTH_PROTECTED_RESOURCE_DOCUMENTATION_URL,
  OAUTH_PROTECTED_RESOURCE_PATH,
  OAUTH_REFRESH_TOKEN_EXPIRES_IN_SECONDS,
  OAUTH_RESPONSE_TYPES_SUPPORTED,
  OAUTH_SCOPES_SUPPORTED,
  OAUTH_SERVICE_DOCUMENTATION_URL,
  OAUTH_TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED,
} from "../constants/oauth-constants.ts";
import { UrlUtils } from "../utils/url-utils.ts";
import type { OAuthAuthorizationServerType } from "../types/oauth/oauth-authorization-server-type.ts";
import type { OAuthProtectedResourceMetadata } from "../types/oauth/oauth-protected-resource-metadata-type.ts";

@injectable()
export class OAuthService {
  public getAuthorizationServerMetadata(
    requestUrl: string,
  ): OAuthAuthorizationServerType {
    const applicationBaseURL = UrlUtils.getApplicationBaseURL(requestUrl);

    return {
      issuer: applicationBaseURL,
      authorization_endpoint: new URL(
        "/api/v1/oauth/authorize",
        applicationBaseURL,
      ).toString(),
      token_endpoint: new URL(
        "/api/v1/oauth/token",
        applicationBaseURL,
      ).toString(),
      scopes_supported: [...OAUTH_SCOPES_SUPPORTED] as [string, ...string[]],
      response_types_supported: [...OAUTH_RESPONSE_TYPES_SUPPORTED] as [
        string,
        ...string[],
      ],
      grant_types_supported: [...OAUTH_GRANT_TYPES_SUPPORTED] as [
        string,
        ...string[],
      ],
      token_endpoint_auth_methods_supported: [
        ...OAUTH_TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED,
      ] as [string, ...string[]],
      code_challenge_methods_supported: [
        ...OAUTH_CODE_CHALLENGE_METHODS_SUPPORTED,
      ] as [string, ...string[]],
      revocation_endpoint: new URL(
        "/api/v1/oauth/revoke",
        applicationBaseURL,
      ).toString(),
      service_documentation: OAUTH_SERVICE_DOCUMENTATION_URL,
      registration_endpoint: new URL(
        "/api/v1/oauth/register",
        applicationBaseURL,
      ).toString(),
      access_token_expires_in: OAUTH_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      refresh_token_expires_in: OAUTH_REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    };
  }

  public getProtectedResourceMetadata(
    requestUrl: string,
  ): OAuthProtectedResourceMetadata {
    const applicationBaseURL = UrlUtils.getApplicationBaseURL(requestUrl);

    return {
      issuer: applicationBaseURL,
      resource: new URL(
        OAUTH_PROTECTED_RESOURCE_PATH,
        applicationBaseURL,
      ).toString(),
      authorization_servers: [applicationBaseURL],
      scopes_supported: [...OAUTH_SCOPES_SUPPORTED],
      resource_documentation: OAUTH_PROTECTED_RESOURCE_DOCUMENTATION_URL,
    };
  }
}
