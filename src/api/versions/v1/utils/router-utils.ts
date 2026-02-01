import type { Context } from "hono";
import { ServerError } from "../models/server-error.ts";
import type { HonoVariables } from "../../../../core/types/hono/hono-variables-type.ts";

/**
 * Reads JSON body from request, returning empty object for empty bodies.
 * Throws 400 BadRequest for malformed JSON.
 */
export async function readJsonOrEmpty(
  context: Context<{ Variables: HonoVariables }>
): Promise<unknown> {
  // Read raw body as text to distinguish empty from malformed JSON
  const bodyText = await context.req.text();

  // If empty or only whitespace, return empty object
  if (!bodyText || bodyText.trim().length === 0) {
    return {};
  }

  // Attempt to parse JSON
  try {
    return JSON.parse(bodyText);
  } catch {
    throw new ServerError(
      "INVALID_JSON",
      "Invalid JSON in request body. Please provide valid JSON.",
      400
    );
  }
}
