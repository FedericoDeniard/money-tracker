import { TransactionResponseSchema, type TransactionResponse } from './schemas.ts';
import { EMAIL_EXTRACTION_SYSTEM } from '../prompts/email-extraction.ts';
import { generateText, Output } from 'npm:ai';
import { createXai } from 'npm:@ai-sdk/xai';

const MODEL = 'grok-4-1-fast-non-reasoning';
const TEMPERATURE = 0.1;

export async function extractTransactionFromEmail(
  emailContent: string,
  userFullName?: string
): Promise<TransactionResponse> {
  try {
    const xai = createXai({
      apiKey: Deno.env.get('XAI_API_KEY') || '',
    });

    let dynamicPrompt = '';

    if (userFullName) {
      dynamicPrompt += `IMPORTANT CONTEXT: The email recipient/account owner is: ${userFullName}\nUse this to determine if money was sent BY this person (expense) or RECEIVED by this person (income).\n\n`;
    }

    dynamicPrompt += `Email to analyze:\n${emailContent}`;

    const { output } = await generateText({
      model: xai(MODEL),
      system: EMAIL_EXTRACTION_SYSTEM,
      prompt: dynamicPrompt,
      temperature: TEMPERATURE,
      output: Output.object({
        schema: TransactionResponseSchema,
      }),
    });

    if (output.hasTransaction) {
      if (output.data.amount === 0) {
        return {
          hasTransaction: false,
          reason: 'Invalid transaction: amount is 0',
        };
      }

      return {
        hasTransaction: true,
        data: {
          ...output.data,
          merchant: output.data.merchant || 'Unknown',
          date: output.data.date || undefined,
        },
      };
    }

    return {
      hasTransaction: false,
      reason: output.reason,
    };
  } catch (error) {
    console.error('AI extraction error', error);
    return {
      hasTransaction: false,
      reason: 'AI processing failed',
    };
  }
}