/**
 * Wrapped AI SDK with LangSmith observability
 * This module wraps AI SDK functions to enable token tracking in LangSmith
 */

import * as ai from 'ai';
import { wrapAISDK } from 'langsmith/experimental/vercel';

// Wrap AI SDK functions with LangSmith observability
const { generateText, streamText, generateObject, streamObject } = wrapAISDK(ai);

// Re-export other AI SDK exports that don't need wrapping
export { Output, type LanguageModelV1 } from 'ai';

// Export wrapped functions
export { generateText, streamText, generateObject, streamObject };
