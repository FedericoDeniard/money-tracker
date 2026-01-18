import { extractTransactionFromEmail } from '../ai/agents/transaction-agent';

/**
 * Test completo para verificar la capacidad del agente de:
 * 1. Detectar transacciones válidas
 * 2. Rechazar emails sin transacciones (evitar falsos positivos)
 * 3. Manejar casos edge
 */

// ============================================================================
// CASOS POSITIVOS: DEBEN DETECTAR TRANSACCIÓN
// ============================================================================

const VALID_TRANSACTION_CASES = [
    {
        name: 'Netflix - pago simple',
        email: `Subject: Payment confirmation
You paid $50.00 USD to Netflix on January 15, 2026.
Thank you for your payment.`,
        expected: {
            hasTransaction: true,
            amount: 50,
            type: 'expense',
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
            type: 'income',
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

// ============================================================================
// CASOS NEGATIVOS: NO DEBEN DETECTAR TRANSACCIÓN
// ============================================================================

const NO_TRANSACTION_CASES = [
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

// ============================================================================
// CASOS EDGE: Situaciones complejas
// ============================================================================

const EDGE_CASES = [
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
        expectedType: 'income',
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
// FUNCIONES DE TEST
// ============================================================================

async function testPositiveCases() {
    console.log('\n' + '='.repeat(80));
    console.log('✅ CASOS POSITIVOS: Emails que DEBEN detectar transacción');
    console.log('='.repeat(80));

    let passed = 0;
    let failed = 0;

    for (const testCase of VALID_TRANSACTION_CASES) {
        console.log(`\n📧 Test: ${testCase.name}`);
        console.log('-'.repeat(80));

        const result = await extractTransactionFromEmail(testCase.email);

        if (result.success && result.data && 'amount' in result.data) {
            const isAmountCorrect = testCase.expected.amount === result.data.amount;
            const isTypeCorrect = !testCase.expected.type || testCase.expected.type === result.data.type;

            if (isAmountCorrect && isTypeCorrect) {
                console.log(`✅ PASS - Detectó correctamente`);
                console.log(`   Monto: $${result.data.amount} ${result.data.currency}`);
                console.log(`   Tipo: ${result.data.type}`);
                console.log(`   Comerciante: ${result.data.merchant}`);
                passed++;
            } else {
                console.log(`❌ FAIL - Detectó pero con errores`);
                console.log(`   Esperado: amount=${testCase.expected.amount}, type=${testCase.expected.type}`);
                console.log(`   Obtenido: amount=${result.data.amount}, type=${result.data.type}`);
                failed++;
            }
        } else {
            console.log(`❌ FAIL - NO detectó transacción`);
            console.log(`   Razón: ${result.data?.reason || 'Unknown'}`);
            failed++;
        }
    }

    return { passed, failed, total: VALID_TRANSACTION_CASES.length };
}

async function testNegativeCases() {
    console.log('\n' + '='.repeat(80));
    console.log('❌ CASOS NEGATIVOS: Emails que NO deben detectar transacción');
    console.log('='.repeat(80));

    let passed = 0;
    let failed = 0;

    for (const testCase of NO_TRANSACTION_CASES) {
        console.log(`\n📧 Test: ${testCase.name}`);
        console.log(`   (${testCase.reason})`);
        console.log('-'.repeat(80));

        const result = await extractTransactionFromEmail(testCase.email);

        if (result.success && result.data && 'reason' in result.data) {
            console.log(`✅ PASS - Correctamente NO detectó transacción`);
            console.log(`   Razón del agente: ${result.data.reason}`);
            passed++;
        } else if (result.success && result.data && 'amount' in result.data) {
            console.log(`❌ FAIL - FALSO POSITIVO: detectó transacción cuando no debía`);
            console.log(`   Monto detectado: $${result.data.amount}`);
            console.log(`   Tipo: ${result.data.type}`);
            failed++;
        } else {
            console.log(`⚠️  Error del sistema: ${result.error}`);
            failed++;
        }
    }

    return { passed, failed, total: NO_TRANSACTION_CASES.length };
}

async function testEdgeCases() {
    console.log('\n' + '='.repeat(80));
    console.log('🤔 CASOS EDGE: Situaciones complejas');
    console.log('='.repeat(80));

    let passed = 0;
    let failed = 0;

    for (const testCase of EDGE_CASES) {
        console.log(`\n📧 Test: ${testCase.name}`);
        console.log(`   (${testCase.reason})`);
        console.log('-'.repeat(80));

        const result = await extractTransactionFromEmail(testCase.email);

        const hasTransaction = result.success && result.data && 'amount' in result.data;

        if (hasTransaction === testCase.shouldDetect) {
            if (hasTransaction && testCase.expectedType) {
                const isTypeCorrect = result.data.type === testCase.expectedType;
                if (isTypeCorrect) {
                    console.log(`✅ PASS - Comportamiento correcto`);
                    console.log(`   Tipo: ${result.data.type} (esperado: ${testCase.expectedType})`);
                    passed++;
                } else {
                    console.log(`⚠️  PARTIAL - Detectó pero tipo incorrecto`);
                    console.log(`   Tipo obtenido: ${result.data.type}, esperado: ${testCase.expectedType}`);
                    failed++;
                }
            } else {
                console.log(`✅ PASS - Comportamiento correcto`);
                if (hasTransaction) {
                    console.log(`   Detectó: $${result.data.amount} ${result.data.type}`);
                } else {
                    console.log(`   No detectó (correcto)`);
                }
                passed++;
            }
        } else {
            console.log(`❌ FAIL - Comportamiento incorrecto`);
            console.log(`   Esperado: ${testCase.shouldDetect ? 'detectar' : 'NO detectar'}`);
            console.log(`   Obtenido: ${hasTransaction ? 'detectó' : 'NO detectó'}`);
            failed++;
        }
    }

    return { passed, failed, total: EDGE_CASES.length };
}

async function runAllTests() {
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(18) + 'TEST DE DETECCIÓN DE TRANSACCIONES' + ' '.repeat(26) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');

    const positiveResults = await testPositiveCases();
    const negativeResults = await testNegativeCases();
    const edgeResults = await testEdgeCases();

    // Resumen final
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN GENERAL');
    console.log('='.repeat(80));

    const totalTests = positiveResults.total + negativeResults.total + edgeResults.total;
    const totalPassed = positiveResults.passed + negativeResults.passed + edgeResults.passed;
    const totalFailed = positiveResults.failed + negativeResults.failed + edgeResults.failed;

    console.log(`\n✅ Casos Positivos: ${positiveResults.passed}/${positiveResults.total} passed`);
    console.log(`❌ Casos Negativos: ${negativeResults.passed}/${negativeResults.total} passed`);
    console.log(`🤔 Casos Edge:      ${edgeResults.passed}/${edgeResults.total} passed`);
    console.log('-'.repeat(80));
    console.log(`📈 TOTAL:           ${totalPassed}/${totalTests} tests passed (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);

    if (totalFailed === 0) {
        console.log('\n🎉 ¡TODOS LOS TESTS PASARON!');
    } else {
        console.log(`\n⚠️  ${totalFailed} tests fallaron - revisar casos arriba`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('💡 ANÁLISIS:');
    console.log('='.repeat(80));
    console.log('• Falsos Positivos: emails sin transacción que se detectan incorrectamente');
    console.log('• Falsos Negativos: transacciones reales que no se detectan');
    console.log('• Ambos son problemas pero los falsos positivos son MÁS CRÍTICOS');
    console.log('  (mejor no detectar que detectar mal)');
    console.log('='.repeat(80) + '\n');
}

runAllTests().catch(console.error);
