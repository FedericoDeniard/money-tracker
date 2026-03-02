// Extract image and PDF attachments from Gmail messages via REST API
import { extractText, getDocumentProxy } from 'npm:unpdf'

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_EMAIL = 3;
const MAX_PDFS_PER_EMAIL = 3;

const SUPPORTED_IMAGE_MIMETYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
];

export interface ImageAttachment {
  data: Uint8Array;
  mimeType: string;
  filename: string;
}

interface DetectedAttachment {
  attachmentId: string;
  filename: string;
  size: number;
  mimeType: string;
}

interface InlineImage {
  data: string; // base64 encoded data from body.data
  filename: string;
  size: number;
  mimeType: string;
}

interface AttachmentDataPayload {
  data?: string;
}

export interface AttachmentRequestOptions {
  fetchAttachmentData?: (
    messageId: string,
    attachmentId: string,
  ) => Promise<AttachmentDataPayload | null>;
}

/**
 * Detect attachments recursively in a Gmail message payload
 */
function detectAttachments(payload: any, mimeTypes: string[]): DetectedAttachment[] {
  const attachments: DetectedAttachment[] = [];

  const processPart = (part: any) => {
    if (
      part.mimeType &&
      mimeTypes.includes(part.mimeType) &&
      part.body?.attachmentId
    ) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename || 'unknown',
        size: part.body.size || 0,
        mimeType: part.mimeType,
      });
    }

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
 * Detect inline images (embedded in email body with base64 data, no attachmentId)
 */
function detectInlineImages(payload: any, mimeTypes: string[]): InlineImage[] {
  const inlineImages: InlineImage[] = [];

  const processPart = (part: any) => {
    if (
      part.mimeType &&
      mimeTypes.includes(part.mimeType) &&
      !part.body?.attachmentId &&
      part.body?.data &&
      part.body.size > 0
    ) {
      inlineImages.push({
        data: part.body.data,
        filename: part.filename || `inline-${inlineImages.length}.${part.mimeType.split('/')[1]}`,
        size: part.body.size,
        mimeType: part.mimeType,
      });
    }

    if (part.parts && Array.isArray(part.parts)) {
      for (const subPart of part.parts) {
        processPart(subPart);
      }
    }
  };

  processPart(payload);
  return inlineImages;
}

/**
 * Convert Gmail's URL-safe base64 to standard base64, then to Uint8Array
 */
function gmailBase64ToUint8Array(data: string): Uint8Array {
  // Gmail uses URL-safe base64 (- and _ instead of + and /)
  const standardBase64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const binaryString = atob(standardBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Extract image attachments from a Gmail message
 * 
 * @param accessToken - Gmail OAuth access token
 * @param messageId - Gmail message ID
 * @param payload - The message payload (from messages.get with format=full)
 * @returns Array of image attachments with binary data
 */
export async function extractImageAttachments(
  accessToken: string,
  messageId: string,
  payload: any,
  options?: AttachmentRequestOptions,
): Promise<ImageAttachment[]> {
  try {
    const images: ImageAttachment[] = [];

    // 1. Extract regular image attachments (with attachmentId)
    const detected = detectAttachments(payload, SUPPORTED_IMAGE_MIMETYPES);
    const toProcess = detected
      .filter(a => a.size <= MAX_IMAGE_SIZE_BYTES)
      .slice(0, MAX_IMAGES_PER_EMAIL);

    for (const attachment of toProcess) {
      try {
        const data = await getAttachmentData(
          accessToken,
          messageId,
          attachment.attachmentId,
          options,
        );
        if (!data?.data) {
          console.warn(`Failed to download attachment ${attachment.filename}`);
          continue;
        }

        const bytes = gmailBase64ToUint8Array(data.data);

        images.push({
          data: bytes,
          mimeType: attachment.mimeType === 'image/jpg' ? 'image/jpeg' : attachment.mimeType,
          filename: attachment.filename,
        });

        console.log(`Extracted image attachment: ${attachment.filename} (${bytes.length} bytes)`);
      } catch (error) {
        console.warn(`Error extracting attachment ${attachment.filename}:`, error);
      }
    }

    // 2. Extract inline images (embedded in email body with base64 data)
    const remaining = MAX_IMAGES_PER_EMAIL - images.length;
    if (remaining > 0) {
      const inlineImages = detectInlineImages(payload, SUPPORTED_IMAGE_MIMETYPES)
        .filter(a => a.size <= MAX_IMAGE_SIZE_BYTES)
        .slice(0, remaining);

      for (const inline of inlineImages) {
        try {
          const bytes = gmailBase64ToUint8Array(inline.data);
          images.push({
            data: bytes,
            mimeType: inline.mimeType === 'image/jpg' ? 'image/jpeg' : inline.mimeType,
            filename: inline.filename,
          });
          console.log(`Extracted inline image: ${inline.filename} (${bytes.length} bytes)`);
        } catch (error) {
          console.warn(`Error extracting inline image ${inline.filename}:`, error);
        }
      }
    }

    return images;
  } catch (error) {
    console.warn('Error detecting image attachments:', error);
    return [];
  }
}

/**
 * Download a Gmail attachment and return raw bytes
 */
async function downloadAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string,
  options?: AttachmentRequestOptions,
): Promise<Uint8Array | null> {
  const data = await getAttachmentData(accessToken, messageId, attachmentId, options);
  if (!data?.data) return null;

  return gmailBase64ToUint8Array(data.data);
}

/**
 * Extract text from PDF attachments in a Gmail message using unpdf
 *
 * @param accessToken - Gmail OAuth access token
 * @param messageId - Gmail message ID
 * @param payload - The message payload (from messages.get with format=full)
 * @returns Array of extracted text strings from PDFs
 */
export async function extractPdfTexts(
  accessToken: string,
  messageId: string,
  payload: any,
  options?: AttachmentRequestOptions,
): Promise<string[]> {
  try {
    const detected = detectAttachments(payload, ['application/pdf']);

    if (detected.length === 0) {
      return [];
    }

    const toProcess = detected
      .filter(a => a.size <= MAX_PDF_SIZE_BYTES)
      .slice(0, MAX_PDFS_PER_EMAIL);

    const texts: string[] = [];

    for (const attachment of toProcess) {
      try {
        const bytes = await downloadAttachment(accessToken, messageId, attachment.attachmentId, options);
        if (!bytes) continue;

        const pdf = await getDocumentProxy(bytes);
        const { text } = await extractText(pdf, { mergePages: true });

        if (text && text.trim()) {
          texts.push(text);
          console.log(`Extracted PDF text: ${attachment.filename} (${text.length} chars)`);
        }
      } catch (error) {
        console.warn(`Error extracting PDF ${attachment.filename}:`, error);
      }
    }

    return texts;
  } catch (error) {
    console.warn('Error detecting PDF attachments:', error);
    return [];
  }
}

async function getAttachmentData(
  accessToken: string,
  messageId: string,
  attachmentId: string,
  options?: AttachmentRequestOptions,
): Promise<AttachmentDataPayload | null> {
  if (options?.fetchAttachmentData) {
    return options.fetchAttachmentData(messageId, attachmentId);
  }

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) return null;
  return response.json();
}
