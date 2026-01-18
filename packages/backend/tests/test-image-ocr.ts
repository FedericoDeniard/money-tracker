#!/usr/bin/env bun
/**
 * Script de prueba real con OCR de imagen usando Tesseract
 * 
 * Este script prueba la extracción de texto de una imagen real usando OCR
 * y luego envía el contenido extraído al agente de IA.
 * 
 * Ejecutar con: bun run test-image-ocr.ts
 */

import '../ai/config/langsmith';
import { extractTransactionFromEmail } from '../ai/agents/transaction-agent';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';

async function testImageOCR() {
    console.log('🧪 Probando extracción OCR con imagen real de Mercado Pago...\n');
    console.log('=' .repeat(80));

    const imagePath = path.join(process.cwd(), '..', '..', 'image.png');

    // Verificar que el archivo existe
        if (!fs.existsSync(imagePath)) {
        console.error('❌ Error: No se encuentra el archivo de imagen');
        console.error(`   Ruta buscada: ${imagePath}`);
        console.error('\n💡 Asegúrate de que image.png esté en la raíz del proyecto');
        process.exit(1);
    }

    try {
        // Leer la imagen
        console.log('📸 Leyendo imagen...');
        const imageBuffer = fs.readFileSync(imagePath);
        console.log(`   Tamaño: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

        // Ejecutar OCR con Tesseract
        console.log('\n🔍 Ejecutando OCR con Tesseract (español + inglés)...');
        console.log('   Esto puede tomar unos segundos...');
        const startTime = Date.now();

        const result = await Tesseract.recognize(
            imagePath,
            'spa+eng', // Español e inglés
            {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        process.stdout.write(`\r   Progreso: ${(m.progress * 100).toFixed(1)}%`);
                    }
                }
            }
        );

        const duration = Date.now() - startTime;
        console.log(`\n   ✅ OCR completado en ${(duration / 1000).toFixed(2)}s`);
        console.log(`   Confianza: ${result.data.confidence.toFixed(2)}%`);
        console.log(`   Caracteres extraídos: ${result.data.text.length}`);

        console.log('\n📝 Texto extraído por OCR:');
        console.log('-' .repeat(80));
        console.log(result.data.text);
        console.log('-' .repeat(80));

        // Simular un email con el contenido de la imagen
        const emailWithImage = `
From: Mercado Pago <noreply@mercadopago.com>
Subject: Comprobante de transferencia

Hola Federico,

Te enviamos el comprobante de tu operación.

--- IMAGE ATTACHMENT (OCR) ---

${result.data.text}
`;

        console.log('\n🤖 Enviando contenido al agente de IA para extracción...\n');

        // Extraer transacción con IA
        const aiResult = await extractTransactionFromEmail(emailWithImage);

        console.log('📊 Resultado de la extracción:');
        console.log('=' .repeat(80));
        console.log(JSON.stringify(aiResult, null, 2));
        console.log('=' .repeat(80));

        if (aiResult.success && 'amount' in aiResult.data!) {
            console.log('\n✅ ¡ÉXITO! Transacción detectada y extraída de la imagen OCR');
            console.log('\n📋 Datos extraídos:');
            console.log(`   💰 Monto: ${aiResult.data.amount} ${aiResult.data.currency}`);
            console.log(`   🏪 Comerciante: ${aiResult.data.merchant}`);
            console.log(`   📝 Descripción: ${aiResult.data.description}`);
            console.log(`   📅 Fecha: ${aiResult.data.date || 'No especificada'}`);
            console.log(`   🔖 Tipo: ${aiResult.data.type}`);
            console.log(`   📂 Categoría: ${aiResult.data.category || 'No categorizada'}`);

            // Verificar que los datos sean correctos
            console.log('\n🔍 Verificación de datos esperados:');
            const expectedAmount = 69;
            
            if (aiResult.data.amount === expectedAmount) {
                console.log(`   ✅ Monto correcto: ${expectedAmount}`);
            } else {
                console.log(`   ⚠️  Monto diferente: esperado ${expectedAmount}, obtenido ${aiResult.data.amount}`);
            }

            if (aiResult.data.merchant.includes('Maria Clara Osimani') || aiResult.data.merchant.includes('Mercado Pago')) {
                console.log(`   ✅ Comerciante/destinatario identificado correctamente`);
            } else {
                console.log(`   ℹ️  Comerciante detectado: ${aiResult.data.merchant}`);
            }

            if (aiResult.data.type === 'expense') {
                console.log(`   ✅ Tipo correcto: expense (transferencia saliente)`);
            } else {
                console.log(`   ℹ️  Tipo detectado: ${aiResult.data.type}`);
            }

            // Comparación con PDF
            console.log('\n📊 Comparación OCR vs PDF:');
            console.log('   La misma transacción fue probada con PDF anteriormente');
            console.log('   Ambos métodos deberían extraer la misma información');

        } else {
            console.log('\n⚠️  No se pudo extraer la transacción de la imagen OCR');
            if ('reason' in aiResult.data!) {
                console.log(`   Razón: ${aiResult.data.reason}`);
            }
        }

        console.log('\n' + '=' .repeat(80));
        console.log('📊 Prueba de OCR completada');
        console.log('=' .repeat(80));
        console.log('\nVerifica los detalles en LangSmith:');
        console.log('   https://smith.langchain.com/');
        console.log('   Proyecto: Money Tracker');
        console.log('   Tag: ocr-extraction-test\n');

        console.log('Notas importantes:');
        console.log('- OCR puede ser más lento que PDF (2-5 segundos típicamente)');
        console.log('- La precisión depende de la calidad de la imagen');
        console.log('- Tesseract soporta múltiples idiomas simultáneamente\n');

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

testImageOCR();
