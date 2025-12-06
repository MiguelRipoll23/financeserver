import type { z } from "@hono/zod-openapi";
import { OAuthAuthorizationServerSchema } from "../../schemas/oauth-authorization-server-schema.ts";

export type OAuthAuthorizationServerType = z.infer<
  typeof OAuthAuthorizationServerSchema
>;
