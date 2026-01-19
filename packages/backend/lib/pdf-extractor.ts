import { gmail_v1 } from 'googleapis';
import { gmailLogger } from '../src/config/logger';
import { PDFParse } from 'pdf-parse';

// Límites de seguridad
const MAX_PDF_SIZE_MB = 5;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;
const MAX_PDFS_PER_EMAIL = 3;
const EXTRACTION_TIMEOUT_MS = 10000;

interface PdfAttachment {
    attachmentId: string;
    filename: string;
    size: number;
}

/**
 * Detecta adjuntos PDF en un mensaje de Gmail
 */
function detectPdfAttachments(payload: gmail_v1.Schema$MessagePart): PdfAttachment[] {
    const attachments: PdfAttachment[] = [];

    const processPart = (part: gmail_v1.Schema$MessagePart) => {
        // Verificar si es un PDF
        if (part.mimeType === 'application/pdf' && part.body?.attachmentId) {
            const filename = part.filename || 'unknown.pdf';
            const size = part.body.size || 0;

            attachments.push({
                attachmentId: part.body.attachmentId,
                filename,
                size,
            });
        }

        // Procesar recursivamente partes anidadas
        if (part.parts && Array.isArray(part.parts)) {
            for (const subPart of part.parts) {
                processPart(subPart);
            }
        }
    };

    processPart(payload);
    return attachments;
}

/**
 * Extrae texto de un PDF usando pdf-parse v2 con timeout
 */
async function extractTextFromPdfBuffer(buffer: Buffer, filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`PDF extraction timeout after ${EXTRACTION_TIMEOUT_MS}ms`));
        }, EXTRACTION_TIMEOUT_MS);

        // Ejecutar la extracción
        (async () => {
            try {
                const startTime = Date.now();

                // Crear parser con el buffer
                const parser = new PDFParse({ data: buffer });

                // Extraer texto
                const result = await parser.getText();
                const duration = Date.now() - startTime;

                gmailLogger.info('PDF text extracted successfully', {
                    filename,
                    textLength: result.text.length,
                    durationMs: duration,
                });

                clearTimeout(timeout);
                resolve(result.text);
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        })();
    });
}

/**
 * Extrae texto de todos los PDFs adjuntos en un mensaje de Gmail
 * 
 * @param gmail - Cliente de Gmail API autenticado
 * @param messageId - ID del mensaje de Gmail
 * @returns Array de textos extraídos de los PDFs
 */
export async function extractPdfAttachments(
    gmail: gmail_v1.Gmail,
    messageId: string
): Promise<string[]> {
    try {
        // Obtener el mensaje completo para detectar adjuntos
        const messageResponse = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full',
        });

        if (!messageResponse.data.payload) {
            return [];
        }

        // Detectar PDFs adjuntos
        const pdfAttachments = detectPdfAttachments(messageResponse.data.payload);

        if (pdfAttachments.length === 0) {
            return [];
        }

        // Limitar número de PDFs a procesar
        const pdfsToProcess = pdfAttachments.slice(0, MAX_PDFS_PER_EMAIL);

        // Extraer texto de cada PDF
        const extractedTexts: string[] = [];

        for (const attachment of pdfsToProcess) {
            try {
                // Verificar tamaño del PDF
                if (attachment.size > MAX_PDF_SIZE_BYTES) {
                    continue; // Skip large PDFs silently
                }

                // Descargar el adjunto (en memoria, como base64)
                const attachmentResponse = await gmail.users.messages.attachments.get({
                    userId: 'me',
                    messageId: messageId,
                    id: attachment.attachmentId,
                });

                if (!attachmentResponse.data.data) {
                    continue; // Skip silently
                }

                // Convertir de base64 a Buffer (en memoria)
                const pdfBuffer = Buffer.from(attachmentResponse.data.data, 'base64');

                // Extraer texto del PDF
                const text = await extractTextFromPdfBuffer(pdfBuffer, attachment.filename);

                if (text.trim()) {
                    extractedTexts.push(text);
                }
            } catch {
                // Silently skip PDFs that fail extraction
            }
        }

        return extractedTexts;
    } catch {
        // Si falla la detección completa, retornar array vacío silenciosamente
        return [];
    }
}
