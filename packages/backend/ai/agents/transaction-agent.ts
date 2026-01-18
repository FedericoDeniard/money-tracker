import { generateText, Output, type LangSmithOptions } from '../wrapped-ai';
import { aiModel, getModelName } from '../index';
import { TransactionSchema } from '../types/schemas';
import { EMAIL_EXTRACTION_SYSTEM } from '../prompts/email-extraction';
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

export async function extractTransactionFromEmail(emailContent: string, userFullName?: string) {
    try {
        // Construir el prompt dinámico con el contenido del email y contexto del usuario
        let dynamicPrompt = '';

        // Agregar contexto del usuario si está disponible
        if (userFullName) {
            dynamicPrompt += `IMPORTANT CONTEXT: The email recipient/account owner is: ${userFullName}\nUse this to determine if money was sent BY this person (expense) or RECEIVED by this person (income).\n\n`;
        }

        // Agregar el contenido del email
        dynamicPrompt += `Email to analyze:\n${emailContent}`;

        const langsmithOptions: LangSmithOptions = {
            tags: [getModelName(aiModel), 'extract-transaction'],
            metadata: {
                model: getModelName(aiModel),
                hasUserContext: !!userFullName,
            }
        };

        const { output } = await generateText({
            model: aiModel,
            system: EMAIL_EXTRACTION_SYSTEM, // Parte estática - permite input caching
            prompt: dynamicPrompt,            // Parte dinámica - varía en cada llamada
            temperature: 0.1,
            output: Output.object({
                schema: TransactionResponseSchema,
            }),
            providerOptions: {
                langsmith: langsmithOptions
            }
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

            // Clean up the data: convert null to undefined for optional fields
            const transactionData = {
                ...output.data,
                merchant: output.data.merchant || 'Unknown',
                date: output.data.date || undefined, // Remove null, keep only string or undefined
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
