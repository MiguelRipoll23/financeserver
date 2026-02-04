import { inject, injectable } from "@needle-di/core";
import { sql } from "drizzle-orm";
import { DatabaseService } from "../../../../../core/services/database-service.ts";
import { BankAccountInterestRatesService } from "../bank-account-interest-rates/bank-account-interest-rates-service.ts";
import { BankAccountRoboadvisorsService } from "../bank-account-roboadvisors/bank-account-roboadvisors-service.ts";
import { CryptoExchangeBalancesService } from "../crypto-exchanges-balances/crypto-exchange-balances-service.ts";
import {
  bankAccountBalancesTable,
  bankAccountRoboadvisors,
  cryptoExchangeBalancesTable,
} from "../../../../../db/schema.ts";

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
    private databaseService = inject(DatabaseService),
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
          const exhaustiveCheck: never = request;
          return {
            success: false,
            message: "Invalid calculation type",
            calculationType: (exhaustiveCheck as any).type,
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
        calculationType: "interest_rate" as CalculationType,
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
   * Calculate all investments (batch operation)
   * Iterates through all bank accounts with interest rates, roboadvisors, and crypto balances
   * and performs after-tax calculations for each
   */
  public async calculateAll(): Promise<void> {
    try {
      const db = this.databaseService.get();

      // 1. Calculate for all bank accounts with active interest rates
      await this.calculateAllBankAccountInterestRates(db);

      // 2. Calculate for all roboadvisors
      await this.calculateAllRoboadvisors(db);

      // 3. Calculate for all crypto exchange balances
      await this.calculateAllCryptoBalances(db);

      console.log("Net worth calculation completed successfully");
    } catch (error) {
      console.error("Error in calculateAll:", error);
      throw error;
    }
  }

  /**
   * Calculate after-tax interest for all bank accounts with active interest rates
   */
  private async calculateAllBankAccountInterestRates(
    db: any
  ): Promise<void> {
    try {
      // Get all bank accounts with their latest balances
      const bankAccountsWithBalances = await db
        .select({
          bankAccountId: bankAccountBalancesTable.bankAccountId,
          balance: bankAccountBalancesTable.balance,
          currencyCode: bankAccountBalancesTable.currencyCode,
        })
        .from(bankAccountBalancesTable)
        .innerJoin(
          sql`(
            SELECT bank_account_id, MAX(created_at) as latest_date
            FROM bank_account_balances
            GROUP BY bank_account_id
          ) latest`,
          sql`${bankAccountBalancesTable.bankAccountId} = latest.bank_account_id 
              AND ${bankAccountBalancesTable.createdAt} = latest.latest_date`
        );

      console.log(
        `Processing ${bankAccountsWithBalances.length} bank accounts with interest rates`
      );

      // Calculate interest after tax for each account
      for (const account of bankAccountsWithBalances) {
        try {
          await this.interestRatesService.calculateInterestAfterTax(
            account.bankAccountId,
            account.balance,
            account.currencyCode
          );
        } catch (error) {
          console.error(
            `Failed to calculate interest for bank account ${account.bankAccountId}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error calculating bank account interest rates:", error);
      throw error;
    }
  }

  /**
   * Calculate after-tax value for all roboadvisors
   */
  private async calculateAllRoboadvisors(db: any): Promise<void> {
    try {
      // Get all roboadvisors
      const roboadvisors = await db
        .select({ id: bankAccountRoboadvisors.id })
        .from(bankAccountRoboadvisors);

      console.log(`Processing ${roboadvisors.length} roboadvisors`);

      // Calculate value after tax for each roboadvisor
      for (const roboadvisor of roboadvisors) {
        try {
          await this.roboadvisorsService.calculateRoboadvisorValueAfterTax(
            roboadvisor.id
          );
        } catch (error) {
          console.error(
            `Failed to calculate roboadvisor ${roboadvisor.id}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error calculating roboadvisors:", error);
      throw error;
    }
  }

  /**
   * Calculate after-tax value for all crypto exchange balances
   */
  private async calculateAllCryptoBalances(db: any): Promise<void> {
    try {
      // Get all crypto exchange balances
      const balances = await db
        .select({
          cryptoExchangeId: cryptoExchangeBalancesTable.cryptoExchangeId,
          symbolCode: cryptoExchangeBalancesTable.symbolCode,
        })
        .from(cryptoExchangeBalancesTable);

      console.log(`Processing ${balances.length} crypto balances`);

      // Calculate value after tax for each balance
      for (const balance of balances) {
        try {
          await this.cryptoBalancesService.calculateCryptoValueAfterTax(
            balance.cryptoExchangeId,
            balance.symbolCode
          );
        } catch (error) {
          console.error(
            `Failed to calculate crypto balance for exchange ${balance.cryptoExchangeId} symbol ${balance.symbolCode}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error calculating crypto balances:", error);
      throw error;
    }
  }
}
