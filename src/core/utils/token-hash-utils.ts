/**
 * Utility functions for secure token hashing and constant-time comparison.
 * Uses SHA-256 hashing and constant-time comparison to prevent timing attacks.
 */

export class TokenHashUtils {
  /**
   * Hash a token using SHA-256 and encode as lowercase hex.
   * Returns a 64-character hex string (256 bits).
   * @param token - The raw token to hash
   * @returns The hashed token as a hex string
   */
  public static async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return this.bufferToHex(hashBuffer);
  }

  /**
   * Constant-time comparison of a raw token against a hashed token.
   * Prevents timing attacks by comparing full hash regardless of match.
   * @param token - The raw token to verify
   * @param hashedToken - The stored hash to compare against
   * @returns True if token matches the hash, false otherwise
   */
  public static async verifyToken(
    token: string,
    hashedToken: string
  ): Promise<boolean> {
    const computedHash = await this.hashToken(token);
    return this.constantTimeEquals(computedHash, hashedToken);
  }

  /**
   * Convert an ArrayBuffer to a lowercase hex string.
   * @param buffer - The buffer to convert
   * @returns Hex string representation
   */
  private static bufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, "0");
    }
    return hex;
  }

  /**
   * Constant-time string comparison to prevent timing attacks.
   * Compares full length regardless of where mismatch occurs.
   * @param a - First string to compare
   * @param b - Second string to compare
   * @returns True if strings are equal, false otherwise
   */
  private static constantTimeEquals(a: string, b: string): boolean {
    // If lengths differ, they're definitely not equal, but we still compare
    // to avoid timing attacks. We pad the shorter string.
    const maxLength = Math.max(a.length, b.length);
    let result = a.length ^ b.length;

    for (let i = 0; i < maxLength; i++) {
      const charA = a.charCodeAt(i) || 0;
      const charB = b.charCodeAt(i) || 0;
      result |= charA ^ charB;
    }

    return result === 0;
  }
}
