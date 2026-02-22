import {
  ENV_RP_NAME,
  ENV_WEBAUTHN_ORIGINS,
} from "../../api/versions/v1/constants/environment-constants.ts";

/**
 * Utility functions for WebAuthn origin validation and relying party configuration
 */
export class WebAuthnUtils {
  /**
   * Gets the list of allowed origins from environment variable
   * @returns Array of allowed origin patterns (may include wildcards)
   */
  public static getAllowedOrigins(): string[] {
    const originsEnv = Deno.env.get(ENV_WEBAUTHN_ORIGINS);
    if (!originsEnv) {
      // Default to localhost:5173 for development
      return ["http://localhost:5173"];
    }
    return originsEnv.split(",").map((origin) => origin.trim());
  }

  /**
   * Checks if an origin matches a pattern (with wildcard support)
   * @param origin - The origin to check (e.g., "https://preview-123.example.com")
   * @param pattern - The pattern to match against (e.g., "https://*.example.com")
   * @returns true if the origin matches the pattern
   */
  public static matchesOriginPattern(origin: string, pattern: string): boolean {
    // Exact match
    if (origin === pattern) {
      return true;
    }

    // No wildcard in pattern
    if (!pattern.includes("*")) {
      return false;
    }

    // Convert wildcard pattern to regex
    // Escape special regex characters except *
    const escapedPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");

    const regex = new RegExp(`^${escapedPattern}$`);
    return regex.test(origin);
  }

  /**
   * Validates if an origin is in the allowed list
   * @param origin - The origin to validate
   * @returns true if the origin is allowed
   */
  public static isOriginAllowed(origin: string): boolean {
    const allowedOrigins = WebAuthnUtils.getAllowedOrigins();
    return allowedOrigins.some((pattern) =>
      WebAuthnUtils.matchesOriginPattern(origin, pattern)
    );
  }

  /**
   * Extracts the relying party ID from an origin
   * @param origin - The origin URL (e.g., "https://example.com:8080")
   * @returns The hostname without port (e.g., "example.com")
   */
  public static getRelyingPartyIDFromOrigin(origin: string): string {
    try {
      const url = new URL(origin);
      return url.hostname;
    } catch {
      throw new Error(`Invalid origin URL: ${origin}`);
    }
  }

  /**
   * Gets the relying party name for WebAuthn
   * @returns The configured RP name
   */
  public static getRelyingPartyName(): string {
    return Deno.env.get(ENV_RP_NAME) || "Finance server";
  }
}
