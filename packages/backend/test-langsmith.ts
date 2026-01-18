#!/usr/bin/env bun
/**
 * Script de prueba para verificar el tracing de LangSmith
 * Ejecutar con: bun run test-langsmith.ts
 */

import './ai/config/langsmith'; // Initialize LangSmith configuration
import { extractTransactionFromEmail } from './ai/agents/transaction-agent';

// Email de prueba con una transacción
const testEmail = `
From: Mercado Pago <notifications@mercadopago.com>
Subject: Recibiste un pago de $15,000 ARS

Hola,

Recibiste un pago de $15,000 ARS de Juan Pérez.

Concepto: Pago por servicios de desarrollo web
Fecha: 18 de enero de 2026
Método de pago: Transferencia bancaria

Saludos,
Equipo de Mercado Pago
`;

async function testLangSmithTracing() {
    console.log('🧪 Iniciando prueba de LangSmith tracing...\n');
    console.log('📧 Email de prueba:');
    console.log(testEmail.substring(0, 200) + '...\n');

    try {
        console.log('🚀 Extrayendo transacción con LangSmith tracing...');
        const result = await extractTransactionFromEmail(testEmail);

        console.log('\n✅ Resultado:');
        console.log(JSON.stringify(result, null, 2));

        if (result.success && 'amount' in result.data!) {
            console.log('\n🎉 ¡Transacción extraída exitosamente!');
            console.log(`   Monto: ${result.data.amount} ${result.data.currency}`);
            console.log(`   Tipo: ${result.data.type}`);
            console.log(`   Comerciante: ${result.data.merchant}`);
        } else {
            console.log('\n⚠️  No se encontró transacción en el email');
        }

        console.log('\n📊 Verifica la traza en LangSmith:');
        console.log('   https://smith.langchain.com/');
        console.log('   Proyecto: Money Tracker');
        console.log('   Tag: email-extraction\n');

    } catch (error) {
        console.error('\n❌ Error durante la prueba:', error);
        process.exit(1);
    }

    process.exit(0);
}

testLangSmithTracing();
