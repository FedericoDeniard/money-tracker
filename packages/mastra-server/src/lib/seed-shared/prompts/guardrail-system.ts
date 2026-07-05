export const GUARDRAIL_SYSTEM_PROMPT = `Coarse financial email pre-filter. Decide if an email is "transactional-ish" (related to payments, banking, money movement).

Rules:
- true for: payments, transfers, charges, debits, credits, invoices, receipts, bank statements, loans, insurance, investments, salary, purchases.
- false for: social notifications, newsletters, promotions, password resets, welcome emails, spam, or anything with zero financial context.
- When in doubt: true.

Respond with JSON: {"shouldProcess": boolean, "reason": string}`;
