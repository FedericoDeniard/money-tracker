import { TransactionResponseSchema, type TransactionResponse } from './schemas.ts';
import { EMAIL_EXTRACTION_SYSTEM } from '../prompts/email-extraction.ts';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const MODEL = 'grok-4-1-fast-non-reasoning';

const MAX_TOKENS = 2000;
const TEMPERATURE = 0.1;

export async function extractTransactionFromEmail(
  emailContent: string,
  userFullName?: string
): Promise<TransactionResponse> {
  try {
    let dynamicPrompt = '';

    if (userFullName) {
      dynamicPrompt += `IMPORTANT CONTEXT: The email recipient/account owner is: ${userFullName}\
Use this to determine if money was sent BY this person (expense) or RECEIVED by this person (income).\
\
`;
    }

    dynamicPrompt += `Email to analyze:\
${emailContent}`;

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('XAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: EMAIL_EXTRACTION_SYSTEM },
          { role: 'user', content: dynamicPrompt },
        ],
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return {
        hasTransaction: false,
        reason: 'No response from AI',
      };
    }

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return {
        hasTransaction: false,
        reason: 'Invalid JSON from AI',
      };
    }

    const result = TransactionResponseSchema.safeParse(parsed);
    if (!result.success) {
      return {
        hasTransaction: false,
        reason: `Validation error: ${result.error.message}`,
      };
    }

    if (result.data.hasTransaction && result.data.data.amount === 0) {
      return {
        hasTransaction: false,
        reason: 'Invalid transaction: amount is 0',
      };
    }

    return result.data;
  } catch (error) {
    console.error('AI extraction error', error);
    return {
      hasTransaction: false,
      reason: 'AI processing failed',
    };
  }
}