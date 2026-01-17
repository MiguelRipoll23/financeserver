import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import resourcesModule from "@opentelemetry/resources";
import { injectable } from "@needle-di/core";
import {
  ENV_APP_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
  ENV_APP_OTEL_EXPORTER_OTLP_HEADERS,
  ENV_DATABASE_URL,
} from "../constants/environment-constants.ts";
import { DomainOTelService } from "../interfaces/otel/domain-otel-service-interface.ts";

const { resourceFromAttributes } = resourcesModule;

@injectable()
export class OTelService {
  private static readonly EXPORT_INTERVAL_MS = 3600000; // 1 hour

  private meterProvider: MeterProvider | null = null;
  private isInitialized = false;
  private domainServices: DomainOTelService[] = [];

  constructor() {}

  public registerDomainService(service: DomainOTelService): void {
    this.domainServices.push(service);
  }

  public async init(): Promise<void> {
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

      const resource = await this.createResource();
      this.meterProvider = new MeterProvider({
        readers: [reader],
        resource,
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
      throw error;
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

  private async createResource() {
    const attributes: Record<string, string> = {};

    const databaseUrl = Deno.env.get(ENV_DATABASE_URL);
    if (databaseUrl) {
      attributes["database_hash"] = await this.hashStringSha256(databaseUrl);
    }

    return resourceFromAttributes(attributes);
  }

  private async hashStringSha256(value: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);

    // Use Deno's crypto API for proper SHA-256 hashing
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    return hashHex;
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
