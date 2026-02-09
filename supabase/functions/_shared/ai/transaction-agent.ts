import { TransactionResponseSchema, type TransactionResponse } from './schemas.ts';
import { EMAIL_EXTRACTION_SYSTEM } from '../prompts/email-extraction.ts';
import { generateText, Output } from 'npm:ai';
import { createOpenAI } from "npm:ai";
import { generateObject } from "npm:ai";
import { createXai } from "npm:@ai-sdk/xai";
import { z } from "npm:zod";
import { traceOperation } from "../lib/langfuse.ts";

// Date validation helper
function validateAndFixDate(dateString?: string): string | undefined {
  if (!dateString) return undefined;
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date detected: ${dateString}, using current date`);
      return new Date().toISOString().split('T')[0];
    }
    
    // Check if date is in reasonable range (not too far in future)
    const now = new Date();
    const maxFutureDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now
    
    if (date > maxFutureDate) {
      console.warn(`Future date detected: ${dateString}, using current date`);
      return new Date().toISOString().split('T')[0];
    }
    
    // Return in YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn(`Date validation error for ${dateString}:`, error);
    return new Date().toISOString().split('T')[0];
  }
}

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
    let usage: any = null;

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
      usage = result.usage; // Capture usage from AI SDK
    } else {
      // Text-only: use simple prompt format
      const result = await generateText({
        ...baseOptions,
        prompt: dynamicPrompt,
      });
      output = result.output;
      usage = result.usage; // Capture usage from AI SDK
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
          date: validateAndFixDate(output.data.date),
        },
        usage, // Include usage information for Langfuse tracking
      };

    }

    return {
      hasTransaction: false,
      reason: output.reason,
      usage, // Include usage information even for no-transaction cases
    };
  } catch (error) {
    console.error('AI extraction error', error);
    return {
      hasTransaction: false,
      reason: 'AI processing failed',
      usage: null, // No usage info on error
    };
  }
  }, {
    imageCount: images?.length || 0,
    pdfCount: pdfTexts?.length || 0,
    contentLength: emailContent.length,
    hasUserContext: !!userFullName
  });
}