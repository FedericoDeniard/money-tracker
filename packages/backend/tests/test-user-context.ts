import { extractTransactionFromEmail } from './ai/agents/transaction-agent';

// Simular el email de transferencia de Mercado Pago (como el de la imagen)
const mercadoPagoTransferEmail = `
mercado
pago
Comprobante de transferencia
Domingo, 18 de enero de 2026 a las 14:57 hs

$ 69
Motivo: Varios

De
Federico Mateo Deniard
CUIT/CUIL: 24-42689612-1
Mercado Pago
CVU: 0000003100042836876118

Para
Maria Clara Osimani
CUIT/CUIL: 27-47083867-7
Mercado Pago
CVU: 0000003100003437702439

Número de operación de Mercado Pago
141888987673
`;

async function testWithUserContext() {
    console.log('🧪 Test: Detección de tipo de transacción con contexto de usuario\n');
    console.log('='.repeat(80));
    console.log('\n📧 Email simulado: Transferencia de Federico → Maria Clara ($69)\n');

    // Test 1: Sin contexto de usuario
    console.log('🔍 Test 1: SIN contexto de usuario (no sabemos quién es el dueño de la cuenta)');
    console.log('-'.repeat(80));
    const resultWithoutContext = await extractTransactionFromEmail(mercadoPagoTransferEmail);

    if (resultWithoutContext.success && resultWithoutContext.data && 'amount' in resultWithoutContext.data) {
        console.log('✅ Transacción detectada:');
        console.log(`   Monto: $${resultWithoutContext.data.amount} ${resultWithoutContext.data.currency}`);
        console.log(`   Tipo: ${resultWithoutContext.data.type}`);
        console.log(`   Comerciante: ${resultWithoutContext.data.merchant}`);
        console.log(`   Categoría: ${resultWithoutContext.data.category || 'N/A'}`);
        console.log(`   Descripción: ${resultWithoutContext.data.description || 'N/A'}`);
    } else {
        console.log('❌ No se detectó transacción');
        console.log(`   Razón: ${resultWithoutContext.data?.reason || 'Unknown'}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 Test 2: CON contexto - Usuario es "Federico Mateo Deniard" (el que ENVIÓ)');
    console.log('-'.repeat(80));
    const resultWithSender = await extractTransactionFromEmail(
        mercadoPagoTransferEmail,
        'Federico Mateo Deniard'
    );

    if (resultWithSender.success && resultWithSender.data && 'amount' in resultWithSender.data) {
        console.log('✅ Transacción detectada:');
        console.log(`   Monto: $${resultWithSender.data.amount} ${resultWithSender.data.currency}`);
        console.log(`   Tipo: ${resultWithSender.data.type} ${resultWithSender.data.type === 'expense' ? '✅ CORRECTO (envió dinero)' : '❌ INCORRECTO'}`);
        console.log(`   Comerciante: ${resultWithSender.data.merchant}`);
        console.log(`   Categoría: ${resultWithSender.data.category || 'N/A'}`);
        console.log(`   Descripción: ${resultWithSender.data.description || 'N/A'}`);
    } else {
        console.log('❌ No se detectó transacción');
        console.log(`   Razón: ${resultWithSender.data?.reason || 'Unknown'}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 Test 3: CON contexto - Usuario es "Maria Clara Osimani" (el que RECIBIÓ)');
    console.log('-'.repeat(80));
    const resultWithReceiver = await extractTransactionFromEmail(
        mercadoPagoTransferEmail,
        'Maria Clara Osimani'
    );

    if (resultWithReceiver.success && resultWithReceiver.data && 'amount' in resultWithReceiver.data) {
        console.log('✅ Transacción detectada:');
        console.log(`   Monto: $${resultWithReceiver.data.amount} ${resultWithReceiver.data.currency}`);
        console.log(`   Tipo: ${resultWithReceiver.data.type} ${resultWithReceiver.data.type === 'income' ? '✅ CORRECTO (recibió dinero)' : '❌ INCORRECTO'}`);
        console.log(`   Comerciante: ${resultWithReceiver.data.merchant}`);
        console.log(`   Categoría: ${resultWithReceiver.data.category || 'N/A'}`);
        console.log(`   Descripción: ${resultWithReceiver.data.description || 'N/A'}`);
    } else {
        console.log('❌ No se detectó transacción');
        console.log(`   Razón: ${resultWithReceiver.data?.reason || 'Unknown'}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 RESUMEN:');
    console.log('El contexto de usuario permite al AI determinar correctamente:');
    console.log('  • Si Federico envía → expense (egreso)');
    console.log('  • Si Maria Clara recibe → income (ingreso)');
    console.log('  • Sin contexto → puede adivinar pero menos preciso');
    console.log('\n✅ Test completado!\n');
}

testWithUserContext().catch(console.error);
