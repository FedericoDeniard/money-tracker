import { generateText, Output, type LangSmithOptions } from '../ai/wrapped-ai';
import { aiModel, aiModelReasoner, getModelName } from '../ai/index';
import { z } from 'zod';

const SimpleSchema = z.object({
    amount: z.number(),
    merchant: z.string(),
});

async function test() {
    console.log('Test 1: deepseek-chat con tags LangSmith');
    const start1 = Date.now();

    const langsmith1: LangSmithOptions = {
        tags: [getModelName(aiModel), 'test'],
        metadata: { test_run: true }
    };

    const result1 = await generateText({
        model: aiModel,
        prompt: 'Extract: You paid $50 to Netflix. Return JSON with amount and merchant.',
        output: Output.object({ schema: SimpleSchema }),
        providerOptions: {
            langsmith: langsmith1
        }
    });

    console.log(`Latencia: ${Date.now() - start1}ms`);
    console.log(`Modelo: ${getModelName(aiModel)}`);
    console.log(`Output:`, result1.output);
    console.log('');

    console.log('Test 2: deepseek-reasoner con tags LangSmith');
    const start2 = Date.now();

    const langsmith2: LangSmithOptions = {
        tags: [getModelName(aiModelReasoner), 'test'],
        metadata: { test_run: true }
    };

    const result2 = await generateText({
        model: aiModelReasoner,
        prompt: 'Extract: You paid $50 to Netflix. Return JSON with amount and merchant.',
        output: Output.object({ schema: SimpleSchema }),
        providerOptions: {
            langsmith: langsmith2
        }
    });

    console.log(`Latencia: ${Date.now() - start2}ms`);
    console.log(`Modelo: ${getModelName(aiModelReasoner)}`);
    console.log(`Output:`, result2.output);
}

test().catch(console.error);
