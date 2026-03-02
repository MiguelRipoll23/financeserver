import { inject, injectable } from "@needle-di/core";
import { BankAccountInterestRatesService } from "../bank-account-interest-rates/bank-account-interest-rates-service.ts";
import { BankAccountRoboadvisorsService } from "../bank-account-roboadvisors/bank-account-roboadvisors-service.ts";
import { CryptoExchangeBalancesService } from "../crypto-exchanges-balances/crypto-exchange-balances-service.ts";

@injectable()
export class NetWorthCalculationService {
  constructor(
    private interestRatesService = inject(BankAccountInterestRatesService),
    private roboadvisorsService = inject(BankAccountRoboadvisorsService),
    private cryptoBalancesService = inject(CryptoExchangeBalancesService),
  ) {}

  /**
   * Calculate all investments (batch operation)
   * Iterates through all bank accounts with interest rates, roboadvisors, and crypto balances
   * and performs after-tax calculations for each
   */
  public async calculateAll(): Promise<void> {
    const calculationPromises = [
      this.interestRatesService.calculateAllBankAccountInterestRates(),
      this.roboadvisorsService.calculateAllRoboadvisors(),
      this.cryptoBalancesService.calculateAllCryptoBalances(),
    ];

    const calculationNames = [
      "bank account interest rates",
      "roboadvisors",
      "crypto balances",
    ];

    const calculationResults = await Promise.allSettled(calculationPromises);

    const failedCalculations: string[] = [];

    for (const [index, calculationResult] of calculationResults.entries()) {
      if (calculationResult.status === "rejected") {
        const calculationName = calculationNames[index];
        console.error(
          `Net worth calculation failed for ${calculationName}:`,
          calculationResult.reason,
        );
        failedCalculations.push(calculationName);
      }
    }

    if (failedCalculations.length > 0) {
      throw new Error(
        `Net worth calculation completed with failures in: ${failedCalculations.join(", ")}`,
      );
    }

    console.log("Net worth calculation completed successfully");
  }
}
