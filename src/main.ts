import { Container } from "@needle-di/core";
import { HTTPService } from "./core/services/http-service.ts";
import { DatabaseService } from "./core/services/database-service.ts";
import { OTelService } from "./api/versions/v1/services/otel-service.ts";
import { BillsOTelService } from "./api/versions/v1/services/bills/bills-otel-service.ts";

const container = new Container();

const otelService = container.get(OTelService);
otelService.init();

// Initialize BillsOTelService to register metrics and callbacks
container.get(BillsOTelService);

const databaseService = container.get(DatabaseService);
databaseService.init();

const httpService = container.get(HTTPService);
await httpService.listen();
