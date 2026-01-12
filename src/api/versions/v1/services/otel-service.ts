import { injectable } from "@needle-di/core";
import { metrics, Meter } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
  MeterProvider,
  MetricReader,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

@injectable()
export class OTelService {
  private meterProvider: MeterProvider | null = null;

  public init(): void {
    const endpoint = Deno.env.get("OTEL_EXPORTER_OTLP_ENDPOINT");

    if (!endpoint) {
      console.warn(
        "OTEL_EXPORTER_OTLP_ENDPOINT not set, OTel SDK not initialized"
      );
      return;
    }

    const metricReader = this.createMetricReader(endpoint);
    const resource = this.createResource();

    this.initializeSdk(metricReader, resource);
  }

  public getMeter(name: string, version?: string): Meter {
    return metrics.getMeter(name, version);
  }

  private createMetricReader(endpoint: string): MetricReader {
    const metricExporter = this.createMetricExporter(endpoint);

    return new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60000,
    });
  }

  private createMetricExporter(endpoint: string): OTLPMetricExporter {
    const headers = Deno.env.get("OTEL_EXPORTER_OTLP_HEADERS");
    const normalizedEndpoint = endpoint.replace(/\/+$/, "");

    return new OTLPMetricExporter({
      url: `${normalizedEndpoint}/v1/metrics`,
      headers: headers ? this.parseHeaders(headers) : {},
    });
  }

  private createResource(): Resource {
    return new Resource({
      [ATTR_SERVICE_NAME]: "financeserver",
      "deployment.environment":
        Deno.env.get("DEPLOYMENT_ENVIRONMENT") || "development",
    });
  }

  private initializeSdk(metricReader: MetricReader, resource: Resource): void {
    this.meterProvider = new MeterProvider({
      resource: resource,
      readers: [metricReader],
    });

    try {
      metrics.setGlobalMeterProvider(this.meterProvider);
      console.log("OTel SDK initialized");
    } catch (error) {
      console.error("Error initializing OTel SDK", error);
    }
  }

  private parseHeaders(headersString: string): Record<string, string> {
    if (headersString.startsWith("Authorization=")) {
      return this.parseAuthorizationHeader(headersString);
    }

    return this.parseDelimitedHeaders(headersString);
  }

  private parseAuthorizationHeader(
    headersString: string
  ): Record<string, string> {
    const value = headersString.substring("Authorization=".length);
    return { Authorization: value };
  }

  private parseDelimitedHeaders(headersString: string): Record<string, string> {
    const headers: Record<string, string> = {};
    const parts = headersString.split(",");

    for (const part of parts) {
      this.parseHeaderPart(part, headers);
    }

    return headers;
  }

  private parseHeaderPart(part: string, headers: Record<string, string>): void {
    const trimmedPart = part.trim();
    const equalsIndex = trimmedPart.indexOf("=");
    const key =
      equalsIndex >= 0 ? trimmedPart.slice(0, equalsIndex).trim() : "";
    const value =
      equalsIndex >= 0 ? trimmedPart.slice(equalsIndex + 1).trim() : "";

    if (key && value) {
      headers[key] = value;
    } else if (key?.includes(":")) {
      this.parseColonDelimitedHeader(key, headers);
    }
  }

  private parseColonDelimitedHeader(
    part: string,
    headers: Record<string, string>
  ): void {
    const colonIndex = part.indexOf(":");
    if (colonIndex > 0) {
      const key = part.slice(0, colonIndex).trim();
      const value = part.slice(colonIndex + 1).trim();
      if (key && value) {
        headers[key] = value;
      }
    }
  }
}
