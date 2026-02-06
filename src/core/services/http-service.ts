import { logger } from "hono/logger";
import { bodyLimit } from "hono/body-limit";
import { serveStatic } from "hono/deno";
import { OpenAPIHono } from "@hono/zod-openapi";
import { inject, injectable } from "@needle-di/core";
import { OpenAPIService } from "./openapi-service.ts";
import { APIRouter } from "../../api/routers/api-router.ts";
import { RootRouter } from "../routers/root-rooter.ts";
import { ErrorHandlingService } from "./error-handling-service.ts";
import { HonoVariables } from "../types/hono/hono-variables-type.ts";
import { ServerError } from "../../api/versions/v1/models/server-error.ts";
import { cors } from "hono/cors";
import { JWTService } from "./jwt-service.ts";

@injectable()
export class HTTPService {
  private app: OpenAPIHono<{ Variables: HonoVariables }>;

  constructor(
    private rootRooter = inject(RootRouter),
    private apiRouter = inject(APIRouter),
    private jwtService = inject(JWTService)
  ) {
    this.app = new OpenAPIHono();
    this.configure();
    this.setMiddlewares();
    this.setRoutes();
  }

  public async listen(): Promise<void> {
    const server = Deno.serve(this.app.fetch);
    await server.finished;
  }

  private configure(): void {
    ErrorHandlingService.configure(this.app);
    OpenAPIService.configure(this.app);
  }

  private setMiddlewares(): void {
    this.app.use("*", logger());
    this.app.use("/", async (c, next) => {
      if (c.req.path === "/") {
        const jwt = await this.jwtService.createManagementToken(c.req.url);
        console.log("🔑", jwt);
      }
      await next();
    });
    this.app.use("*", serveStatic({ root: "./static" }));
    this.setCorsMiddleware();
    this.setBodyLimitMiddleware();
  }

  private setCorsMiddleware(): void {
    this.app.use(
      "*",
      cors({
        origin: (origin) => origin,
        allowMethods: ["OPTIONS", "GET", "POST", "PATCH", "DELETE"],
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "Accept",
          "mcp-protocol-version",
        ],
        credentials: true,
      })
    );
  }

  private setBodyLimitMiddleware(): void {
    this.app.use(
      "*",
      bodyLimit({
        maxSize: 10 * 1024 * 1024,
        onError: () => {
          throw new ServerError(
            "BODY_SIZE_LIMIT_EXCEEDED",
            "Request body size limit exceeded",
            413
          );
        },
      })
    );
  }

  private setRoutes(): void {
    this.app.route("/", this.rootRooter.getRouter());
    this.app.route("/api", this.apiRouter.getRouter());

    OpenAPIService.setRoutes(this.app);
  }
}
