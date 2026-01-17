import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { injectable } from "@needle-di/core";
import {
  ENV_APP_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
  ENV_APP_OTEL_EXPORTER_OTLP_HEADERS,
  ENV_DATABASE_URL,
} from "../constants/environment-constants.ts";
import { DomainOTelService } from "../interfaces/otel/domain-otel-service-interface.ts";

@injectable()
export class OTelService {
  private static readonly EXPORT_INTERVAL_MS = 3600000; // 1 hour

  private meterProvider: MeterProvider | null = null;
  private isInitialized = false;
  private domainServices: DomainOTelService[] = [];
  private databaseEndpoint: string | null = null;

  public registerDomainService(service: DomainOTelService): void {
    this.domainServices.push(service);
  }

  public init(): void {
    if (this.isInitialized) {
      return;
    }

    const endpoint = Deno.env.get(ENV_APP_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT);
    if (!endpoint) {
      console.log("OTel endpoint not configured, skipping initialization");
      return;
    }

    try {
      const headers = this.parseHeaders();
      const exporter = this.createExporter(endpoint, headers);
      const reader = new PeriodicExportingMetricReader({
        exporter,
        exportIntervalMillis: OTelService.EXPORT_INTERVAL_MS,
      });

      this.setDatabaseAttributeValue();
      this.meterProvider = new MeterProvider({
        readers: [reader],
      });

      this.isInitialized = true;
      console.log("OTel service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize OTel service:", error);
    }
  }

  public async getMeterProvider(): Promise<MeterProvider | null> {
    if (!this.isInitialized) {
      await this.init();
    }
    return this.meterProvider;
  }

  public getDatabaseEndpoint(): string | null {
    return this.databaseEndpoint;
  }

  public async pushAllMetrics(): Promise<void> {
    for (const service of this.domainServices) {
      await service.pushAllMetrics();
    }
  }

  public async forceFlush(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (!this.meterProvider) {
      return;
    }

    try {
      await this.meterProvider.forceFlush();
      console.log("OTel metrics flushed successfully");
    } catch (error) {
      console.error("Failed to flush OTel metrics:", error);
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.meterProvider) {
      return;
    }

    try {
      await this.meterProvider.forceFlush();
      await this.meterProvider.shutdown();
      console.log("OTel service shut down successfully");
    } catch (error) {
      console.error("Error shutting down OTel service:", error);
    }
  }

  public isReady(): boolean {
    return this.isInitialized && this.meterProvider !== null;
  }

  private parseHeaders(): Record<string, string> {
    const headersString = Deno.env.get(ENV_APP_OTEL_EXPORTER_OTLP_HEADERS);
    const headers: Record<string, string> = {};

    if (!headersString) {
      return headers;
    }

    try {
      const pairs = headersString.split(",");
      for (const pair of pairs) {
        const [key, ...valueParts] = pair.split("=");
        const value = valueParts.join("=");
        if (key && value) {
          headers[key.trim()] = value.trim();
        }
      }
    } catch (parseError) {
      console.error("Failed to parse OTEL headers:", parseError);
      console.log(
        'Expected format: "Key1=Value1,Key2=Value2" or "Key1=Value1"',
      );
    }

    return headers;
  }

  private setDatabaseAttributeValue(): void {
    const databaseUrl = Deno.env.get(ENV_DATABASE_URL);

    if (!databaseUrl) {
      return;
    }

    try {
      const url = new URL(databaseUrl);
      const hostname = url.hostname;
      const dbName = url.pathname.replace(/^\//, ""); // Remove leading slash

      if (hostname && dbName) {
        this.databaseEndpoint = `${hostname}/${dbName}`;
        console.log(`OTel database_endpoint set: ${this.databaseEndpoint}`);
      }
    } catch (error) {
      console.error("Failed to parse DATABASE_URL for telemetry:", error);
    }
  }

  private createExporter(
    endpoint: string,
    headers: Record<string, string>,
  ): OTLPMetricExporter {
    return new OTLPMetricExporter({
      url: endpoint,
      headers,
      concurrencyLimit: 1,
    });
  }
}
