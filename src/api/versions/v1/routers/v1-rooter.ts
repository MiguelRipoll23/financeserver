import { OpenAPIHono } from "@hono/zod-openapi";
import { V1PublicRouter } from "./public-router.ts";
import { V1AuthenticatedRouter } from "./authenticated-router.ts";
import { inject, injectable } from "@needle-di/core";
import { NetWorthCalculationService } from "../services/net-worth-calculation/net-worth-calculation-service.ts";

@injectable()
export class V1Router {
  private app: OpenAPIHono;

  constructor(
    private publicRouter = inject(V1PublicRouter),
    private authenticatedRouter = inject(V1AuthenticatedRouter),
    private netWorthCalculationService = inject(NetWorthCalculationService)
  ) {
    this.app = new OpenAPIHono();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono {
    return this.app;
  }

  public runStartupTasks(): void {
    this.netWorthCalculationService.calculateAll().catch((error) => {
      console.error("Error calculating net worth during startup:", error);
    });
  }

  private setRoutes(): void {
    this.app.route("/", this.publicRouter.getRouter());
    this.app.route("/", this.authenticatedRouter.getRouter());
  }
}
