// Extract image attachments from Gmail messages via REST API

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_EMAIL = 3;

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

/**
 * Detect image attachments recursively in a Gmail message payload
 */
function detectImageAttachments(payload: any): DetectedAttachment[] {
  const attachments: DetectedAttachment[] = [];

  const processPart = (part: any) => {
    if (
      part.mimeType &&
      SUPPORTED_IMAGE_MIMETYPES.includes(part.mimeType) &&
      part.body?.attachmentId
    ) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename || 'unknown.img',
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
  payload: any
): Promise<ImageAttachment[]> {
  try {
    const detected = detectImageAttachments(payload);

    if (detected.length === 0) {
      return [];
    }

    // Limit number of images
    const toProcess = detected
      .filter(a => a.size <= MAX_IMAGE_SIZE_BYTES)
      .slice(0, MAX_IMAGES_PER_EMAIL);

    const images: ImageAttachment[] = [];

    for (const attachment of toProcess) {
      try {
        const response = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachment.attachmentId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          console.warn(`Failed to download attachment ${attachment.filename}: ${response.statusText}`);
          continue;
        }

        const data = await response.json();

        if (!data.data) {
          continue;
        }

        const bytes = gmailBase64ToUint8Array(data.data);

        images.push({
          data: bytes,
          mimeType: attachment.mimeType === 'image/jpg' ? 'image/jpeg' : attachment.mimeType,
          filename: attachment.filename,
        });

        console.log(`Extracted image: ${attachment.filename} (${bytes.length} bytes)`);
      } catch (error) {
        console.warn(`Error extracting attachment ${attachment.filename}:`, error);
      }
    }

    return images;
  } catch (error) {
    console.warn('Error detecting image attachments:', error);
    return [];
  }
}
