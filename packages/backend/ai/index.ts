import { createDeepSeek } from '@ai-sdk/deepseek';

// Initialize DeepSeek client
export const aiClient = createDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY || '',
});

// Export the model you want to use
export const aiModel = aiClient('deepseek-chat');

// You can also export other models if needed
export const aiModelReasoner = aiClient('deepseek-reasoner');
