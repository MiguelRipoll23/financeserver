# Percentage Fields Refactor - Implementation Plan

## Summary
Convert all percentage fields from string format (e.g., "2.50" = 2.50%) to decimal number format (e.g., 0.025 = 2.5%).

## Affected Fields

### Bank Account Interest Rates
- `interestRate`: string → number (e.g., "2.50" → 0.025)
- `taxPercentage`: string | null → number | null (e.g., "19.00" → 0.19)

### Bank Account Roboadvisors
- `managementFeePercentage`: string → number (e.g., "0.15" → 0.0015)
- `custodyFeePercentage`: string → number
- `fundTerPercentage`: string → number
- `totalFeePercentage`: string → number (calculated field)
- `capitalGainsTaxPercentage`: string | null → number | null (e.g., "26.00" → 0.26)

### Roboadvisor Funds
- `weight`: string → number (e.g., "0.39" → 0.39, already in correct format!)

### Crypto Exchanges
- `capitalGainsTaxPercentage`: string | null → number | null

## Files to Update

### 1. Schemas (src/api/versions/v1/schemas/)

#### bank-account-interest-rates-schemas.ts
```typescript
// Before
interestRate: z.string().regex(/^[0-9]+(\.[0-9]{1,2})?$/)
taxPercentage: z.string().regex(/^[0-9]+(\.[0-9]{1,2})?$/).optional()

// After
import { PercentageSchema, NullablePercentageSchema } from "./percentage-schema.ts";

interestRate: PercentageSchema.openapi({ example: 0.025 })
taxPercentage: NullablePercentageSchema.openapi({ example: 0.19 }).optional()
```

#### bank-account-roboadvisors-schemas.ts
```typescript
managementFeePercentage: PercentageSchema.openapi({ example: 0.0015 })
custodyFeePercentage: PercentageSchema.openapi({ example: 0.0015 })
fundTerPercentage: PercentageSchema.openapi({ example: 0.001 })
totalFeePercentage: PercentageSchema.openapi({ example: 0.004 })
capitalGainsTaxPercentage: NullablePercentageSchema.openapi({ example: 0.26 })
```

#### bank-account-roboadvisor-funds-schemas.ts
```typescript
// Weight is already in decimal format (0-1), just change type
weight: PercentageSchema.openapi({ example: 0.39 })
```

#### crypto-exchanges-schemas.ts
```typescript
capitalGainsTaxPercentage: NullablePercentageSchema.openapi({ example: 0.26 })
```

### 2. MCP Schemas (src/api/versions/v1/schemas/mcp-*.ts)

#### mcp-bank-account-interest-rates-schemas.ts
```typescript
// Remove PercentageRegex
// Change from z.string() to z.number()
interestRate: z.number().min(0).max(1).describe("Interest rate as decimal (0.025 = 2.5%)")
taxPercentage: z.number().min(0).max(1).optional().describe("Tax as decimal (0.19 = 19%)")
```

#### mcp-bank-account-roboadvisors-schemas.ts
```typescript
managementFeePercentage: z.number().min(0).max(1)
custodyFeePercentage: z.number().min(0).max(1)
fundTerPercentage: z.number().min(0).max(1)
totalFeePercentage: z.number().min(0).max(1)
capitalGainsTaxPercentage: z.number().min(0).max(1).nullable().optional()
```

#### mcp-bank-account-roboadvisor-funds-schemas.ts
```typescript
weight: z.number().min(0).max(1).describe("Fund weight as decimal (0.39 = 39%)")
```

#### mcp-crypto-exchanges-schemas.ts
```typescript
capitalGainsTaxPercentage: z.number().min(0).max(1).nullable().optional()
```

### 3. Interfaces (src/api/versions/v1/interfaces/)

#### bank-accounts/bank-account-balance-summary-interface.ts
```typescript
interestRate: number | null;
```

#### bank-account-roboadvisors/bank-account-roboadvisor-summary-interface.ts
```typescript
managementFeePercentage: number;
custodyFeePercentage: number;
fundTerPercentage: number;
totalFeePercentage: number;
capitalGainsTaxPercentage: number | null;
```

#### bank-account-roboadvisors/bank-account-roboadvisor-fund-summary-interface.ts
```typescript
weight: number;
```

#### crypto-exchanges/crypto-exchange-summary-interface.ts
```typescript
capitalGainsTaxPercentage: number | null;
```

### 4. Services - NO CALCULATION CHANGES NEEDED!

The good news: Since percentages are already stored as decimals in the database (just with different precision), the calculations in services DON'T need to change!

Example: Current calculation
```typescript
// BEFORE (treating as %)
const interestRate = parseFloat(activeRate.interestRate); // 2.50
const annualProfitBeforeTax = (balance * interestRate) / 100; // divide by 100

// AFTER (treating as decimal)
const interestRate = parseFloat(activeRate.interestRate); // 0.025
const annualProfitBeforeTax = balance * interestRate; // NO division needed
```

Services to update:
- bank-account-interest-rates-service.ts: Remove `/100` division
- bank-account-roboadvisors-service.ts: Remove `/100` division for fees and tax
- crypto-exchange-balances-service.ts: Remove `/100` division for tax

### 5. Database Table Definitions (TypeScript only - no migration)

#### bank-account-interest-rates-table.ts
```typescript
// Update precision to accommodate decimals 0-1
interestRate: numeric("interest_rate", { precision: 8, scale: 6 }).notNull(),
taxPercentage: numeric("tax_percentage", { precision: 8, scale: 6 }),
```

#### bank-account-roboadvisors-table.ts
```typescript
managementFeePercentage: decimal("management_fee_percentage", { precision: 8, scale: 6 }).notNull(),
custodyFeePercentage: decimal("custody_fee_percentage", { precision: 8, scale: 6 }).notNull(),
fundTerPercentage: decimal("fund_ter_percentage", { precision: 8, scale: 6 }).notNull(),
capitalGainsTaxPercentage: decimal("capital_gains_tax_percentage", { precision: 8, scale: 6 }),
```

#### bank-account-roboadvisor-funds-table.ts
```typescript
weight: decimal("weight", { precision: 8, scale: 6 }).notNull(),
```

#### crypto-exchanges-table.ts
```typescript
capitalGainsTaxPercentage: numeric("capital_gains_tax_percentage", { precision: 8, scale: 6 }),
```

### 6. MCP Tool Services

#### tools/create-roboadvisor-fund-tool-service.ts & update-roboadvisor-fund-tool-service.ts
```typescript
// BEFORE
const weightPct = (parseFloat(result.weight) * 100).toFixed(2);
const text = `... ${weightPct}% allocation...`;

// AFTER
const weightPercentage = (result.weight * 100).toFixed(2);
const text = `... ${weightPercentage}% allocation...`;
```

## Database Migration SQL (User will execute separately)

```sql
-- 1. Update interest rates
ALTER TABLE bank_account_interest_rates 
  ALTER COLUMN interest_rate TYPE NUMERIC(8,6),
  ALTER COLUMN tax_percentage TYPE NUMERIC(8,6);

UPDATE bank_account_interest_rates 
SET interest_rate = interest_rate / 100,
    tax_percentage = CASE WHEN tax_percentage IS NOT NULL THEN tax_percentage / 100 ELSE NULL END;

-- 2. Update roboadvisors
ALTER TABLE bank_account_roboadvisors
  ALTER COLUMN management_fee_percentage TYPE NUMERIC(8,6),
  ALTER COLUMN custody_fee_percentage TYPE NUMERIC(8,6),
  ALTER COLUMN fund_ter_percentage TYPE NUMERIC(8,6),
  ALTER COLUMN capital_gains_tax_percentage TYPE NUMERIC(8,6);

UPDATE bank_account_roboadvisors
SET management_fee_percentage = management_fee_percentage / 100,
    custody_fee_percentage = custody_fee_percentage / 100,
    fund_ter_percentage = fund_ter_percentage / 100,
    capital_gains_tax_percentage = CASE WHEN capital_gains_tax_percentage IS NOT NULL THEN capital_gains_tax_percentage / 100 ELSE NULL END;

-- Note: totalFeePercentage is calculated, not stored

-- 3. Update roboadvisor funds (weight is already in 0-1 range, just change precision)
ALTER TABLE bank_account_roboadvisor_funds
  ALTER COLUMN weight TYPE NUMERIC(8,6);

-- 4. Update crypto exchanges
ALTER TABLE crypto_exchanges
  ALTER COLUMN capital_gains_tax_percentage TYPE NUMERIC(8,6);

UPDATE crypto_exchanges
SET capital_gains_tax_percentage = CASE WHEN capital_gains_tax_percentage IS NOT NULL THEN capital_gains_tax_percentage / 100 ELSE NULL END;
```

## Testing Checklist
- [ ] Create interest rate with 2.5% → stores as 0.025
- [ ] List interest rates → returns 0.025
- [ ] Calculation uses 0.025 correctly (no /100)
- [ ] Create roboadvisor with 0.15% fees → stores as 0.0015
- [ ] List roboadvisors → returns 0.0015
- [ ] MCP tools accept/return decimal format
- [ ] Create fund with 39% weight → stores/returns as 0.39
- [ ] All calculations produce same results as before

## Breaking Changes
This is a **breaking API change**. All API clients must update to send/receive decimal percentages instead of string percentages.

Example API request changes:
```json
// BEFORE
{
  "interestRate": "2.50",
  "taxPercentage": "19.00"
}

// AFTER
{
  "interestRate": 0.025,
  "taxPercentage": 0.19
}
```
