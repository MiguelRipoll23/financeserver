import { OpenAPIHono } from "@hono/zod-openapi";
import { V1Router } from "../versions/v1/routers/v1-rooter.ts";
import { inject, injectable } from "@needle-di/core";

@injectable()
export class APIRouter {
  private app: OpenAPIHono;

  constructor(private v1Router = inject(V1Router)) {
    this.app = new OpenAPIHono();
    this.setMiddlewares();
    this.setRoutes();
    this.runStartupTasks();
  }

  public getRouter(): OpenAPIHono {
    return this.app;
  }

  public runStartupTasks(): void {
    this.v1Router.runStartupTasks();
  }

  private setMiddlewares(): void {}

  private setRoutes(): void {
    this.app.route("/v1", this.v1Router.getRouter());
  }
}
