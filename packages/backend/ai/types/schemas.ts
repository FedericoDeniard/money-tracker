import { z } from 'zod';

// Valid currency codes
const VALID_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD', 'CHF',
  'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK',
  'RUB', 'TRY', 'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'BOB',
  'PYG', 'ILS', 'KRW', 'THB', 'VND', 'IDR', 'MYR', 'PHP', 'SGD',
  'HKD', 'NZD', 'ZAR', 'NGN', 'GHS', 'KES', 'EGP', 'MAD', 'TND',
  'DZD', 'LBP', 'JOD', 'IQD', 'BHD', 'KWD', 'QAR', 'SAR', 'AED', 'OMR'
] as const;

// Schema for extracted transaction
export const TransactionSchema = z.object({
  amount: z.number().describe('The monetary amount of the transaction'),
  currency: z.enum(VALID_CURRENCIES).describe('Currency code (e.g., USD, ARS, EUR, GBP, JPY). Use only the 3-letter ISO 4217 currency code, NOT symbols like "$" or "US$".'),
  type: z.enum(['income', 'expense']).describe('Type of transaction'),
  description: z.string().describe('Description of what the transaction is for'),
  date: z.string().nullable().optional().describe('Date of the transaction in YYYY-MM-DD format if mentioned'),
  merchant: z.string().describe('Merchant or source of the transaction'),
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
  reason: z.string().describe('Why no transaction was found'),
});

// Type exports
export type ExtractedTransaction = z.infer<typeof TransactionSchema>;
export type NoTransactionResult = z.infer<typeof NoTransactionSchema>;
