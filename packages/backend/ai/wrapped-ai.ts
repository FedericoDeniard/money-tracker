/**
 * Wrapped AI SDK with LangSmith observability
 * This module wraps AI SDK functions to enable token tracking in LangSmith
 */

import * as ai from 'ai';
import { wrapAISDK } from 'langsmith/experimental/vercel';

// JSON compatible types for LangSmith options
type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

// Type for LangSmith provider options (compatible with JSONObject)
export interface LangSmithOptions {
    [key: string]: JSONValue | undefined;
    tags?: string[];
    metadata?: Record<string, JSONValue>;
}

// Wrap AI SDK functions with LangSmith observability, accepting langsmith options
const wrapped = wrapAISDK(ai, {
    // Default options can be set here if needed
});

// Create a typed wrapper for generateText that accepts langsmith options
type GenerateTextParams = Parameters<typeof wrapped.generateText>[0];

export function generateText(
    options: GenerateTextParams & { providerOptions?: { langsmith?: LangSmithOptions } }
) {
    return wrapped.generateText(options);
}

// Export other wrapped functions
export const { streamText, generateObject, streamObject } = wrapped;

// Re-export other AI SDK exports that don't need wrapping
export { Output, type LanguageModel } from 'ai';
