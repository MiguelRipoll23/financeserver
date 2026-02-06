export class UrlUtils {
  public static getApplicationBaseURL(requestUrl: string): string {
    try {
      const url = new URL(requestUrl);
      return `${url.protocol}//${url.host}`;
    } catch (error) {
      console.error("Invalid request URL provided to getApplicationBaseURL", error);
      throw error;
    }
  }
}
