#!/usr/bin/env bun
/**
 * Script de prueba real con PDF de Mercado Pago
 * 
 * Este script prueba la extracción de un PDF real usando pdf-parse
 * y luego envía el contenido extraído al agente de IA.
 * 
 * Ejecutar con: bun run test-real-pdf.ts
 */

import './ai/config/langsmith';
import { extractTransactionFromEmail } from './ai/agents/transaction-agent';
import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';

async function testRealPdf() {
    console.log('🧪 Probando extracción con PDF real de Mercado Pago...\n');
    console.log('='.repeat(80));

    const pdfPath = path.join(process.cwd(), '..', '..', 'mercadopago_comprobante_payment-141888987673.pdf');

    // Verificar que el archivo existe
    if (!fs.existsSync(pdfPath)) {
        console.error('❌ Error: No se encuentra el archivo PDF');
        console.error(`   Ruta buscada: ${pdfPath}`);
        console.error('\n💡 Asegúrate de que el PDF esté en la raíz del proyecto');
        process.exit(1);
    }

    try {
        // Leer el PDF
        console.log('📄 Leyendo PDF...');
        const dataBuffer = fs.readFileSync(pdfPath);
        console.log(`   Tamaño: ${(dataBuffer.length / 1024).toFixed(2)} KB`);

        // Extraer texto del PDF
        console.log('\n🔍 Extrayendo texto del PDF con pdf-parse v2...');
        const startTime = Date.now();
        const parser = new PDFParse({ data: dataBuffer });
        const pdfData = await parser.getText();
        const duration = Date.now() - startTime;

        console.log(`   ✅ Texto extraído en ${duration}ms`);
        console.log(`   Caracteres extraídos: ${pdfData.text.length}`);

        console.log('\n📝 Contenido extraído:');
        console.log('-'.repeat(80));
        console.log(pdfData.text);
        console.log('-'.repeat(80));

        // Simular un email con el contenido del PDF
        const emailWithPdf = `
From: Mercado Pago <noreply@mercadopago.com>
Subject: Comprobante de transferencia

Hola Federico,

Te enviamos el comprobante de tu operación.

--- PDF ATTACHMENT ---

${pdfData.text}
`;

        console.log('\n🤖 Enviando contenido al agente de IA para extracción...\n');

        // Extraer transacción con IA
        const result = await extractTransactionFromEmail(emailWithPdf);

        console.log('📊 Resultado de la extracción:');
        console.log('='.repeat(80));
        console.log(JSON.stringify(result, null, 2));
        console.log('='.repeat(80));

        if (result.success && 'amount' in result.data!) {
            console.log('\n✅ ¡ÉXITO! Transacción detectada y extraída del PDF');
            console.log('\n📋 Datos extraídos:');
            console.log(`   💰 Monto: ${result.data.amount} ${result.data.currency}`);
            console.log(`   🏪 Comerciante: ${result.data.merchant}`);
            console.log(`   📝 Descripción: ${result.data.description}`);
            console.log(`   📅 Fecha: ${result.data.date || 'No especificada'}`);
            console.log(`   🔖 Tipo: ${result.data.type}`);
            console.log(`   📂 Categoría: ${result.data.category || 'No categorizada'}`);

            // Verificar que los datos sean correctos
            console.log('\n🔍 Verificación de datos esperados:');
            const expectedAmount = 69;

            if (result.data.amount === expectedAmount) {
                console.log(`   ✅ Monto correcto: ${expectedAmount}`);
            } else {
                console.log(`   ⚠️  Monto diferente: esperado ${expectedAmount}, obtenido ${result.data.amount}`);
            }

            if (result.data.merchant.includes('Mercado Pago') || result.data.merchant.includes('Maria Clara Osimani')) {
                console.log(`   ✅ Comerciante/destinatario identificado correctamente`);
            } else {
                console.log(`   ℹ️  Comerciante detectado: ${result.data.merchant}`);
            }

            if (result.data.type === 'expense') {
                console.log(`   ✅ Tipo correcto: expense (transferencia saliente)`);
            } else {
                console.log(`   ℹ️  Tipo detectado: ${result.data.type}`);
            }

        } else {
            console.log('\n⚠️  No se pudo extraer la transacción del PDF');
            if ('reason' in result.data!) {
                console.log(`   Razón: ${result.data.reason}`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('📊 Prueba completada');
        console.log('='.repeat(80));
        console.log('\nVerifica los detalles en LangSmith:');
        console.log('   https://smith.langchain.com/');
        console.log('   Proyecto: Money Tracker');
        console.log('   Tag: pdf-extraction-test\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error durante la prueba:', error);
        if (error instanceof Error) {
            console.error('   Mensaje:', error.message);
            console.error('   Stack:', error.stack);
        }
        process.exit(1);
    }
}

testRealPdf();
