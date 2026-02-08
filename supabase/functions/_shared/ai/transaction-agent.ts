import { TransactionResponseSchema, type TransactionResponse } from './schemas.ts';
import { EMAIL_EXTRACTION_SYSTEM } from '../prompts/email-extraction.ts';
import { generateText, Output } from 'npm:ai';
import { createXai } from 'npm:@ai-sdk/xai';
import type { ImageAttachment } from '../lib/attachment-extractor.ts';
import { traceOperation } from '../lib/langfuse.ts';

const MODEL = 'grok-4-1-fast-non-reasoning';
const TEMPERATURE = 0.1;

export async function extractTransactionFromEmail(
  emailContent: string,
  userFullName?: string,
  images?: ImageAttachment[],
  pdfTexts?: string[]
): Promise<TransactionResponse> {
  return await traceOperation("ai-transaction-processing", async () => {
  try {
    const xai = createXai({
      apiKey: Deno.env.get('XAI_API_KEY') || '',
    });

    let dynamicPrompt = '';

    if (userFullName) {
      dynamicPrompt += `IMPORTANT CONTEXT: The email recipient/account owner is: ${userFullName}\nUse this to determine if money was sent BY this person (expense) or RECEIVED by this person (income).\n\n`;
    }

    dynamicPrompt += `Email to analyze:\n${emailContent}`;

    if (pdfTexts && pdfTexts.length > 0) {
      for (const pdfText of pdfTexts) {
        dynamicPrompt += `\n\n--- PDF ATTACHMENT ---\n${pdfText}`;
      }
    }

    if (images && images.length > 0) {
      dynamicPrompt += `\n\nNote: ${images.length} image attachment(s) are included below. These may contain receipts, invoices, or transaction details. Analyze them along with the email text.`;
    }

    // Build generateText options
    const baseOptions = {
      model: xai(MODEL),
      system: EMAIL_EXTRACTION_SYSTEM,
      temperature: TEMPERATURE,
      output: Output.object({
        schema: TransactionResponseSchema,
      }),
    };

    let output;

    if (images && images.length > 0) {
      // Use messages format with image parts
      const contentParts: any[] = [
        { type: 'text' as const, text: dynamicPrompt },
      ];

      for (const img of images) {
        contentParts.push({
          type: 'image' as const,
          image: img.data,
          mimeType: img.mimeType,
        });
      }

      const result = await generateText({
        ...baseOptions,
        messages: [
          {
            role: 'user',
            content: contentParts,
          },
        ],
      });
      output = result.output;
    } else {
      // Text-only: use simple prompt format
      const result = await generateText({
        ...baseOptions,
        prompt: dynamicPrompt,
      });
      output = result.output;
    }

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
  }, {
    imageCount: images?.length || 0,
    pdfCount: pdfTexts?.length || 0,
    contentLength: emailContent.length,
    hasUserContext: !!userFullName
  });
}