import { injectable } from "@needle-di/core";
import { metrics, Meter } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
  MetricReader,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

@injectable()
export class OTelService {
  private sdk: NodeSDK | null = null;

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

    return new OTLPMetricExporter({
      url: `${endpoint}/v1/metrics`,
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
    this.sdk = new NodeSDK({
      resource: resource,
      metricReader: metricReader,
    });

    try {
      this.sdk.start();
      console.log("OTel SDK initialized");
    } catch (error) {
      console.error("Error initializing OTel SDK", error);
    }
  }

  private parseHeaders(headersStr: string): Record<string, string> {
    if (headersStr.startsWith("Authorization=")) {
      return this.parseAuthorizationHeader(headersStr);
    }

    return this.parseDelimitedHeaders(headersStr);
  }

  private parseAuthorizationHeader(headersStr: string): Record<string, string> {
    const value = headersStr.substring("Authorization=".length);
    return { Authorization: value };
  }

  private parseDelimitedHeaders(headersStr: string): Record<string, string> {
    const headers: Record<string, string> = {};
    const parts = headersStr.split(",");

    for (const part of parts) {
      this.parseHeaderPart(part, headers);
    }

    return headers;
  }

  private parseHeaderPart(part: string, headers: Record<string, string>): void {
    const [key, value] = part.split("=");

    if (key && value) {
      headers[key.trim()] = value.trim();
    } else if (key?.includes(":")) {
      this.parseColonDelimitedHeader(key, headers);
    }
  }

  private parseColonDelimitedHeader(
    keyStr: string,
    headers: Record<string, string>
  ): void {
    const authPart = keyStr.split("=");

    if (authPart.length === 2) {
      headers[authPart[0].trim()] = authPart[1].trim();
    } else {
      const [key, value] = keyStr.split(":");
      if (key && value) {
        headers[key.trim()] = value.trim();
      }
    }
  }
}
