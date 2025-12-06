import { ENV_APP_BASE_URL } from "../../api/versions/v1/constants/environment-constants.ts";
import { DEFAULT_APP_BASE_URL } from "../constants/oauth-constants.ts";

export class UrlUtils {
  public static getApplicationBaseURL(): string {
    const value = Deno.env.get(ENV_APP_BASE_URL);

    if (value === undefined || value.trim().length === 0) {
      return DEFAULT_APP_BASE_URL;
    }

    const normalizedValue = value.trim().replace(/\/$/, "");

    try {
      const url = new URL(normalizedValue);
      // Remove trailing slash that URL constructor might add
      return url.toString().replace(/\/$/, "");
    } catch (error) {
      console.error("Invalid APP_BASE_URL provided", error);
      return DEFAULT_APP_BASE_URL;
    }
  }
}
