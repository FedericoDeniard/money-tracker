import { generateObject } from 'ai';
import { aiModel } from '../index';
import { TransactionSchema } from '../types/schemas';
import { EMAIL_EXTRACTION_PROMPT } from '../prompts/email-extraction';
import { z } from 'zod';

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

        const { object } = await generateObject({
            model: aiModel,
            prompt: prompt,
            temperature: 0.1,
            schema: TransactionResponseSchema,
        });

        if (object.hasTransaction) {
            return { success: true, data: object.data };
        } else {
            return { success: true, data: { reason: object.reason } };
        }
    } catch (error) {
        console.error('Error in extractTransactionFromEmail:', error);
        return {
            success: false,
            error: 'Failed to extract transaction from email',
        };
    }
}
