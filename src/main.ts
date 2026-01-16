import { Container } from "@needle-di/core";
import { HTTPService } from "./core/services/http-service.ts";
import { DatabaseService } from "./core/services/database-service.ts";


const container = new Container();



const databaseService = container.get(DatabaseService);
databaseService.init();

const httpService = container.get(HTTPService);
await httpService.listen();

Deno.addSignalListener("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  Deno.exit(0);
});

Deno.addSignalListener("SIGINT", async () => {
  console.log("SIGINT received. Shutting down gracefully...");
  Deno.exit(0);
});
