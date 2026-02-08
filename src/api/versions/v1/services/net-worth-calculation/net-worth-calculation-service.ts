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
    try {
      // 1. Calculate for all bank accounts with active interest rates
      await this.interestRatesService.calculateAllBankAccountInterestRates();

      // 2. Calculate for all roboadvisors
      await this.roboadvisorsService.calculateAllRoboadvisors();

      // 3. Calculate for all crypto exchange balances
      await this.cryptoBalancesService.calculateAllCryptoBalances();

      console.log("Net worth calculation completed successfully");
    } catch (error) {
      console.error("Error in calculateAll:", error);
      throw error;
    }
  }
}
