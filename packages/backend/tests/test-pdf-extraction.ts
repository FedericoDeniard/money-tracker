#!/usr/bin/env bun
/**
 * Script de prueba para verificar la extracción de PDFs
 * 
 * Este script simula diferentes escenarios de procesamiento de PDFs:
 * 1. Email con contenido de PDF válido simulado
 * 2. Email sin PDFs (caso base)
 * 3. Múltiples PDFs
 * 
 * Ejecutar con: bun run test-pdf-extraction.ts
 */

import '../ai/config/langsmith'; // Initialize LangSmith configuration
import { extractTransactionFromEmail } from '../ai/agents/transaction-agent';

// Caso 1: Email con contenido de PDF de un recibo
const emailWithPdfContent = `
From: MercadoLibre <noreply@mercadolibre.com>
Subject: Tu compra está en camino

Hola Federico,

Tu pedido #1234567890 está en preparación.

--- PDF ATTACHMENT ---

FACTURA / INVOICE
MercadoLibre Argentina

Fecha: 18 de enero de 2026
Número de factura: ML-2026-001234

DETALLE DE COMPRA:
- Producto: Laptop Dell Inspiron 15
- Cantidad: 1
- Precio unitario: $450,000.00 ARS
- Total: $450,000.00 ARS

MÉTODO DE PAGO: Tarjeta de crédito Visa ****1234
COMERCIO: MercadoLibre

DATOS DEL COMPRADOR:
Federico Deniard
CUIT: 20-12345678-9

Total a pagar: $450,000.00 ARS
`;

// Caso 2: Email simple sin PDF
const emailWithoutPdf = `
From: Netflix <info@netflix.com>
Subject: Tu suscripción se renovó

Hola,

Tu suscripción a Netflix Premium se renovó automáticamente.
Monto: $3,999 ARS
Fecha: 18 de enero de 2026
Método de pago: Tarjeta terminada en 5678

Gracias por ser parte de Netflix.
`;

// Caso 3: Email con múltiples PDFs (recibo + comprobante)
const emailWithMultiplePdfs = `
From: Banco Galicia <notificaciones@galicia.com.ar>
Subject: Resumen de movimientos - Enero 2026

Estimado cliente,

Adjuntamos el resumen de sus movimientos del mes.

--- PDF ATTACHMENT ---

COMPROBANTE DE TRANSFERENCIA
Banco Galicia

Fecha: 15/01/2026
Hora: 14:30:25

DESDE: Cuenta Corriente **** 4321
HACIA: Alquiler - Juan Pérez
CBU: 0070999830000004567891

MONTO: $150,000.00 ARS
CONCEPTO: Alquiler Enero 2026

--- PDF ATTACHMENT ---

COMPROBANTE DE PAGO
Servicio: EDESUR

Fecha de vencimiento: 10/01/2026
Fecha de pago: 09/01/2026

Número de cliente: 123456789
Período: Diciembre 2025

Monto: $8,500.00 ARS
Recargo por mora: $0.00
TOTAL PAGADO: $8,500.00 ARS
`;

// Caso 4: PDF con contenido corrupto/sin transacción
const emailWithInvalidPdf = `
From: support@example.com
Subject: Documento adjunto

Hola,

Te envío el documento que solicitaste.

--- PDF ATTACHMENT ---

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Este es solo texto genérico sin información financiera.
No hay montos, no hay fechas, no hay transacciones.

Documento interno de políticas de la empresa.
Sección 1: Introducción
Sección 2: Objetivos generales
`;

async function testPdfExtraction() {
    console.log('🧪 Iniciando pruebas de extracción de PDFs...\n');
    console.log('='.repeat(80));

    // Test 1: Email con PDF de factura
    console.log('\n📄 Test 1: Email con PDF de factura (MercadoLibre)');
    console.log('-'.repeat(80));
    try {
        const result1 = await extractTransactionFromEmail(emailWithPdfContent);
        console.log('Resultado:', JSON.stringify(result1, null, 2));

        if (result1.success && 'amount' in result1.data!) {
            console.log('✅ ÉXITO: Transacción extraída del PDF');
            console.log(`   Monto: ${result1.data.amount} ${result1.data.currency}`);
            console.log(`   Comerciante: ${result1.data.merchant}`);
            console.log(`   Descripción: ${result1.data.description}`);
        } else {
            console.log('⚠️  No se encontró transacción');
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }

    // Test 2: Email sin PDF
    console.log('\n\n📧 Test 2: Email simple sin PDF (Netflix)');
    console.log('-'.repeat(80));
    try {
        const result2 = await extractTransactionFromEmail(emailWithoutPdf);
        console.log('Resultado:', JSON.stringify(result2, null, 2));

        if (result2.success && 'amount' in result2.data!) {
            console.log('✅ ÉXITO: Transacción extraída del email');
            console.log(`   Monto: ${result2.data.amount} ${result2.data.currency}`);
            console.log(`   Comerciante: ${result2.data.merchant}`);
        } else {
            console.log('⚠️  No se encontró transacción');
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }

    // Test 3: Email con múltiples PDFs
    console.log('\n\n📑 Test 3: Email con múltiples PDFs (Banco Galicia)');
    console.log('-'.repeat(80));
    console.log('Nota: El agente debería detectar la primera transacción más relevante');
    try {
        const result3 = await extractTransactionFromEmail(emailWithMultiplePdfs);
        console.log('Resultado:', JSON.stringify(result3, null, 2));

        if (result3.success && 'amount' in result3.data!) {
            console.log('✅ ÉXITO: Transacción extraída de los PDFs');
            console.log(`   Monto: ${result3.data.amount} ${result3.data.currency}`);
            console.log(`   Comerciante: ${result3.data.merchant}`);
            console.log(`   Tipo: ${result3.data.type}`);
        } else {
            console.log('⚠️  No se encontró transacción');
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }

    // Test 4: PDF sin contenido financiero
    console.log('\n\n📄 Test 4: PDF sin información financiera');
    console.log('-'.repeat(80));
    try {
        const result4 = await extractTransactionFromEmail(emailWithInvalidPdf);
        console.log('Resultado:', JSON.stringify(result4, null, 2));

        if (result4.success && 'amount' in result4.data!) {
            console.log('⚠️  ATENCIÓN: Se extrajo una transacción (no debería)');
            console.log(`   Monto: ${result4.data.amount} ${result4.data.currency}`);
        } else {
            console.log('✅ CORRECTO: No se encontró transacción (comportamiento esperado)');
            if ('reason' in result4.data!) {
                console.log(`   Razón: ${result4.data.reason}`);
            }
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }

    // Resumen
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 Resumen de pruebas completado');
    console.log('='.repeat(80));
    console.log('\nVerifica los resultados en LangSmith:');
    console.log('   https://smith.langchain.com/');
    console.log('   Proyecto: Money Tracker');
    console.log('   Tags: email-extraction, pdf-test\n');

    console.log('Notas importantes:');
    console.log('- El extractor de PDFs reales (pdf-parse) no se ejecuta en este test');
    console.log('- Este test simula el contenido ya extraído de los PDFs');
    console.log('- Para probar con PDFs reales, necesitarás configurar Gmail API\n');

    process.exit(0);
}

testPdfExtraction().catch((error) => {
    console.error('\n❌ Error fatal durante las pruebas:', error);
    process.exit(1);
});
