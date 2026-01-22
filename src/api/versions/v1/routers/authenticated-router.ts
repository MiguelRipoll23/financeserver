import { OpenAPIHono } from "@hono/zod-openapi";
import { inject, injectable } from "@needle-di/core";
import { AuthenticationMiddleware } from "../../../middlewares/authentication-middleware.ts";
import { AuthorizationMiddleware } from "../../../middlewares/authorization-middleware.ts";
import { AuthenticatedReceiptsRouter } from "./authenticated/authenticated-receipts-router.ts";
import { AuthenticatedProductsRouter } from "./authenticated/authenticated-products-router.ts";
import { AuthenticatedBillsRouter } from "./authenticated/authenticated-bills-router.ts";
import { AuthenticatedSubscriptionsRouter } from "./authenticated/authenticated-subscriptions-router.ts";
import { AuthenticatedMerchantsRouter } from "./authenticated/authenticated-merchants-router.ts";
import { AuthenticatedBankAccountsRouter } from "./authenticated/authenticated-bank-accounts-router.ts";
import { AuthenticatedBankAccountBalancesRouter } from "./authenticated/authenticated-bank-account-balances-router.ts";
import { AuthenticatedBankAccountInterestRatesRouter } from "./authenticated/authenticated-bank-account-interest-rates-router.ts";
import { AuthenticatedBillCategoriesRouter } from "./authenticated/authenticated-bill-categories-router.ts";
import { AuthenticatedCryptoExchangesRouter } from "./authenticated/authenticated-crypto-exchanges-router.ts";
import { AuthenticatedCryptoExchangeBalancesRouter } from "./authenticated/authenticated-crypto-exchange-balances-router.ts";
import { AuthenticatedCashRouter } from "./authenticated/authenticated-cash-router.ts";
import { AuthenticatedCashBalancesRouter } from "./authenticated/authenticated-cash-balances-router.ts";
import { AuthenticatedMCPRouter } from "./authenticated/authenticated-mcp-router.ts";
import { AuthenticatedUsersRouter } from "./authenticated/authenticated-users-router.ts";
import { AuthenticatedSalaryChangesRouter } from "./authenticated/authenticated-salary-changes-router.ts";
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
    private bankAccountsRouter = inject(AuthenticatedBankAccountsRouter),
    private bankAccountBalancesRouter = inject(
      AuthenticatedBankAccountBalancesRouter,
    ),
    private bankAccountInterestRatesRouter = inject(
      AuthenticatedBankAccountInterestRatesRouter,
    ),
    private billCategoriesRouter = inject(AuthenticatedBillCategoriesRouter),
    private cryptoExchangesRouter = inject(AuthenticatedCryptoExchangesRouter),
    private cryptoExchangeBalancesRouter = inject(
      AuthenticatedCryptoExchangeBalancesRouter,
    ),
    private cashRouter = inject(AuthenticatedCashRouter),
    private cashBalancesRouter = inject(AuthenticatedCashBalancesRouter),
    private receiptsRouter = inject(AuthenticatedReceiptsRouter),
    private productsRouter = inject(AuthenticatedProductsRouter),
    private salaryChangesRouter = inject(AuthenticatedSalaryChangesRouter),
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
    this.app.route("/mcp", this.mcpRouter.getRouter());
    this.app.route("/users", this.usersRouter.getRouter());
    this.app.route("/cash", this.cashRouter.getRouter());
    this.app.route("/cash-balances", this.cashBalancesRouter.getRouter());
    this.app.route("/bank-accounts", this.bankAccountsRouter.getRouter());
    this.app.route(
      "/bank-account-balances",
      this.bankAccountBalancesRouter.getRouter(),
    );
    this.app.route(
      "/bank-account-interest-rates",
      this.bankAccountInterestRatesRouter.getRouter(),
    );
    this.app.route(
      "/bill-categories",
      this.billCategoriesRouter.getRouter(),
    );
    this.app.route("/crypto-exchanges", this.cryptoExchangesRouter.getRouter());
    this.app.route(
      "/crypto-exchange-balances",
      this.cryptoExchangeBalancesRouter.getRouter(),
    );
    this.app.route("/bills", this.billsRouter.getRouter());
    this.app.route("/subscriptions", this.subscriptionsRouter.getRouter());
    this.app.route("/merchants", this.merchantsRouter.getRouter());
    this.app.route("/receipts", this.receiptsRouter.getRouter());
    this.app.route("/products", this.productsRouter.getRouter());
    this.app.route("/salary-changes", this.salaryChangesRouter.getRouter());
  }
}
