import { OpenAPIHono } from "@hono/zod-openapi";
import { inject, injectable } from "@needle-di/core";
import { PublicOAuthRouter } from "./public/public-oauth-router.ts";
import { HonoVariables } from "../../../../core/types/hono/hono-variables-type.ts";

@injectable()
export class V1PublicRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(private oauthRouter = inject(PublicOAuthRouter)) {
    this.app = new OpenAPIHono<{ Variables: HonoVariables }>();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    this.app.route("/", this.oauthRouter.getRouter());
  }
}
