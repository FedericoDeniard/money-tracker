import { extractTransactionFromEmail } from '../ai/agents/transaction-agent';
import { deepseekModel, grokModel, getModelName } from '../ai/index';
import type { LanguageModel } from '../ai/wrapped-ai';

/**
 * Test comparativo entre DeepSeek y Grok para detección de transacciones
 * Evalúa precisión, recall, y comportamiento en casos edge
 * 
 * NOTA: Grok Non-Reasoning es ahora el modelo principal en producción
 *       debido a su rendimiento superior (100% accuracy, 4x más rápido)
 */

// ============================================================================
// CASOS DE TEST (mismos que test-transaction-detection.ts)
// ============================================================================

const VALID_TRANSACTION_CASES: PositiveTestCase[] = [
    {
        name: 'Netflix - pago simple',
        email: `Subject: Payment confirmation
You paid $50.00 USD to Netflix on January 15, 2026.
Thank you for your payment.`,
        expected: {
            hasTransaction: true,
            amount: 50,
            type: 'expense' as const,
        }
    },
    {
        name: 'Transferencia Mercado Pago',
        email: `Comprobante de transferencia
$ 69
De: Federico García
Para: Maria Clara Osimani
Número de operación: 141888987673`,
        expected: {
            hasTransaction: true,
            amount: 69,
        }
    },
    {
        name: 'Salario depositado',
        email: `Banco Galicia - Acreditación de haberes
Se ha acreditado tu sueldo:
Monto: $500,000.00 ARS
Concepto: Sueldo Enero 2026
Empleador: TechCorp SA`,
        expected: {
            hasTransaction: true,
            amount: 500000,
            type: 'income' as const,
        }
    },
    {
        name: 'Compra supermercado',
        email: `Carrefour - Comprobante
Total: $15,420.50 ARS
Tarjeta: **** 1234
Fecha: 18/01/2026`,
        expected: {
            hasTransaction: true,
            amount: 15420.50,
        }
    },
];

const NO_TRANSACTION_CASES: NegativeTestCase[] = [
    {
        name: 'Email promocional genérico',
        email: `¡Grandes ofertas en Netflix!
Descubre nuestras nuevas series y películas.
¡Suscríbete ahora y disfruta de contenido ilimitado!`,
        reason: 'Es solo promoción, no hay pago realizado'
    },
    {
        name: 'Recordatorio de pago pendiente',
        email: `Recordatorio: Tu factura de $100 vence el 25 de enero.
Por favor realiza el pago antes de la fecha de vencimiento.`,
        reason: 'Menciona un monto pero no es un pago realizado'
    },
    {
        name: 'Email corporativo sin transacción',
        email: `Hola Federico,
Te envío el informe que me pediste.
Cualquier duda me avisas.
Saludos!`,
        reason: 'Email normal sin información financiera'
    },
    {
        name: 'Newsletter con precios',
        email: `Esta semana en oferta:
- Notebook HP: $250,000
- Mouse Logitech: $15,000
- Teclado mecánico: $45,000
¡No te lo pierdas!`,
        reason: 'Lista de precios pero no una compra real'
    },
    {
        name: 'Confirmación de cita médica',
        email: `Confirmación de turno
Dr. Juan Pérez
Fecha: 20/01/2026
Hora: 10:00 AM
Valor consulta: $8,000 (a pagar en el consultorio)`,
        reason: 'Menciona precio pero es pago futuro, no realizado'
    },
    {
        name: 'Presupuesto sin confirmar',
        email: `Presupuesto #12345
Servicio de plomería: $25,000
Materiales: $10,000
Total: $35,000
Por favor confirme para proceder.`,
        reason: 'Es un presupuesto, no una transacción confirmada'
    },
];

const EDGE_CASES: EdgeTestCase[] = [
    {
        name: 'Monto mencionado pero cancelado',
        email: `Tu pago de $100 a Netflix fue CANCELADO.
No se realizó ningún cargo.
Intenta nuevamente.`,
        shouldDetect: false,
        reason: 'Transacción cancelada, no debe detectarse'
    },
    {
        name: 'Reembolso (ingreso)',
        email: `Reembolso procesado
Monto: $50.00 USD
Devolución de Netflix
Se acreditará en 5-7 días hábiles`,
        shouldDetect: true,
        expectedType: 'income' as const,
        reason: 'Es un reembolso (ingreso de dinero)'
    },
    {
        name: 'Email con cero pesos',
        email: `Comprobante de pago
Monto: $0.00
Promoción especial - Sin cargo`,
        shouldDetect: false,
        reason: 'Monto cero, no es transacción válida'
    },
];

// ============================================================================
// TIPOS Y UTILIDADES
// ============================================================================

interface TransactionExpectation {
    hasTransaction: boolean;
    amount?: number;
    type?: 'income' | 'expense';
}

interface EdgeCaseExpectation {
    shouldDetect: boolean;
    type?: 'income' | 'expense';
}

interface TestResult {
    passed: boolean;
    expected: TransactionExpectation | EdgeCaseExpectation | { hasTransaction: boolean };
    actual: {
        amount?: number;
        type?: string;
        merchant?: string;
        currency?: string;
        reason?: string;
    };
    error?: string;
}

interface ModelStats {
    modelName: string;
    totalTests: number;
    passed: number;
    failed: number;
    truePositives: number;  // Detectó correctamente una transacción
    trueNegatives: number;  // Correctamente no detectó una no-transacción
    falsePositives: number; // Detectó transacción cuando no había
    falseNegatives: number; // No detectó transacción cuando sí había
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    totalTimeMs: number;
    avgTimeMs: number;
}

interface ComparisonResult {
    testName: string;
    deepseekResult: TestResult;
    grokResult: TestResult;
    deepseekTimeMs: number;
    grokTimeMs: number;
}

// ============================================================================
// FUNCIONES DE TEST
// ============================================================================

interface PositiveTestCase {
    name: string;
    email: string;
    expected: TransactionExpectation;
}

interface NegativeTestCase {
    name: string;
    email: string;
    reason: string;
}

interface EdgeTestCase {
    name: string;
    email: string;
    shouldDetect: boolean;
    expectedType?: 'income' | 'expense';
    reason: string;
}

async function testModelOnCase(
    testCase: PositiveTestCase | NegativeTestCase,
    model: LanguageModel,
    isPositiveCase: boolean
): Promise<TestResult> {
    const result = await extractTransactionFromEmail(testCase.email, undefined, model);

    if (isPositiveCase) {
        const positiveCase = testCase as PositiveTestCase;
        // Caso positivo: esperamos detección
        const hasTransaction = result.success && result.data && 'amount' in result.data;

        if (!hasTransaction) {
            return {
                passed: false,
                expected: positiveCase.expected,
                actual: { reason: result.data?.reason },
                error: 'False negative: no detectó transacción'
            };
        }

        const isAmountCorrect = positiveCase.expected.amount === result.data.amount;
        const isTypeCorrect = !positiveCase.expected.type || positiveCase.expected.type === result.data.type;

        if (isAmountCorrect && isTypeCorrect) {
            return {
                passed: true,
                expected: positiveCase.expected,
                actual: result.data
            };
        } else {
            return {
                passed: false,
                expected: positiveCase.expected,
                actual: result.data,
                error: `Incorrect data: amount=${result.data.amount}, type=${result.data.type}`
            };
        }
    } else {
        // Caso negativo: esperamos NO detección
        const hasTransaction = result.success && result.data && 'amount' in result.data;

        if (hasTransaction) {
            return {
                passed: false,
                expected: { hasTransaction: false },
                actual: result.data,
                error: 'False positive: detectó transacción incorrectamente'
            };
        }

        return {
            passed: true,
            expected: { hasTransaction: false },
            actual: { reason: result.data?.reason }
        };
    }
}

async function testEdgeCase(
    testCase: EdgeTestCase,
    model: LanguageModel
): Promise<TestResult> {
    const result = await extractTransactionFromEmail(testCase.email, undefined, model);
    const hasTransaction = result.success && result.data && 'amount' in result.data;

    if (hasTransaction === testCase.shouldDetect) {
        if (hasTransaction && testCase.expectedType) {
            const isTypeCorrect = result.data.type === testCase.expectedType;
            if (isTypeCorrect) {
                return {
                    passed: true,
                    expected: { shouldDetect: testCase.shouldDetect, type: testCase.expectedType },
                    actual: result.data
                };
            } else {
                return {
                    passed: false,
                    expected: { shouldDetect: testCase.shouldDetect, type: testCase.expectedType },
                    actual: result.data,
                    error: `Tipo incorrecto: esperado ${testCase.expectedType}, obtenido ${result.data.type}`
                };
            }
        }
        return {
            passed: true,
            expected: { shouldDetect: testCase.shouldDetect },
            actual: hasTransaction ? result.data : { reason: result.data?.reason }
        };
    } else {
        return {
            passed: false,
            expected: { shouldDetect: testCase.shouldDetect },
            actual: hasTransaction ? result.data : { reason: result.data?.reason },
            error: `Esperado: ${testCase.shouldDetect ? 'detectar' : 'NO detectar'}, Obtenido: ${hasTransaction ? 'detectó' : 'NO detectó'}`
        };
    }
}

async function compareModelsOnAllCases(): Promise<ComparisonResult[]> {
    const results: ComparisonResult[] = [];

    // Test casos positivos
    console.log('\n🔄 Testeando casos positivos...');
    for (const testCase of VALID_TRANSACTION_CASES) {
        console.log(`  Testing: ${testCase.name}`);

        const deepseekStart = Date.now();
        const deepseekResult = await testModelOnCase(testCase, deepseekModel, true);
        const deepseekTime = Date.now() - deepseekStart;

        const grokStart = Date.now();
        const grokResult = await testModelOnCase(testCase, grokModel, true);
        const grokTime = Date.now() - grokStart;

        results.push({
            testName: testCase.name,
            deepseekResult,
            grokResult,
            deepseekTimeMs: deepseekTime,
            grokTimeMs: grokTime,
        });
    }

    // Test casos negativos
    console.log('\n🔄 Testeando casos negativos...');
    for (const testCase of NO_TRANSACTION_CASES) {
        console.log(`  Testing: ${testCase.name}`);

        const deepseekStart = Date.now();
        const deepseekResult = await testModelOnCase(testCase, deepseekModel, false);
        const deepseekTime = Date.now() - deepseekStart;

        const grokStart = Date.now();
        const grokResult = await testModelOnCase(testCase, grokModel, false);
        const grokTime = Date.now() - grokStart;

        results.push({
            testName: testCase.name,
            deepseekResult,
            grokResult,
            deepseekTimeMs: deepseekTime,
            grokTimeMs: grokTime,
        });
    }

    // Test casos edge
    console.log('\n🔄 Testeando casos edge...');
    for (const testCase of EDGE_CASES) {
        console.log(`  Testing: ${testCase.name}`);

        const deepseekStart = Date.now();
        const deepseekResult = await testEdgeCase(testCase, deepseekModel);
        const deepseekTime = Date.now() - deepseekStart;

        const grokStart = Date.now();
        const grokResult = await testEdgeCase(testCase, grokModel);
        const grokTime = Date.now() - grokStart;

        results.push({
            testName: testCase.name,
            deepseekResult,
            grokResult,
            deepseekTimeMs: deepseekTime,
            grokTimeMs: grokTime,
        });
    }

    return results;
}

function calculateModelStats(
    results: ComparisonResult[],
    modelKey: 'deepseek' | 'grok',
    modelName: string
): ModelStats {
    const totalTests = results.length;
    let passed = 0;
    let truePositives = 0;
    let trueNegatives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    let totalTime = 0;

    results.forEach((result, index) => {
        const testResult = modelKey === 'deepseek' ? result.deepseekResult : result.grokResult;
        const timeMs = modelKey === 'deepseek' ? result.deepseekTimeMs : result.grokTimeMs;

        totalTime += timeMs;

        if (testResult.passed) {
            passed++;
        }

        // Determinar tipo de resultado
        const isPositiveCase = index < VALID_TRANSACTION_CASES.length;
        const isNegativeCase = index >= VALID_TRANSACTION_CASES.length &&
            index < VALID_TRANSACTION_CASES.length + NO_TRANSACTION_CASES.length;

        if (isPositiveCase) {
            if (testResult.passed) {
                truePositives++;
            } else {
                falseNegatives++;
            }
        } else if (isNegativeCase) {
            if (testResult.passed) {
                trueNegatives++;
            } else {
                falsePositives++;
            }
        } else {
            // Edge cases - analizar si detectó o no
            const detected = testResult.actual && 'amount' in testResult.actual;
            if (detected && testResult.passed) {
                truePositives++;
            } else if (!detected && testResult.passed) {
                trueNegatives++;
            } else if (detected && !testResult.passed) {
                falsePositives++;
            } else {
                falseNegatives++;
            }
        }
    });

    const accuracy = totalTests > 0 ? passed / totalTests : 0;
    const precision = (truePositives + falsePositives) > 0
        ? truePositives / (truePositives + falsePositives)
        : 0;
    const recall = (truePositives + falseNegatives) > 0
        ? truePositives / (truePositives + falseNegatives)
        : 0;
    const f1Score = (precision + recall) > 0
        ? 2 * (precision * recall) / (precision + recall)
        : 0;

    return {
        modelName,
        totalTests,
        passed,
        failed: totalTests - passed,
        truePositives,
        trueNegatives,
        falsePositives,
        falseNegatives,
        accuracy,
        precision,
        recall,
        f1Score,
        totalTimeMs: totalTime,
        avgTimeMs: totalTime / totalTests,
    };
}

// ============================================================================
// FUNCIONES DE REPORTE
// ============================================================================

function printDetailedComparison(results: ComparisonResult[]) {
    console.log('\n' + '='.repeat(100));
    console.log('📋 COMPARACIÓN DETALLADA POR TEST');
    console.log('='.repeat(100));

    results.forEach((result) => {
        const deepseekIcon = result.deepseekResult.passed ? '✅' : '❌';
        const grokIcon = result.grokResult.passed ? '✅' : '❌';

        const bothPassed = result.deepseekResult.passed && result.grokResult.passed;
        const bothFailed = !result.deepseekResult.passed && !result.grokResult.passed;
        const disagreement = !bothPassed && !bothFailed;

        if (disagreement) {
            console.log(`\n⚠️  DESACUERDO: ${result.testName}`);
        } else {
            console.log(`\n${bothPassed ? '✅' : '❌'} ${result.testName}`);
        }

        console.log(`   DeepSeek: ${deepseekIcon} (${result.deepseekTimeMs}ms)`);
        if (!result.deepseekResult.passed && result.deepseekResult.error) {
            console.log(`     Error: ${result.deepseekResult.error}`);
        }

        console.log(`   Grok:     ${grokIcon} (${result.grokTimeMs}ms)`);
        if (!result.grokResult.passed && result.grokResult.error) {
            console.log(`     Error: ${result.grokResult.error}`);
        }
    });
}

function printStatsComparison(deepseekStats: ModelStats, grokStats: ModelStats) {
    console.log('\n' + '='.repeat(100));
    console.log('📊 ESTADÍSTICAS COMPARATIVAS');
    console.log('='.repeat(100));

    console.log('\n┌─────────────────────────┬─────────────────┬─────────────────┐');
    console.log('│ Métrica                 │ DeepSeek        │ Grok            │');
    console.log('├─────────────────────────┼─────────────────┼─────────────────┤');
    console.log(`│ Tests pasados           │ ${deepseekStats.passed.toString().padEnd(15)} │ ${grokStats.passed.toString().padEnd(15)} │`);
    console.log(`│ Tests fallados          │ ${deepseekStats.failed.toString().padEnd(15)} │ ${grokStats.failed.toString().padEnd(15)} │`);
    console.log('├─────────────────────────┼─────────────────┼─────────────────┤');
    console.log(`│ True Positives (TP)     │ ${deepseekStats.truePositives.toString().padEnd(15)} │ ${grokStats.truePositives.toString().padEnd(15)} │`);
    console.log(`│ True Negatives (TN)     │ ${deepseekStats.trueNegatives.toString().padEnd(15)} │ ${grokStats.trueNegatives.toString().padEnd(15)} │`);
    console.log(`│ False Positives (FP)    │ ${deepseekStats.falsePositives.toString().padEnd(15)} │ ${grokStats.falsePositives.toString().padEnd(15)} │`);
    console.log(`│ False Negatives (FN)    │ ${deepseekStats.falseNegatives.toString().padEnd(15)} │ ${grokStats.falseNegatives.toString().padEnd(15)} │`);
    console.log('├─────────────────────────┼─────────────────┼─────────────────┤');
    console.log(`│ Accuracy                │ ${(deepseekStats.accuracy * 100).toFixed(1)}%          │ ${(grokStats.accuracy * 100).toFixed(1)}%          │`);
    console.log(`│ Precision               │ ${(deepseekStats.precision * 100).toFixed(1)}%          │ ${(grokStats.precision * 100).toFixed(1)}%          │`);
    console.log(`│ Recall                  │ ${(deepseekStats.recall * 100).toFixed(1)}%          │ ${(grokStats.recall * 100).toFixed(1)}%          │`);
    console.log(`│ F1 Score                │ ${(deepseekStats.f1Score * 100).toFixed(1)}%          │ ${(grokStats.f1Score * 100).toFixed(1)}%          │`);
    console.log('├─────────────────────────┼─────────────────┼─────────────────┤');
    console.log(`│ Tiempo total            │ ${deepseekStats.totalTimeMs.toFixed(0)}ms         │ ${grokStats.totalTimeMs.toFixed(0)}ms         │`);
    console.log(`│ Tiempo promedio         │ ${deepseekStats.avgTimeMs.toFixed(0)}ms          │ ${grokStats.avgTimeMs.toFixed(0)}ms          │`);
    console.log('└─────────────────────────┴─────────────────┴─────────────────┘');
}

function printConclusion(deepseekStats: ModelStats, grokStats: ModelStats) {
    console.log('\n' + '='.repeat(100));
    console.log('🎯 CONCLUSIÓN');
    console.log('='.repeat(100));

    console.log('\n📈 Métricas Clave:');
    console.log('   • Accuracy: Porcentaje total de predicciones correctas');
    console.log('   • Precision: De las transacciones detectadas, cuántas son correctas (evita falsos positivos)');
    console.log('   • Recall: De las transacciones reales, cuántas se detectaron (evita falsos negativos)');
    console.log('   • F1 Score: Balance entre Precision y Recall\n');

    // Determinar ganador en cada categoría
    const accuracyWinner = deepseekStats.accuracy > grokStats.accuracy ? 'DeepSeek' :
        grokStats.accuracy > deepseekStats.accuracy ? 'Grok' : 'Empate';
    const precisionWinner = deepseekStats.precision > grokStats.precision ? 'DeepSeek' :
        grokStats.precision > deepseekStats.precision ? 'Grok' : 'Empate';
    const recallWinner = deepseekStats.recall > grokStats.recall ? 'DeepSeek' :
        grokStats.recall > deepseekStats.recall ? 'Grok' : 'Empate';
    const f1Winner = deepseekStats.f1Score > grokStats.f1Score ? 'DeepSeek' :
        grokStats.f1Score > deepseekStats.f1Score ? 'Grok' : 'Empate';
    const speedWinner = deepseekStats.avgTimeMs < grokStats.avgTimeMs ? 'DeepSeek' :
        grokStats.avgTimeMs < deepseekStats.avgTimeMs ? 'Grok' : 'Empate';

    console.log('🏆 Ganadores por categoría:');
    console.log(`   • Accuracy:  ${accuracyWinner}`);
    console.log(`   • Precision: ${precisionWinner} ${precisionWinner === 'DeepSeek' ? '(menos falsos positivos)' : precisionWinner === 'Grok' ? '(menos falsos positivos)' : ''}`);
    console.log(`   • Recall:    ${recallWinner} ${recallWinner === 'DeepSeek' ? '(detecta más transacciones reales)' : recallWinner === 'Grok' ? '(detecta más transacciones reales)' : ''}`);
    console.log(`   • F1 Score:  ${f1Winner}`);
    console.log(`   • Velocidad: ${speedWinner}\n`);

    // Recomendación
    const deepseekScore = [accuracyWinner, precisionWinner, recallWinner, f1Winner].filter(w => w === 'DeepSeek').length;
    const grokScore = [accuracyWinner, precisionWinner, recallWinner, f1Winner].filter(w => w === 'Grok').length;

    console.log('💡 Recomendación:');
    if (deepseekScore > grokScore) {
        console.log('   ✅ DeepSeek muestra mejor rendimiento general');
    } else if (grokScore > deepseekScore) {
        console.log('   ✅ Grok muestra mejor rendimiento general');
    } else {
        console.log('   🤝 Ambos modelos muestran rendimiento similar');
    }

    // Consideraciones importantes
    console.log('\n⚠️  Consideraciones importantes:');
    if (deepseekStats.falsePositives > 0 || grokStats.falsePositives > 0) {
        console.log(`   • Falsos Positivos: DeepSeek=${deepseekStats.falsePositives}, Grok=${grokStats.falsePositives}`);
        console.log('     (Emails sin transacción detectados incorrectamente - CRÍTICO)');
    }
    if (deepseekStats.falseNegatives > 0 || grokStats.falseNegatives > 0) {
        console.log(`   • Falsos Negativos: DeepSeek=${deepseekStats.falseNegatives}, Grok=${grokStats.falseNegatives}`);
        console.log('     (Transacciones reales no detectadas)');
    }

    console.log('\n' + '='.repeat(100) + '\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function runComparison() {
    console.log('╔' + '═'.repeat(98) + '╗');
    console.log('║' + ' '.repeat(25) + 'COMPARACIÓN DE MODELOS: DeepSeek vs Grok' + ' '.repeat(33) + '║');
    console.log('║' + ' '.repeat(30) + 'Detección de Transacciones' + ' '.repeat(42) + '║');
    console.log('╚' + '═'.repeat(98) + '╝');

    console.log(`\n🤖 Modelos a comparar:`);
    console.log(`   • DeepSeek: ${getModelName(deepseekModel)}`);
    console.log(`   • Grok:     ${getModelName(grokModel)}`);
    console.log(`\n📊 Total de tests: ${VALID_TRANSACTION_CASES.length + NO_TRANSACTION_CASES.length + EDGE_CASES.length}`);
    console.log(`   • Casos positivos: ${VALID_TRANSACTION_CASES.length}`);
    console.log(`   • Casos negativos: ${NO_TRANSACTION_CASES.length}`);
    console.log(`   • Casos edge:      ${EDGE_CASES.length}`);

    const results = await compareModelsOnAllCases();

    const deepseekStats = calculateModelStats(results, 'deepseek', getModelName(deepseekModel));
    const grokStats = calculateModelStats(results, 'grok', getModelName(grokModel));

    printDetailedComparison(results);
    printStatsComparison(deepseekStats, grokStats);
    printConclusion(deepseekStats, grokStats);
}

runComparison().catch(console.error);
