# Investment Calculations System - Implementation Status

## Completed Components

### Phase 1: Database Foundation ✓
- ✅ `bank_account_interest_rate_calculations` table created
- ✅ `bank_account_roboadvisor_fund_calculations` table created  
- ✅ `crypto_exchange_calculations` table created
- ✅ `bank_account_interest_rates` table updated with `taxPercentage` field
- ✅ `bank_account_roboadvisors` table updated with `capitalGainsTaxPercentage` field
- ✅ `crypto_exchanges` table updated with `capitalGainsTaxPercentage` field
- ✅ Database schema exports updated

### Phase 2: External Service Integration ✓
- ✅ `IndexFundPriceProvider` interface created
- ✅ `CryptoPriceProvider` interface created
- ✅ `CoingeckoAdapter` implemented (fully functional)
- ✅ `YahooFinanceAdapter` implemented (stub with documentation)
- ✅ `CryptoPriceProviderFactory` created
- ✅ `IndexFundPriceProviderFactory` created

## Remaining Work

### Phase 3: Service Layer (High Priority)
The following services need to be updated/created:

1. **Interest Rate Calculations Service** - New service to manage calculations table
2. **Roboadvisor Fund Calculations Service** - New service to manage calculations table
3. **Crypto Calculations Service** - New service to manage calculations table
4. **Update BankAccountInterestRatesService** - Add calculation method
5. **Update BankAccountRoboadvisorsService** - Add calculation method  
6. **Update CryptoExchangeBalancesService** - Add calculation method

### Phase 4: API/Schema Updates (Medium Priority)
Update schemas to include new fields:

1. **bank-account-interest-rates-schemas.ts** - Add `taxPercentage` and calculated fields
2. **bank-account-roboadvisors-schemas.ts** - Add `capitalGainsTaxPercentage` and calculated fields
3. **crypto-exchanges-schemas.ts** - Add `capitalGainsTaxPercentage`
4. **crypto-exchange-balances-schemas.ts** - Add calculated fields

### Phase 5: MCP Tools Updates (Medium Priority)
Update all MCP tools to handle new fields

### Phase 6: New Calculation Endpoint (High Priority)
1. **Investment Calculations Service** - Orchestrates all calculations
2. **Investment Calculations Router** - Async endpoint
3. **Register router** in main API

## Migration Required

To apply database changes, run this SQL:

```sql
-- Add tax fields to existing tables
ALTER TABLE bank_account_interest_rates 
ADD COLUMN IF NOT EXISTS tax_percentage NUMERIC(5, 2);

ALTER TABLE bank_account_roboadvisors 
ADD COLUMN IF NOT EXISTS capital_gains_tax_percentage NUMERIC(5, 2);

ALTER TABLE crypto_exchanges 
ADD COLUMN IF NOT EXISTS capital_gains_tax_percentage NUMERIC(5, 2);

-- Create calculations tables
CREATE TABLE IF NOT EXISTS bank_account_interest_rate_calculations (
  id BIGSERIAL PRIMARY KEY,
  bank_account_id BIGINT NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  monthly_profit_after_tax NUMERIC(15, 2) NOT NULL,
  annual_profit_after_tax NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_interest_rate_calcs_account_created 
ON bank_account_interest_rate_calculations(bank_account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS bank_account_roboadvisor_fund_calculations (
  id BIGSERIAL PRIMARY KEY,
  bank_account_roboadvisor_id BIGINT NOT NULL REFERENCES bank_account_roboadvisors(id) ON DELETE CASCADE,
  current_value_after_tax NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_roboadvisor_fund_calcs_roboadvisor_created 
ON bank_account_roboadvisor_fund_calculations(bank_account_roboadvisor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS crypto_exchange_calculations (
  id BIGSERIAL PRIMARY KEY,
  crypto_exchange_id BIGINT NOT NULL REFERENCES crypto_exchanges(id) ON DELETE CASCADE,
  symbol_code VARCHAR(10) NOT NULL,
  current_value_after_tax NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crypto_calcs_exchange_symbol_created 
ON crypto_exchange_calculations(crypto_exchange_id, symbol_code, created_at DESC);
```

## Key Calculation Methods

### Interest Rate Tax Calculation
```typescript
// In BankAccountInterestRatesService
public async calculateInterestAfterTax(
  bankAccountId: number,
  currentBalance: string,
  currencyCode: string
): Promise<{ 
  monthlyProfitAfterTax: string; 
  annualProfitAfterTax: string;
  currencyCode: string;
} | null> {
  // 1. Get active interest rate with tax percentage
  // 2. Calculate: monthlyProfit = (balance * rate / 100) / 12
  // 3. Apply tax: profitAfterTax = profit * (1 - tax / 100)
  // 4. Store in calculations table
  // 5. Return result
}
```

### Roboadvisor Capital Gains Tax Calculation
```typescript
// In BankAccountRoboadvisorsService
public async calculateRoboadvisorValueAfterTax(
  roboadvisorId: number,
  externalPriceProvider: IndexFundPriceProvider
): Promise<{ 
  currentValueAfterTax: string;
  currencyCode: string;
} | null> {
  // 1. Get roboadvisor with capital gains tax percentage
  // 2. Get all funds and balances
  // 3. Fetch current prices for funds via external provider
  // 4. Calculate current value and invested amount
  // 5. Calculate capital gain = currentValue - invested
  // 6. Apply tax ONLY to gain: valueAfterTax = currentValue - (gain * tax / 100)
  // 7. Store in calculations table
  // 8. Return result
}
```

### Crypto Capital Gains Tax Calculation
```typescript
// In CryptoExchangeBalancesService
public async calculateCryptoValueAfterTax(
  cryptoExchangeId: number,
  symbolCode: string,
  externalPriceProvider: CryptoPriceProvider
): Promise<{ 
  currentValueAfterTax: string;
  currencyCode: string;
} | null> {
  // 1. Get crypto exchange with capital gains tax
  // 2. Get balance for symbol
  // 3. Fetch current price via external provider
  // 4. Calculate current value = balance * price
  // 5. Calculate gain = currentValue - investedAmount
  // 6. Apply tax ONLY to gain: valueAfterTax = currentValue - (gain * tax / 100)
  // 7. Store in calculations table
  // 8. Return result
}
```

## Next Steps

To complete the implementation:

1. **High Priority**: Create the three calculation services for managing the calculations tables
2. **High Priority**: Add calculation methods to the existing services (interest rates, roboadvisors, crypto balances)
3. **High Priority**: Update schemas to include new fields in request/response
4. **Medium Priority**: Update all MCP tools to handle new fields
5. **High Priority**: Create investment calculations orchestration service
6. **High Priority**: Create async calculation endpoint
7. **Testing**: Test all calculations with realistic data

## Usage Example

Once complete, users can:

1. **Set tax rates** on accounts:
   ```json
   PATCH /api/v1/bank-account-interest-rates/123
   { "taxPercentage": "19.00" }
   ```

2. **Trigger calculation**:
   ```json
   POST /api/v1/investment-calculations/calculate
   {
     "type": "interest_rate",
     "bankAccountId": 456,
     "currentBalance": "10000.00",
     "currencyCode": "EUR"
   }
   ```

3. **Retrieve calculated values**:
   ```json
   POST /api/v1/bank-account-interest-rates/find
   { "bankAccountId": 456 }
   ```
   Returns interest rate with `calculatedMonthlyProfitAfterTax` and `calculatedAnnualProfitAfterTax` fields populated.

## Files Created

### Database Tables (3)
- `src/db/tables/bank-account-interest-rate-calculations-table.ts`
- `src/db/tables/bank-account-roboadvisor-fund-calculations-table.ts`
- `src/db/tables/crypto-exchange-calculations-table.ts`

### External Pricing (6)
- `src/api/versions/v1/services/external-pricing/interfaces/index-fund-price-provider-interface.ts`
- `src/api/versions/v1/services/external-pricing/interfaces/crypto-price-provider-interface.ts`
- `src/api/versions/v1/services/external-pricing/adapters/coingecko-adapter.ts`
- `src/api/versions/v1/services/external-pricing/adapters/yahoo-finance-adapter.ts`
- `src/api/versions/v1/services/external-pricing/factory/crypto-price-provider-factory.ts`
- `src/api/versions/v1/services/external-pricing/factory/index-fund-price-provider-factory.ts`

### Updated Files (4)
- `src/db/tables/bank-account-interest-rates-table.ts` - Added `taxPercentage`
- `src/db/tables/bank-account-roboadvisors-table.ts` - Added `capitalGainsTaxPercentage`
- `src/db/tables/crypto-exchanges-table.ts` - Added `capitalGainsTaxPercentage`
- `src/db/schema.ts` - Exported new tables

## Notes

- The external pricing infrastructure is ready with CoinGecko fully functional for crypto
- Yahoo Finance adapter needs ISIN-to-ticker mapping to be production-ready
- All database tables are created and ready for use
- Main remaining work is service layer methods and schema updates
- The hexagonal architecture allows easy swapping of price providers
