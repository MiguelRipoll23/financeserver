# Technical Plan

## 1. Improve Calculations Table Usage

### Current Issue

A new row is created in the `calculations` table every time a calculation is
executed.\
This leads to unnecessary data growth and makes historical tracking harder to
manage.

### Objective

Update existing calculation records instead of inserting new rows for repeated
calculations.

### Proposed Approach

- Identify a **unique constraint** for calculations (e.g. `userId + assetId`, or
  another deterministic key).
- Replace `INSERT` logic with:
  - `UPDATE` if the record already exists.
  - `INSERT` only if no matching record is found.
- Prefer using:
  - `UPSERT` (e.g. `ON CONFLICT DO UPDATE`) if supported by the database.
- Ensure:
  - `updatedAt` is refreshed on each recalculation.
  - No duplicate logical calculation entries remain.

### Tasks

- [ ] Identify correct unique key for calculations.
- [ ] Add or verify unique DB constraint.
- [ ] Refactor repository/service logic to use upsert.
- [ ] Write test to ensure no duplicate rows are created.
- [ ] Add migration if constraint is missing.

---

## 2. Implement ISIN → Ticker Conversion

src/api/versions/v1/services/external-pricing/adapters/yahoo-finance-adapter.ts

**Target file:** (Line ~56)

### Current Issue

The adapter likely expects a ticker symbol, but some assets may be stored using
ISIN.

### Objective

Support automatic conversion from ISIN to a Yahoo Finance-compatible ticker
before requesting pricing data.

### Proposed Approach

1. Detect if input is an ISIN:
   - ISIN format: 12 characters, alphanumeric, country prefix (e.g.
     `US0378331005`).
2. If ISIN:
   - Convert ISIN → ticker using:
     - External lookup API (preferred).
     - Internal mapping table (fallback).
3. Cache conversion results to reduce external calls.
4. Ensure Yahoo adapter always receives a valid ticker.

### Implementation Steps

- [ ] Add `isISIN()` helper function.
- [ ] Add `convertISINToTicker()` service.
- [ ] Integrate conversion before Yahoo request.
- [ ] Add caching layer (memory or DB).
- [ ] Add error handling if conversion fails.
- [ ] Add unit tests for:
  - Valid ISIN
  - Invalid ISIN
  - Already-valid ticker

### Optional Improvements

- Add background sync to store ISIN ↔ ticker mappings.
- Log conversion failures for observability.

---

## Acceptance Criteria

- No duplicate calculation rows are created for the same logical calculation.
- Existing rows are updated correctly.
- Yahoo pricing works with both:
  - Ticker symbols
  - ISIN codes
- Tests cover both features.
