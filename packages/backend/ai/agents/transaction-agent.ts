import { generateText, Output } from 'ai';
import { aiModel } from '../index';
import { TransactionSchema } from '../types/schemas';
import { EMAIL_EXTRACTION_PROMPT } from '../prompts/email-extraction';
import { z } from 'zod';
import { gmailLogger } from '../../src/config/logger';

// Combined schema for the response
export const TransactionResponseSchema = z.discriminatedUnion('hasTransaction', [
    z.object({
        hasTransaction: z.literal(true),
        data: TransactionSchema,
    }),
    z.object({
        hasTransaction: z.literal(false),
        reason: z.string(),
    }),
]);

export type TransactionResponse = z.infer<typeof TransactionResponseSchema>;

export async function extractTransactionFromEmail(emailContent: string) {
    try {
        const prompt = EMAIL_EXTRACTION_PROMPT.replace('{emailContent}', emailContent);

        const { output } = await generateText({
            model: aiModel,
            prompt: prompt,
            temperature: 0.1,
            output: Output.object({
                schema: TransactionResponseSchema,
            }),
        });

        if (output.hasTransaction) {
            // Validar que el monto no sea 0
            if (output.data.amount === 0) {
                gmailLogger.warn('Transaction with zero amount detected', {
                    amount: output.data.amount,
                    merchant: output.data.merchant,
                });
                return {
                    success: true,
                    data: {
                        reason: 'Invalid transaction: amount is 0. Unable to extract valid amount from email content.'
                    }
                };
            }

            // Ensure merchant is never null
            const transactionData = {
                ...output.data,
                merchant: output.data.merchant || 'Unknown'
            };
            return { success: true, data: transactionData };
        }

        return { success: true, data: { reason: output.reason } };
    } catch (error) {
        gmailLogger.error('Error in extractTransactionFromEmail', { error });
        return {
            success: false,
            error: 'Failed to extract transaction from email',
        };
    }
}
