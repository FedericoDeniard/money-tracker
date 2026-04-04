// Shared document analysis pipeline.
// Handles both Gmail email attachments and directly uploaded files,
// providing a unified flow: local text extraction → AI fallback with PDF file input.
import { extractText, getDocumentProxy } from "npm:unpdf";
import {
  extractImageAttachments,
  extractPdfDataForAiFallback,
  type AttachmentRequestOptions,
  type ImageAttachment,
  type PdfAttachmentForAiFallback,
} from "./attachment-extractor.ts";
import {
  extractTransactionFromEmail,
  type TransactionResponse,
} from "../ai/transaction-agent.ts";

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
}

export type DocumentInput = GmailAttachmentInput | UploadedFileInput;

export async function analyzeDocumentForTransaction(
  input: DocumentInput
): Promise<TransactionResponse> {
  if (input.kind === "gmail") {
    return analyzeGmailAttachments(input);
  }
  return analyzeUploadedFile(input);
}

async function analyzeGmailAttachments(
  input: GmailAttachmentInput
): Promise<TransactionResponse> {
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
  });

  return extractTransactionFromEmail(
    input.bodyText,
    input.userFullName,
    images,
    pdfResult.texts,
    pdfResult.fallbackPdfAttachments
  );
}

async function analyzeUploadedFile(
  input: UploadedFileInput
): Promise<TransactionResponse> {
  const { fileBytes, contentType, fileName, userFullName, userLocale } = input;

  const normalizedMimeType =
    contentType === "image/jpg" ? "image/jpeg" : contentType;
  const isPdf = normalizedMimeType === "application/pdf";

  let images: ImageAttachment[] = [];
  let pdfTexts: string[] = [];
  let pdfFallbackAttachments: PdfAttachmentForAiFallback[] = [];

  if (isPdf) {
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
        pdfFallbackAttachments.push({
          data: fileBytes,
          mimeType: "application/pdf",
          filename: fileName,
        });
      }
    } catch (error) {
      console.warn(
        `[document-analysis] PDF extraction error, queuing for AI fallback: ${fileName}`,
        error
      );
      pdfFallbackAttachments.push({
        data: fileBytes,
        mimeType: "application/pdf",
        filename: fileName,
      });
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

  return extractTransactionFromEmail(
    documentContent,
    userFullName,
    images,
    pdfTexts,
    pdfFallbackAttachments,
    userLocale
  );
}
