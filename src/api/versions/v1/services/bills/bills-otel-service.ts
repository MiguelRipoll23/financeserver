import { inject, injectable } from "@needle-di/core";
import { Counter, Meter } from "@opentelemetry/api";
import { OTelService } from "../otel-service.ts";

@injectable()
export class BillsOTelService {
  private meter: Meter;
  private billAmountCounter: Counter;

  constructor(private otelService = inject(OTelService)) {
    this.meter = this.otelService.getMeter("bills-service");

    this.billAmountCounter = this.meter.createCounter("bills_amount_total", {
      description: "Total amount of bills processed",
    });
  }

  public recordBill(
    category: string,
    amount: number,
    currencyCode: string
  ): void {
    this.billAmountCounter.add(amount, {
      "bill.category": category,
      "bill.currency_code": currencyCode,
    });
  }
}
