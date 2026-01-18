import { generateText, Output, type LangSmithOptions } from '../ai/wrapped-ai';
import { aiModel, aiModelReasoner, getModelName } from '../ai/index';
import { TransactionResponseSchema } from '../ai/agents/transaction-agent';

/**
 * Test para verificar si deepseek-reasoner realmente se está usando
 * o si se degrada automáticamente a deepseek-chat cuando usamos structured output
 */

const TEST_EMAIL = `
Subject: Payment confirmation
You paid $50.00 USD to Netflix on January 15, 2026.
Thank you for your payment.
`;

const SIMPLE_PROMPT = `
Analyze this email and extract transaction info.
Return JSON with: amount, currency, type (income/expense), merchant, category.

Email: ${TEST_EMAIL}
`;

async function testWithStructuredOutput(modelName: string) {
    console.log(`\n🔵 Test: ${modelName} CON structured output (Output.object)`);
    console.log('─'.repeat(60));

    const model = modelName === 'deepseek-reasoner' ? aiModelReasoner : aiModel;
    const startTime = Date.now();

    const langsmithOptions: LangSmithOptions = {
        tags: [getModelName(model), 'test'],
        metadata: {
            test_name: 'reasoner-detection',
            model_name: modelName,
            has_structured_output: true,
        }
    };

    try {
        const result = await generateText({
            model: model,
            prompt: SIMPLE_PROMPT,
            temperature: 0.1,
            output: Output.object({
                schema: TransactionResponseSchema,
            }),
            providerOptions: {
                langsmith: langsmithOptions
            }
        });

        const latency = Date.now() - startTime;

        console.log(`✅ Éxito`);
        console.log(`⏱️  Latencia: ${latency}ms`);
        console.log(`📦 Response usage:`, result.usage);
        console.log(`🔍 Response metadata:`, result.experimental_providerMetadata);

        return latency;
    } catch (error) {
        console.log(`❌ Error:`, error);
        return Date.now() - startTime;
    }
}

async function testWithoutStructuredOutput(modelName: string) {
    console.log(`\n🟢 Test: ${modelName} SIN structured output (respuesta libre)`);
    console.log('─'.repeat(60));

    const model = modelName === 'deepseek-reasoner' ? aiModelReasoner : aiModel;
    const startTime = Date.now();

    const langsmithOptions: LangSmithOptions = {
        tags: [getModelName(model), 'test'],
        metadata: {
            test_name: 'reasoner-detection',
            model_name: modelName,
            has_structured_output: false,
        }
    };

    try {
        const result = await generateText({
            model: model,
            prompt: SIMPLE_PROMPT + "\n\nIMPORTANT: Return ONLY valid JSON, nothing else.",
            temperature: 0.1,
            // NO output: Output.object() - respuesta libre
            providerOptions: {
                langsmith: langsmithOptions
            }
        });

        const latency = Date.now() - startTime;

        console.log(`✅ Éxito`);
        console.log(`⏱️  Latencia: ${latency}ms`);
        console.log(`📦 Response usage:`, result.usage);
        console.log(`🔍 Response metadata:`, result.experimental_providerMetadata);
        console.log(`📝 Response text (primeros 200 chars):`, result.text.substring(0, 200));

        return latency;
    } catch (error) {
        console.log(`❌ Error:`, error);
        return Date.now() - startTime;
    }
}

async function runTests() {
    console.log('='.repeat(80));
    console.log('TEST: ¿DeepSeek Reasoner se degrada a Chat con Structured Output?');
    console.log('='.repeat(80));

    // Test 1: Chat con structured output (baseline)
    const chatStructured = await testWithStructuredOutput('deepseek-chat');

    // Test 2: Reasoner con structured output (debería degradarse a chat)
    const reasonerStructured = await testWithStructuredOutput('deepseek-reasoner');

    // Test 3: Chat sin structured output
    const chatFree = await testWithoutStructuredOutput('deepseek-chat');

    // Test 4: Reasoner sin structured output (debería ser MUY lento si funciona)
    const reasonerFree = await testWithoutStructuredOutput('deepseek-reasoner');

    console.log('\n');
    console.log('='.repeat(80));
    console.log('📊 RESUMEN');
    console.log('='.repeat(80));
    console.log('\nCON Structured Output (Output.object):');
    console.log(`  • deepseek-chat:     ${chatStructured}ms`);
    console.log(`  • deepseek-reasoner: ${reasonerStructured}ms`);

    if (Math.abs(chatStructured - reasonerStructured) < 2000) {
        console.log(`  ⚠️  AMBOS son similares → Reasoner se DEGRADÓ a Chat`);
    } else {
        console.log(`  ✅ Hay diferencia significativa → Reasoner funcionó`);
    }

    console.log('\nSIN Structured Output (respuesta libre):');
    console.log(`  • deepseek-chat:     ${chatFree}ms`);
    console.log(`  • deepseek-reasoner: ${reasonerFree}ms`);

    if (Math.abs(chatFree - reasonerFree) < 2000) {
        console.log(`  ⚠️  AMBOS son similares → Reasoner NO funcionó correctamente`);
    } else {
        console.log(`  ✅ Hay diferencia significativa → Reasoner funcionó`);
    }

    console.log('\n');
    console.log('='.repeat(80));
    console.log('💡 CONCLUSIÓN');
    console.log('='.repeat(80));

    const avgChatStructured = chatStructured;
    const avgReasonerStructured = reasonerStructured;

    if (Math.abs(avgChatStructured - avgReasonerStructured) < 2000) {
        console.log('❌ CON structured output: deepseek-reasoner se DEGRADA a deepseek-chat');
        console.log('   Esto explica por qué todos aparecen como "deepseek.chat" en LangSmith.');
        console.log('');
        console.log('📌 RECOMENDACIÓN: Para tu caso de uso (extracción de transacciones),');
        console.log('   deepseek-chat es el modelo correcto y es IMPOSIBLE usar reasoner');
        console.log('   porque necesitas structured output.');
    } else {
        console.log('✅ El reasoner SÍ funciona incluso con structured output');
    }

    console.log('='.repeat(80));
}

runTests().catch(console.error);
