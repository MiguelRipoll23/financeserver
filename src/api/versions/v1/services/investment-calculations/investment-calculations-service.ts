import { inject, injectable } from "@needle-di/core";
import { BankAccountInterestRatesService } from "../bank-account-interest-rates/bank-account-interest-rates-service.ts";
import { BankAccountRoboadvisorsService } from "../bank-account-roboadvisors/bank-account-roboadvisors-service.ts";
import { CryptoExchangeBalancesService } from "../crypto-exchanges-balances/crypto-exchange-balances-service.ts";

export type CalculationType = "interest_rate" | "roboadvisor" | "crypto";

export interface InterestRateCalculationRequest {
  type: "interest_rate";
  bankAccountId: number;
  currentBalance: string;
  currencyCode: string;
}

export interface RoboadvisorCalculationRequest {
  type: "roboadvisor";
  roboadvisorId: number;
}

export interface CryptoCalculationRequest {
  type: "crypto";
  cryptoExchangeId: number;
  symbolCode: string;
}

export type CalculationRequest =
  | InterestRateCalculationRequest
  | RoboadvisorCalculationRequest
  | CryptoCalculationRequest;

export interface CalculationResult {
  success: boolean;
  message: string;
  calculationType: CalculationType;
  data?: {
    monthlyProfitAfterTax?: string;
    annualProfitAfterTax?: string;
    currentValueAfterTax?: string;
    currencyCode: string;
  };
}

@injectable()
export class InvestmentCalculationsService {
  constructor(
    private interestRatesService = inject(BankAccountInterestRatesService),
    private roboadvisorsService = inject(BankAccountRoboadvisorsService),
    private cryptoBalancesService = inject(CryptoExchangeBalancesService)
  ) {}

  /**
   * Calculate investment values after tax based on type
   * @param request - Calculation request with type-specific parameters
   * @returns Calculation result with success status and data
   */
  public async calculate(
    request: CalculationRequest
  ): Promise<CalculationResult> {
    try {
      switch (request.type) {
        case "interest_rate":
          return await this.calculateInterestRate(request);

        case "roboadvisor":
          return await this.calculateRoboadvisor(request);

        case "crypto":
          return await this.calculateCrypto(request);

        default:
          return {
            success: false,
            message: "Invalid calculation type",
            calculationType: request.type,
          };
      }
    } catch (error) {
      console.error("Error in investment calculation:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown error occurred during calculation",
        calculationType: request.type,
      };
    }
  }

  private async calculateInterestRate(
    request: InterestRateCalculationRequest
  ): Promise<CalculationResult> {
    const result = await this.interestRatesService.calculateInterestAfterTax(
      request.bankAccountId,
      request.currentBalance,
      request.currencyCode
    );

    if (!result) {
      return {
        success: false,
        message: `Unable to calculate interest rate for bank account ${request.bankAccountId}. Ensure an active interest rate with tax percentage is configured.`,
        calculationType: "interest_rate",
      };
    }

    return {
      success: true,
      message: "Interest rate calculation completed successfully",
      calculationType: "interest_rate",
      data: {
        monthlyProfitAfterTax: result.monthlyProfitAfterTax,
        annualProfitAfterTax: result.annualProfitAfterTax,
        currencyCode: result.currencyCode,
      },
    };
  }

  private async calculateRoboadvisor(
    request: RoboadvisorCalculationRequest
  ): Promise<CalculationResult> {
    const result =
      await this.roboadvisorsService.calculateRoboadvisorValueAfterTax(
        request.roboadvisorId
      );

    if (!result) {
      return {
        success: false,
        message: `Unable to calculate roboadvisor value for ${request.roboadvisorId}. Ensure funds, balances, and capital gains tax are configured.`,
        calculationType: "roboadvisor",
      };
    }

    return {
      success: true,
      message: "Roboadvisor calculation completed successfully",
      calculationType: "roboadvisor",
      data: {
        currentValueAfterTax: result.currentValueAfterTax,
        currencyCode: result.currencyCode,
      },
    };
  }

  private async calculateCrypto(
    request: CryptoCalculationRequest
  ): Promise<CalculationResult> {
    const result =
      await this.cryptoBalancesService.calculateCryptoValueAfterTax(
        request.cryptoExchangeId,
        request.symbolCode
      );

    if (!result) {
      return {
        success: false,
        message: `Unable to calculate crypto value for exchange ${request.cryptoExchangeId} and symbol ${request.symbolCode}. Ensure balance, invested amount, and capital gains tax are configured.`,
        calculationType: "crypto",
      };
    }

    return {
      success: true,
      message: "Crypto calculation completed successfully",
      calculationType: "crypto",
      data: {
        currentValueAfterTax: result.currentValueAfterTax,
        currencyCode: result.currencyCode,
      },
    };
  }

  /**
   * Calculate all investments for a user (batch operation)
   * This would iterate through all accounts and perform calculations
   * @returns Summary of all calculations
   */
  public async calculateAll(): Promise<{
    success: boolean;
    results: CalculationResult[];
  }> {
    // This is a placeholder for future implementation
    // Would need to:
    // 1. Get all bank accounts with interest rates
    // 2. Get all roboadvisors
    // 3. Get all crypto balances
    // 4. Run calculations for each
    // 5. Return aggregated results

    return {
      success: false,
      results: [],
    };
  }
}
