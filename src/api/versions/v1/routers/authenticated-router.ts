import { OpenAPIHono } from "@hono/zod-openapi";
import { inject, injectable } from "@needle-di/core";
import { AuthenticationMiddleware } from "../../../middlewares/authentication-middleware.ts";
import { AuthorizationMiddleware } from "../../../middlewares/authorization-middleware.ts";
import { AuthenticatedReceiptsRouter } from "./authenticated/authenticated-receipts-router.ts";
import { AuthenticatedProductsRouter } from "./authenticated/authenticated-products-router.ts";
import { AuthenticatedBillsRouter } from "./authenticated/authenticated-bills-router.ts";
import { AuthenticatedSubscriptionsRouter } from "./authenticated/authenticated-subscriptions-router.ts";
import { AuthenticatedMerchantsRouter } from "./authenticated/authenticated-merchants-router.ts";
import { AuthenticatedMCPRouter } from "./authenticated/authenticated-mcp-router.ts";
import { AuthenticatedUsersRouter } from "./authenticated/authenticated-users-router.ts";
import { HonoVariables } from "../../../../core/types/hono/hono-variables-type.ts";

@injectable()
export class V1AuthenticatedRouter {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(
    private authenticationMiddleware = inject(AuthenticationMiddleware),
    private authorizationMiddleware = inject(AuthorizationMiddleware),
    private usersRouter = inject(AuthenticatedUsersRouter),
    private mcpRouter = inject(AuthenticatedMCPRouter),
    private billsRouter = inject(AuthenticatedBillsRouter),
    private subscriptionsRouter = inject(AuthenticatedSubscriptionsRouter),
    private merchantsRouter = inject(AuthenticatedMerchantsRouter),
    private receiptsRouter = inject(AuthenticatedReceiptsRouter),
    private productsRouter = inject(AuthenticatedProductsRouter)
  ) {
    this.app = new OpenAPIHono();
    this.setMiddlewares();
    this.setRoutes();
  }

  public getRouter(): OpenAPIHono<{ Variables: HonoVariables }> {
    return this.app;
  }

  private setMiddlewares(): void {
    this.setAuthenticationMiddleware();
    this.setAuthorizationMiddleware();
  }

  private setAuthenticationMiddleware(): void {
    this.app.use("*", this.authenticationMiddleware.create());
  }

  private setAuthorizationMiddleware(): void {
    this.app.use("*", this.authorizationMiddleware.create());
  }

  private setRoutes(): void {
    this.app.route("/users", this.usersRouter.getRouter());
    this.app.route("/mcp", this.mcpRouter.getRouter());
    this.app.route("/bills", this.billsRouter.getRouter());
    this.app.route("/subscriptions", this.subscriptionsRouter.getRouter());
    this.app.route("/merchants", this.merchantsRouter.getRouter());
    this.app.route("/receipts", this.receiptsRouter.getRouter());
    this.app.route("/products", this.productsRouter.getRouter());
  }
}
