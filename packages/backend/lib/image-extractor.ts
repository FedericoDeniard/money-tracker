import { gmail_v1 } from 'googleapis';
import Tesseract from 'tesseract.js';

// Límites de seguridad
const MAX_IMAGE_SIZE_MB = 3;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_IMAGES_PER_EMAIL = 3;
const OCR_TIMEOUT_MS = 30000;

// Tipos de imagen soportados
const SUPPORTED_IMAGE_MIMETYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/webp',
];

interface ImageAttachment {
    attachmentId: string;
    filename: string;
    size: number;
    mimeType: string;
}

/**
 * Detecta adjuntos de imágenes en un mensaje de Gmail
 */
function detectImageAttachments(payload: gmail_v1.Schema$MessagePart): ImageAttachment[] {
    const attachments: ImageAttachment[] = [];

    const processPart = (part: gmail_v1.Schema$MessagePart) => {
        // Verificar si es una imagen soportada
        if (part.mimeType && SUPPORTED_IMAGE_MIMETYPES.includes(part.mimeType) && part.body?.attachmentId) {
            const filename = part.filename || 'unknown.img';
            const size = part.body.size || 0;

            attachments.push({
                attachmentId: part.body.attachmentId,
                filename,
                size,
                mimeType: part.mimeType,
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
 * Extrae texto de una imagen usando Tesseract OCR con timeout
 */
async function extractTextFromImageBuffer(
    buffer: Buffer,
    filename: string,
    mimeType: string
): Promise<string> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`OCR timeout after ${OCR_TIMEOUT_MS}ms`));
        }, OCR_TIMEOUT_MS);

        // Ejecutar OCR
        (async () => {
            try {
                // Convertir buffer a formato que Tesseract puede procesar
                const imageData = `data:${mimeType};base64,${buffer.toString('base64')}`;

                // Ejecutar Tesseract con español e inglés
                const result = await Tesseract.recognize(
                    imageData,
                    'spa+eng', // Español e inglés
                    {
                        logger: () => {}, // Función vacía para silenciar logs
                    }
                );

                clearTimeout(timeout);
                resolve(result.data.text);
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        })();
    });
}

/**
 * Extrae texto de todas las imágenes adjuntas en un mensaje de Gmail usando OCR
 * 
 * @param gmail - Cliente de Gmail API autenticado
 * @param messageId - ID del mensaje de Gmail
 * @returns Array de textos extraídos de las imágenes vía OCR
 */
export async function extractImageAttachments(
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

        // Detectar imágenes adjuntas
        const imageAttachments = detectImageAttachments(messageResponse.data.payload);

        if (imageAttachments.length === 0) {
            return [];
        }

        // Limitar número de imágenes a procesar
        const imagesToProcess = imageAttachments.slice(0, MAX_IMAGES_PER_EMAIL);

        // Extraer texto de cada imagen con OCR
        const extractedTexts: string[] = [];

        for (const attachment of imagesToProcess) {
            try {
                // Verificar tamaño de la imagen
                if (attachment.size > MAX_IMAGE_SIZE_BYTES) {
                    continue; // Skip large images silently
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
                const imageBuffer = Buffer.from(attachmentResponse.data.data, 'base64');

                // Extraer texto con OCR
                const text = await extractTextFromImageBuffer(
                    imageBuffer,
                    attachment.filename,
                    attachment.mimeType
                );

                if (text.trim()) {
                    extractedTexts.push(text);
                }
            } catch {
                // Silently skip images that fail OCR
            }
        }

        return extractedTexts;
    } catch {
        // Si falla la detección completa, retornar array vacío silenciosamente
        return [];
    }
}
