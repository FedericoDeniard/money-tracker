import { generateText, Output } from 'ai';
import { aiModel } from '../index';
import { TransactionSchema } from '../types/schemas';
import { EMAIL_EXTRACTION_PROMPT } from '../prompts/email-extraction';
import { z } from 'zod';
import { gmailLogger } from '../../src/config/logger';
import { traceable } from 'langsmith/traceable';

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

// Internal function that does the actual extraction
async function _extractTransactionFromEmail(emailContent: string) {
    try {
        const prompt = EMAIL_EXTRACTION_PROMPT.replace('{emailContent}', emailContent);

        gmailLogger.info('Starting LangSmith trace for email extraction', {
            emailLength: emailContent.length,
            emailPreview: emailContent.substring(0, 100) + '...'
        });

        const { output } = await generateText({
            model: aiModel,
            prompt: prompt,
            temperature: 0.1,
            output: Output.object({
                schema: TransactionResponseSchema,
            }),
        });

        if (output.hasTransaction) {
            // Ensure merchant is never null
            const transactionData = {
                ...output.data,
                merchant: output.data.merchant || 'Unknown'
            };
            gmailLogger.info('LangSmith trace completed - transaction found', {
                amount: transactionData.amount,
                currency: transactionData.currency,
                type: transactionData.type
            });
            return { success: true, data: transactionData };
        }

        gmailLogger.info('LangSmith trace completed - no transaction found', {
            reason: output.reason
        });
        return { success: true, data: { reason: output.reason } };
    } catch (error) {
        gmailLogger.error('Error in extractTransactionFromEmail (LangSmith trace failed)', { error });
        return {
            success: false,
            error: 'Failed to extract transaction from email',
        };
    }
}

// Wrapped version with LangSmith tracing
export const extractTransactionFromEmail = traceable(
    _extractTransactionFromEmail,
    {
        name: 'extract-transaction',
        run_type: 'llm',
        tags: ['email-extraction', 'transaction', 'deepseek'],
        metadata: {
            model: 'deepseek-chat',
            provider: 'deepseek'
        }
    }
);
