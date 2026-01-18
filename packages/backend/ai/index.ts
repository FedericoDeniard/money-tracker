import { createDeepSeek } from '@ai-sdk/deepseek';

// Initialize DeepSeek client
export const aiClient = createDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY || '',
});

// Model names as constants
const MODEL_CHAT_NAME = 'deepseek-chat';
const MODEL_REASONER_NAME = 'deepseek-reasoner';

// Export the models you want to use
export const aiModel = aiClient(MODEL_CHAT_NAME);
export const aiModelReasoner = aiClient(MODEL_REASONER_NAME);

// Helper function to get model name from model instance
export function getModelName(model: typeof aiModel | typeof aiModelReasoner): string {
    // Check if the model has a modelId property
    if ('modelId' in model && typeof model.modelId === 'string') {
        return model.modelId;
    }

    // Fallback: use a Map to track which model is which
    if (model === aiModel) return MODEL_CHAT_NAME;
    if (model === aiModelReasoner) return MODEL_REASONER_NAME;

    return 'unknown-model';
}
