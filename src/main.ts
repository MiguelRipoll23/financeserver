import "./crons/mod.ts";
import { HTTPService } from "./core/services/http-service.ts";
import { DatabaseService } from "./core/services/database-service.ts";
import { serviceContainer } from "./core/services/service-container.ts";

const databaseService = serviceContainer.get(DatabaseService);
databaseService.init();

const httpService = serviceContainer.get(HTTPService);
await httpService.listen();

Deno.addSignalListener("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  Deno.exit(0);
});

Deno.addSignalListener("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  Deno.exit(0);
});
