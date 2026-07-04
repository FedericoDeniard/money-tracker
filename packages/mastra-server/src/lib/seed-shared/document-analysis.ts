// @ts-nocheck
// Shared document analysis pipeline.
// Handles both Gmail email attachments and directly uploaded files,
// providing a unified flow: local text extraction → AI fallback with PDF file input.
//
// In addition to the AI verdict, the pipeline always returns the raw attachment
// bytes that were analyzed so callers (gmail-webhook, process-document) can
// persist the original tickets/receipts alongside the transaction.
import { extractText, getDocumentProxy } from "unpdf";
import {
  extractImageAttachments,
  extractPdfDataForAiFallback,
  type AttachmentRequestOptions,
  type ImageAttachment,
  type PdfAttachmentForAiFallback,
} from "./attachment-extractor";
import {
  extractTransactionFromEmail,
  type TransactionResponse,
} from "./transaction-agent";

export type { TransactionResponse };

export interface GmailAttachmentInput {
  kind: "gmail";
  accessToken: string;
  messageId: string;
  payload: unknown;
  bodyText: string;
  userFullName?: string;
  attachmentOptions?: AttachmentRequestOptions;
}

export interface UploadedFileInput {
  kind: "upload";
  fileBytes: Uint8Array;
  contentType: string;
  fileName: string;
  userFullName?: string;
  userLocale?: string;
  userClarifications?: string;
}

export type DocumentInput = GmailAttachmentInput | UploadedFileInput;

/**
 * A single attachment (image or PDF) with its raw bytes, ready to be persisted
 * to Supabase Storage. Unified shape over ImageAttachment and PdfAttachmentForAiFallback.
 */
export interface AnalyzedAttachment {
  data: Uint8Array;
  mimeType: string;
  filename: string;
}

/**
 * Result of analyzing a document. Always carries the attachments that were
 * extracted from the input (images + PDFs for gmail, the uploaded file for
 * uploads) so the caller can persist them regardless of the AI outcome.
 *
 * `aiError` is set when the AI pipeline threw an unexpected error (as opposed
 * to returning a clean `{ hasTransaction: false }` verdict). Callers that
 * implement a keyword fallback (gmail-webhook) use this flag to decide whether
 * to trigger the fallback path.
 */
export type AnalyzeDocumentResult = TransactionResponse & {
  attachments: AnalyzedAttachment[];
  aiError?: boolean;
};

export async function analyzeDocumentForTransaction(
  input: DocumentInput
): Promise<AnalyzeDocumentResult> {
  if (input.kind === "gmail") {
    return analyzeGmailAttachments(input);
  }
  return analyzeUploadedFile(input);
}

async function analyzeGmailAttachments(
  input: GmailAttachmentInput
): Promise<AnalyzeDocumentResult> {
  const images = await extractImageAttachments(
    input.accessToken,
    input.messageId,
    input.payload,
    input.attachmentOptions
  );

  const pdfResult = await extractPdfDataForAiFallback(
    input.accessToken,
    input.messageId,
    input.payload,
    input.attachmentOptions
  );

  console.log("[document-analysis] Gmail attachments ready", {
    imageCount: images.length,
    pdfTextCount: pdfResult.texts.length,
    pdfFallbackCount: pdfResult.fallbackPdfAttachments.length,
    pdfPersistedCount: pdfResult.allPdfAttachments.length,
  });

  const attachments: AnalyzedAttachment[] = [
    ...images,
    ...pdfResult.allPdfAttachments,
  ];

  try {
    const result = await extractTransactionFromEmail(
      input.bodyText,
      input.userFullName,
      images,
      pdfResult.texts,
      pdfResult.fallbackPdfAttachments
    );
    return { ...result, attachments };
  } catch (error) {
    console.error("[document-analysis] AI pipeline threw", error);
    return {
      hasTransaction: false,
      reason: error instanceof Error ? error.message : "AI processing failed",
      attachments,
      aiError: true,
    };
  }
}

async function analyzeUploadedFile(
  input: UploadedFileInput
): Promise<AnalyzeDocumentResult> {
  const {
    fileBytes,
    contentType,
    fileName,
    userFullName,
    userLocale,
    userClarifications,
  } = input;

  const normalizedMimeType =
    contentType === "image/jpg" ? "image/jpeg" : contentType;
  const isPdf = normalizedMimeType === "application/pdf";

  let images: ImageAttachment[] = [];
  let pdfTexts: string[] = [];
  let pdfFallbackAttachments: PdfAttachmentForAiFallback[] = [];
  let pdfAttachments: PdfAttachmentForAiFallback[] = [];

  if (isPdf) {
    const pdfAttachment: PdfAttachmentForAiFallback = {
      data: fileBytes,
      mimeType: "application/pdf",
      filename: fileName,
    };

    // Always persist the original PDF as a transaction attachment
    pdfAttachments.push(pdfAttachment);

    try {
      const pdf = await getDocumentProxy(fileBytes);
      const { text } = await extractText(pdf, { mergePages: true });

      if (text && text.trim()) {
        pdfTexts.push(text);
        console.log(
          `[document-analysis] Extracted PDF text: ${fileName} (${text.length} chars)`
        );
      } else {
        console.warn(
          `[document-analysis] PDF has no extractable text, queuing for AI fallback: ${fileName}`
        );
        pdfFallbackAttachments.push(pdfAttachment);
      }
    } catch (error) {
      console.warn(
        `[document-analysis] PDF extraction error: ${fileName}`,
        error
      );
      pdfFallbackAttachments.push(pdfAttachment);
    }
  } else {
    images.push({
      data: fileBytes,
      mimeType: normalizedMimeType,
      filename: fileName,
    });
    console.log(
      `[document-analysis] Prepared image for AI analysis: ${fileName} (${fileBytes.length} bytes)`
    );
  }

  const documentContent = `Uploaded document: ${fileName}\nThis is a ${isPdf ? "PDF document" : "receipt/invoice image"} uploaded by the user for transaction analysis.`;

  console.log("[document-analysis] Uploaded file ready", {
    isPdf,
    pdfTextCount: pdfTexts.length,
    pdfFallbackCount: pdfFallbackAttachments.length,
    imageCount: images.length,
  });

  const attachments: AnalyzedAttachment[] = [...images, ...pdfAttachments];

  try {
    const result = await extractTransactionFromEmail(
      documentContent,
      userFullName,
      images,
      pdfTexts,
      pdfFallbackAttachments,
      userLocale,
      userClarifications
    );
    return { ...result, attachments };
  } catch (error) {
    console.error("[document-analysis] AI pipeline threw", error);
    return {
      hasTransaction: false,
      reason: error instanceof Error ? error.message : "AI processing failed",
      attachments,
      aiError: true,
    };
  }
}
