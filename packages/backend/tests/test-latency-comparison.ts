import { generateText, Output, type LangSmithOptions } from '../ai/wrapped-ai';
import { aiModel, aiModelReasoner, getModelName } from '../ai/index';
import { TransactionResponseSchema } from '../ai/agents/transaction-agent';
import { EMAIL_EXTRACTION_PROMPT } from '../ai/prompts/email-extraction';

// ============================================================================
// DATOS DE PRUEBA
// ============================================================================

// Email simple de texto
const SIMPLE_EMAIL = `
Subject: Payment confirmation

You paid $50.00 USD to Netflix on January 15, 2026.
Thank you for your payment.
`;

// Email con PDF simulado (texto largo extraído)
const EMAIL_WITH_PDF = `
Subject: Invoice from Restaurant

--- PDF ATTACHMENT ---
                        INVOICE
                    Restaurant El Sabor
              123 Main Street, Buenos Aires
                 Tel: +54 11 1234-5678
                   
Date: January 15, 2026
Invoice #: 001-0012345

Customer: Federico García
Table: 12

Items:
- Milanesa con papas fritas ............ $3,500.00
- Ensalada mixta ....................... $1,200.00
- Coca Cola 500ml ...................... $  800.00
- Flan casero .......................... $1,500.00

Subtotal: ................................ $7,000.00
Tax (21%): ............................... $1,470.00
Service charge (10%): .................... $  700.00
TOTAL: ................................... $9,170.00

Payment method: Credit Card
Card: **** **** **** 1234
Auth code: 123456

Thank you for your visit!
Please visit us again soon.

Restaurant El Sabor
www.elsabor.com.ar
Instagram: @restauranteelsabor
--- END PDF ATTACHMENT ---
`;

// Email con imagen OCR simulada (texto menos estructurado)
const EMAIL_WITH_IMAGE = `
Subject: Receipt

--- IMAGE ATTACHMENT (OCR) ---
Mercado   Libre
COMPROBANTE   DE  PAGO
Fecha:  15/01/2026
Monto:  $25,000.00   ARS
Producto:   Notebook   Lenovo   IdeaPad   3
Vendedor:   TechStore   Argentina
Estado:   Aprobado
Medio   de   pago:   Tarjeta   de   crédito
***  1234
Cuotas:   12  sin   interés
ID   de   operación:   141888987673
--- END IMAGE ATTACHMENT (OCR) ---
`;

// Email complejo con contexto de usuario (caso actual)
const COMPLEX_EMAIL_WITH_CONTEXT = `
Subject: Transferencia realizada exitosamente

--- PDF ATTACHMENT ---
COMPROBANTE DE TRANSFERENCIA
Banco Galicia

Fecha y hora: 15/01/2026 14:30:25
Tipo de operación: Transferencia inmediata

ORIGEN:
Titular: Federico García López
CBU: 0070037120000012345678
Alias: federico.garcia
Cuenta: CA $ 123-456789/0

DESTINO:
Titular: María Rodríguez
CBU: 0170099220000087654321
Alias: maria.rodriguez
Cuenta: CA $ 987-654321/0

DATOS DE LA TRANSFERENCIA:
Importe: $ 15,000.00
Concepto: Alquiler enero 2026
Referencia: ALQ-ENE-2026
Comisión: $ 0.00

TOTAL DEBITADO: $ 15,000.00

Comprobante N°: 2026011512345
Código de autorización: AUTH-789456123

Este comprobante es válido como constancia de la operación.
Conservarlo para futuras consultas.

Banco Galicia - Atención al cliente: 0810-444-4500
--- END PDF ATTACHMENT ---

--- IMAGE ATTACHMENT (OCR) ---
[Captura   de   pantalla   de   la   app   del   banco]
Transferencia   exitosa   ✓
María   Rodríguez
$15.000,00
Hoy   14:30
--- END IMAGE ATTACHMENT (OCR) ---
`;

// ============================================================================
// FUNCIONES DE TEST
// ============================================================================

interface TestResult {
    testName: string;
    modelName: string;
    promptLength: number;
    inputLength: number;
    latency: number;
    success: boolean;
    hasTransaction: boolean;
    extractedAmount?: number;
    error?: string;
}

async function testWithModel(emailContent: string, model: typeof aiModel | typeof aiModelReasoner, modelName: string, userFullName?: string): Promise<TestResult> {
    const startTime = Date.now();
    let prompt = EMAIL_EXTRACTION_PROMPT.replace('{emailContent}', emailContent);

    // Agregar contexto del usuario si está disponible
    if (userFullName) {
        prompt = prompt.replace('{userContext}',
            `\n\nIMPORTANT CONTEXT: The email recipient/account owner is: ${userFullName}\nUse this to determine if money was sent BY this person (expense) or RECEIVED by this person (income).`
        );
    } else {
        prompt = prompt.replace('{userContext}', '');
    }

    const langsmithOptions: LangSmithOptions = {
        tags: [getModelName(model), 'test'],
        metadata: {
            test_name: 'latency-comparison',
            model_name: modelName,
        }
    };

    try {
        const { output } = await generateText({
            model: model,
            prompt: prompt,
            temperature: 0.1,
            output: Output.object({
                schema: TransactionResponseSchema,
            }),
            providerOptions: {
                langsmith: langsmithOptions
            }
        });

        const endTime = Date.now();

        return {
            testName: 'Current Prompt (Production)',
            modelName: modelName,
            promptLength: prompt.length,
            inputLength: emailContent.length,
            latency: endTime - startTime,
            success: true,
            hasTransaction: output.hasTransaction,
            extractedAmount: output.hasTransaction ? output.data.amount : undefined,
        };
    } catch (error) {
        return {
            testName: 'Current Prompt (Production)',
            modelName: modelName,
            promptLength: prompt.length,
            inputLength: emailContent.length,
            latency: Date.now() - startTime,
            success: false,
            hasTransaction: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// ============================================================================
// RUNNER PRINCIPAL
// ============================================================================

async function runLatencyComparison() {
    console.log('='.repeat(80));
    console.log('ANÁLISIS DE LATENCIA - DEEPSEEK CHAT vs DEEPSEEK REASONER');
    console.log('='.repeat(80));
    console.log('');

    const testCases = [
        { name: 'Email Simple (Texto plano)', email: SIMPLE_EMAIL, user: undefined },
        { name: 'Email con PDF (Texto largo extraído)', email: EMAIL_WITH_PDF, user: undefined },
        { name: 'Email con Imagen OCR', email: EMAIL_WITH_IMAGE, user: undefined },
        { name: 'Email Complejo con Contexto', email: COMPLEX_EMAIL_WITH_CONTEXT, user: 'Federico García López' },
    ];

    for (const testCase of testCases) {
        console.log('─'.repeat(80));
        console.log(`📧 TEST CASE: ${testCase.name}`);
        console.log(`   Input size: ${testCase.email.length} caracteres`);
        if (testCase.user) {
            console.log(`   User context: ${testCase.user}`);
        }
        console.log('─'.repeat(80));
        console.log('');

        // Test 1: deepseek-chat
        console.log('💬 Ejecutando: deepseek-chat...');
        const resultChat = await testWithModel(testCase.email, aiModel, 'deepseek-chat', testCase.user);
        printResult(resultChat);
        console.log('');

        // Test 2: deepseek-reasoner
        console.log('🧠 Ejecutando: deepseek-reasoner...');
        const resultReasoner = await testWithModel(testCase.email, aiModelReasoner, 'deepseek-reasoner', testCase.user);
        printResult(resultReasoner);
        console.log('');

        // Comparación
        console.log('📊 COMPARACIÓN:');
        console.log(`   deepseek-chat:     ${resultChat.latency}ms`);
        console.log(`   deepseek-reasoner: ${resultReasoner.latency}ms`);

        if (resultChat.success && resultReasoner.success) {
            const diff = resultReasoner.latency - resultChat.latency;
            const percentage = ((diff / resultChat.latency) * 100).toFixed(1);

            console.log('');
            console.log('   Diferencia:');
            if (diff > 0) {
                console.log(`   • Reasoner es ${diff}ms MÁS LENTO (${percentage}% más)`);
            } else {
                console.log(`   • Reasoner es ${Math.abs(diff)}ms MÁS RÁPIDO (${Math.abs(parseFloat(percentage))}% más rápido)`);
            }

            // Verificar que ambos extrajeron el mismo monto
            if (resultChat.hasTransaction && resultReasoner.hasTransaction) {
                if (resultChat.extractedAmount === resultReasoner.extractedAmount) {
                    console.log(`   • ✅ Ambos extrajeron el mismo monto: ${resultChat.extractedAmount}`);
                } else {
                    console.log(`   • ⚠️ DIFERENCIA en montos extraídos:`);
                    console.log(`     - Chat: ${resultChat.extractedAmount}`);
                    console.log(`     - Reasoner: ${resultReasoner.extractedAmount}`);
                }
            }
        }

        console.log('');
        console.log('');
    }

    console.log('='.repeat(80));
    console.log('ANÁLISIS COMPLETADO');
    console.log('='.repeat(80));
}

function printResult(result: TestResult) {
    console.log(`   ✓ Modelo: ${result.modelName}`);
    console.log(`   • Latencia: ${result.latency}ms`);
    console.log(`   • Longitud prompt: ${result.promptLength} caracteres`);
    console.log(`   • Longitud input: ${result.inputLength} caracteres`);
    console.log(`   • Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   • Has transaction: ${result.hasTransaction ? '✅' : '❌'}`);

    if (result.extractedAmount !== undefined) {
        console.log(`   • Amount extracted: ${result.extractedAmount}`);
    }

    if (result.error) {
        console.log(`   • Error: ${result.error}`);
    }
}

// ============================================================================
// EJECUTAR TESTS
// ============================================================================

runLatencyComparison().catch(console.error);
