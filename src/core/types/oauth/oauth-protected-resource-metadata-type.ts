import type { z } from "@hono/zod-openapi";
import { OAuthProtectedResourceMetadataSchema } from "../../schemas/oauth-protected-resource-metadata-schema.ts";

export type OAuthProtectedResourceMetadata = z.infer<
  typeof OAuthProtectedResourceMetadataSchema
>;
