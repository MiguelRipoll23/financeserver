import { injectable } from "@needle-di/core";
import { metrics, Meter, diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { Resource, resourceFromAttributes } from "@opentelemetry/resources";
import {
  MeterProvider,
  MetricReader,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import {
  ENV_APP_OTEL_EXPORTER_OTLP_ENDPOINT,
  ENV_APP_OTEL_EXPORTER_OTLP_HEADERS,
  ENV_DATABASE_URL,
  ENV_DENO_DEPLOYMENT_ID,
} from "../constants/environment-constants.ts";

@injectable()
export class OTelService {
  private static readonly SERVICE_NAME = "financeserver";
  private meterProvider: MeterProvider | null = null;

  public async init(): Promise<void> {
    const endpoint = Deno.env.get(ENV_APP_OTEL_EXPORTER_OTLP_ENDPOINT);
    const headers = Deno.env.get(ENV_APP_OTEL_EXPORTER_OTLP_HEADERS);

    if (!endpoint || !headers) {
      console.warn("OTel SDK not initialized (missing configuration)");
      return;
    }

    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

    const metricReader = this.createMetricReader(endpoint, headers);
    const resource = await this.createResource();

    this.initializeSdk(metricReader, resource);
  }

  public getMeter(name: string, version?: string): Meter {
    return metrics.getMeter(name, version);
  }

  private createMetricReader(endpoint: string, headers: string): MetricReader {
    const metricExporter = this.createMetricExporter(endpoint, headers);

    return new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60000,
    });
  }

  private createMetricExporter(
    endpoint: string,
    headers: string
  ): OTLPMetricExporter {
    const normalizedEndpoint = endpoint.replace(/\/+$/, "");

    return new OTLPMetricExporter({
      url: `${normalizedEndpoint}/v1/metrics`,
      headers: this.parseHeaders(headers),
    });
  }

  private async createResource(): Promise<Resource> {
    const attributes: Record<string, string> = {
      [ATTR_SERVICE_NAME]: OTelService.SERVICE_NAME,
    };

    const databaseUrl = Deno.env.get(ENV_DATABASE_URL);
    const hostname = this.extractHostname(databaseUrl);

    if (hostname) {
      const hashedHostname = await this.hashHostname(hostname);
      attributes["database.hostname.hash"] = hashedHostname;
    }

    const deploymentId = Deno.env.get(ENV_DENO_DEPLOYMENT_ID);

    if (deploymentId) {
      attributes["deployment.id"] = deploymentId;
    }

    return resourceFromAttributes(attributes);
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
    const headers = this.parseDelimitedHeaders(headersString);

    if (headersString.startsWith("Authorization=")) {
      const authHeaders = this.parseAuthorizationHeader(headersString);
      return { ...headers, ...authHeaders };
    }

    return headers;
  }

  private parseAuthorizationHeader(
    headersString: string
  ): Record<string, string> {
    const authPrefix = "Authorization=";
    const startIndex = headersString.indexOf(authPrefix);

    if (startIndex === -1) {
      return {};
    }

    const valueStart = startIndex + authPrefix.length;
    const commaIndex = headersString.indexOf(",", valueStart);
    const value =
      commaIndex === -1
        ? headersString.substring(valueStart)
        : headersString.substring(valueStart, commaIndex);

    return { Authorization: value.trim() };
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

  private extractHostname(databaseUrl: string | undefined): string | null {
    if (!databaseUrl) {
      return null;
    }

    try {
      const url = new URL(databaseUrl);
      return url.hostname;
    } catch {
      return null;
    }
  }

  private async hashHostname(hostname: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(hostname);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }
}
