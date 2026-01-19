import { createDeepSeek } from '@ai-sdk/deepseek';
import { createXai } from '@ai-sdk/xai';
import type { LanguageModel } from './wrapped-ai';

// Initialize DeepSeek client
export const aiClient = createDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY || '',
});

// Initialize xAI client for Grok
export const xaiClient = createXai({
    apiKey: process.env.XAI_API_KEY || '',
});

// Model names as constants
const MODEL_DEEPSEEK_CHAT = 'deepseek-chat';
const MODEL_DEEPSEEK_REASONER = 'deepseek-reasoner';
const MODEL_GROK_NON_REASONING = 'grok-4-1-fast-non-reasoning';  // Fast, accurate, no reasoning overhead

// Export the models you want to use
export const deepseekModel = aiClient(MODEL_DEEPSEEK_CHAT);
export const deepseekReasoner = aiClient(MODEL_DEEPSEEK_REASONER);
export const grokModel = xaiClient(MODEL_GROK_NON_REASONING);

// Primary model for production use (Grok Non-Reasoning - 100% accuracy, 4x faster)
export const aiModel = grokModel;
export const aiModelReasoner = deepseekReasoner;  // Keep DeepSeek reasoner for complex reasoning tasks

// Model registry for name resolution
const modelRegistry = new Map<LanguageModel, string>();
modelRegistry.set(deepseekModel, MODEL_DEEPSEEK_CHAT);
modelRegistry.set(deepseekReasoner, MODEL_DEEPSEEK_REASONER);
modelRegistry.set(grokModel, MODEL_GROK_NON_REASONING);

// Helper function to get model name from model instance
export function getModelName(model: LanguageModel): string {
    // Check if the model has a modelId property
    if (typeof model === 'object' && model !== null && 'modelId' in model && typeof model.modelId === 'string') {
        return model.modelId;
    }

    // Use registry to identify model
    const registeredName = modelRegistry.get(model);
    if (registeredName) {
        return registeredName;
    }

    return 'unknown-model';
}
