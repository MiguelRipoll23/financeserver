import { OpenAPIHono } from "@hono/zod-openapi";
import { inject, injectable } from "@needle-di/core";
import { PublicOAuthRouter } from "./public/public-oauth-router.ts";
import { SetupRouter } from "./public/setup-router.ts";
import { PublicAuthenticationRouter } from "./public/public-authentication-router.ts";
import { PublicTestRouter } from "./public/public-test-router.ts";
import { HonoVariables } from "../../../../core/types/hono/hono-variables-type.ts";

@injectable()
export class V1PublicRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(
    private setupRouter = inject(SetupRouter),
    private oauthRouter = inject(PublicOAuthRouter),
    private publicAuthenticationRouter = inject(PublicAuthenticationRouter),
    private testRouter = inject(PublicTestRouter)
  ) {
    this.app = new OpenAPIHono<{ Variables: HonoVariables }>();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setRoutes(): void {
    // Passkey routes: setup -> authentication
    this.app.route("/registration/setup", this.setupRouter.getRouter());
    this.app.route("/authentication", this.publicAuthenticationRouter.getRouter());
    
    // OAuth routes
    this.app.route("/", this.oauthRouter.getRouter());
    
    // Test routes (no auth)
    this.app.route("/test", this.testRouter.getRouter());
  }
}
