import { z } from 'zod';

// Schema for extracted transaction
export const TransactionSchema = z.object({
  amount: z.number().describe('The monetary amount of the transaction'),
  currency: z.string().describe('Currency code (USD, ARS, EUR, etc.)'),
  type: z.enum(['income', 'expense']).describe('Type of transaction'),
  description: z.string().describe('Description of what the transaction is for'),
  date: z.string().optional().describe('Date of the transaction in YYYY-MM-DD format if mentioned'),
  merchant: z.string().optional().describe('Merchant or source of the transaction'),
  category: z.enum([
    'salary',         // salary, wages, paycheck, work income
    'entertainment',  // entertainment, games, streaming
    'investment',     // stocks, crypto, real estate
    'food',           // restaurants, groceries
    'transport',      // uber, gas, public transport
    'services',       // internet, phone, subscriptions
    'health',         // medical, pharmacy, gym
    'education',      // courses, books, tools
    'housing',        // rent, furniture, repairs
    'clothing',       // clothing purchases
    'other'           // everything else
  ]).describe('Category of the transaction'),
});

export const NoTransactionSchema = z.object({
  transaction: z.null().describe('No transaction found'),
  reason: z.string().describe('Why no transaction was found'),
});

// Type exports
export type ExtractedTransaction = z.infer<typeof TransactionSchema>;
export type NoTransactionResult = z.infer<typeof NoTransactionSchema>;
