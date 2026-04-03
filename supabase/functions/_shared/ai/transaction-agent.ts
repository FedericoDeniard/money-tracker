import {
  TransactionResponseSchema,
  type TransactionResponse,
} from "./schemas.ts";
import { EMAIL_EXTRACTION_SYSTEM } from "../prompts/email-extraction.ts";
import { generateText, Output } from "npm:ai";
import { createOpenAI } from "npm:ai";
import { generateObject } from "npm:ai";
import { createXai } from "npm:@ai-sdk/xai";
import { z } from "npm:zod";
import { traceOperation } from "../lib/langfuse.ts";
import type {
  ImageAttachment,
  PdfAttachmentForAiFallback,
} from "../lib/attachment-extractor.ts";

// Date validation helper
function validateAndFixDate(dateString?: string): string | undefined {
  if (!dateString) return undefined;

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date detected: ${dateString}, using current date`);
      return new Date().toISOString().split("T")[0];
    }

    // Check if date is in reasonable range (not too far in future)
    const now = new Date();
    const maxFutureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

    if (date > maxFutureDate) {
      console.warn(`Future date detected: ${dateString}, using current date`);
      return new Date().toISOString().split("T")[0];
    }

    // Return in YYYY-MM-DD format
    return date.toISOString().split("T")[0];
  } catch (error) {
    console.warn(`Date validation error for ${dateString}:`, error);
    return new Date().toISOString().split("T")[0];
  }
}

const MODEL = "grok-4-1-fast-non-reasoning";
const FILE_FALLBACK_MODEL = "grok-4-1-fast-reasoning";
const TEMPERATURE = 0.1;

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function getResponsesOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const rawOutput = (payload as { output?: unknown }).output;
  if (!Array.isArray(rawOutput)) return "";

  const segments: string[] = [];
  for (const item of rawOutput) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const typedPart = part as { type?: unknown; text?: unknown };
      if (
        typedPart.type === "output_text" &&
        typeof typedPart.text === "string"
      ) {
        segments.push(typedPart.text);
      }
    }
  }

  return segments.join("\n").trim();
}

function getResponsesUsage(payload: unknown): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  raw: unknown;
} | null {
  if (!payload || typeof payload !== "object") return null;
  const usage = (payload as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") return null;

  const usageRecord = usage as {
    input_tokens?: unknown;
    output_tokens?: unknown;
    total_tokens?: unknown;
  };
  const inputTokens =
    typeof usageRecord.input_tokens === "number" ? usageRecord.input_tokens : 0;
  const outputTokens =
    typeof usageRecord.output_tokens === "number"
      ? usageRecord.output_tokens
      : 0;
  const totalTokens =
    typeof usageRecord.total_tokens === "number"
      ? usageRecord.total_tokens
      : inputTokens + outputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    raw: usage,
  };
}

async function extractTransactionFromPdfWithXaiFile(
  emailContent: string,
  userFullName: string | undefined,
  pdfAttachments: PdfAttachmentForAiFallback[]
): Promise<(TransactionResponse & { usage?: unknown }) | null> {
  const apiKey = Deno.env.get("XAI_API_KEY") || "";
  if (!apiKey) {
    console.warn(
      "[xai-file-fallback] Missing XAI_API_KEY, skipping PDF fallback"
    );
    return null;
  }

  const uploadedFileIds: string[] = [];

  try {
    for (const pdfAttachment of pdfAttachments) {
      const fileFormData = new FormData();
      fileFormData.append(
        "file",
        new Blob([pdfAttachment.data], { type: "application/pdf" }),
        pdfAttachment.filename || "attachment.pdf"
      );
      fileFormData.append("purpose", "assistants");

      const uploadResponse = await fetch("https://api.x.ai/v1/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: fileFormData,
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.text();
        console.warn("[xai-file-fallback] File upload failed", {
          filename: pdfAttachment.filename,
          status: uploadResponse.status,
          error: uploadError,
        });
        continue;
      }

      const uploadPayload = (await uploadResponse.json()) as { id?: string };
      if (!uploadPayload.id) {
        console.warn("[xai-file-fallback] Upload response without file id", {
          filename: pdfAttachment.filename,
        });
        continue;
      }
      uploadedFileIds.push(uploadPayload.id);
    }

    if (uploadedFileIds.length === 0) {
      console.warn(
        "[xai-file-fallback] No files uploaded for fallback analysis"
      );
      return null;
    }

    const ownerContext = userFullName
      ? `The account owner/recipient is: ${userFullName}.`
      : "The account owner/recipient name is unknown.";
    const fallbackPrompt = `${ownerContext}
Analyze all attached PDF receipts and the email body to determine if there is a financial transaction.
Email body:
${emailContent}

Return ONLY valid JSON matching this exact schema:
{
  "hasTransaction": boolean,
  "data": {
    "amount": number,
    "currency": "USD|EUR|GBP|JPY|CNY|INR|AUD|CAD|CHF|SEK|NOK|DKK|PLN|CZK|HUF|RON|BGN|HRK|RUB|TRY|MXN|ARS|CLP|COP|PEN|UYU|BOB|PYG|ILS|KRW|THB|VND|IDR|MYR|PHP|SGD|HKD|NZD|ZAR|NGN|GHS|KES|EGP|MAD|TND|DZD|LBP|JOD|IQD|BHD|KWD|QAR|SAR|AED|OMR",
    "type": "income|expense",
    "description": string,
    "date": "YYYY-MM-DD|null",
    "merchant": string,
    "category": "salary|entertainment|investment|food|transport|services|health|education|housing|clothing|other"
  },
  "reason": string
}
If no transaction is present, set hasTransaction=false and provide reason.
Keep merchant/description in original language from the document.`;

    const response = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: FILE_FALLBACK_MODEL,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: fallbackPrompt },
              ...uploadedFileIds.map(fileId => ({
                type: "input_file" as const,
                file_id: fileId,
              })),
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const responseError = await response.text();
      console.warn("[xai-file-fallback] Responses API failed", {
        status: response.status,
        error: responseError,
      });
      return null;
    }

    const responsePayload = await response.json();
    const usage = getResponsesUsage(responsePayload);
    const outputText = getResponsesOutputText(responsePayload);
    const jsonText = extractJsonObject(outputText);
    if (!jsonText) {
      console.warn("[xai-file-fallback] Could not parse JSON from output", {
        outputText,
      });
      return null;
    }

    const parsed = TransactionResponseSchema.parse(JSON.parse(jsonText));
    if (parsed.hasTransaction && parsed.data.amount === 0) {
      return {
        hasTransaction: false,
        reason: "Invalid transaction: amount is 0",
      };
    }

    if (parsed.hasTransaction) {
      return {
        hasTransaction: true,
        data: {
          ...parsed.data,
          merchant: parsed.data.merchant || "Unknown",
          date: validateAndFixDate(parsed.data.date),
        },
        usage: usage || undefined,
      };
    }

    return {
      hasTransaction: false,
      reason: parsed.reason || "No transaction found in PDF fallback",
      usage: usage || undefined,
    };
  } catch (error) {
    console.warn("[xai-file-fallback] Unexpected error", { error });
    return null;
  } finally {
    for (const uploadedFileId of uploadedFileIds) {
      try {
        await fetch(`https://api.x.ai/v1/files/${uploadedFileId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });
      } catch {
        // best-effort cleanup
      }
    }
  }
}

export async function extractTransactionFromEmail(
  emailContent: string,
  userFullName?: string,
  images?: ImageAttachment[],
  pdfTexts?: string[],
  pdfFallbackAttachments?: PdfAttachmentForAiFallback[]
): Promise<TransactionResponse> {
  return await traceOperation(
    "ai-transaction-processing",
    async () => {
      try {
        const xai = createXai({
          apiKey: Deno.env.get("XAI_API_KEY") || "",
        });

        let dynamicPrompt = "";

        if (userFullName) {
          dynamicPrompt += `IMPORTANT CONTEXT: The email recipient/account owner is: ${userFullName}\nUse this to determine if money was sent BY this person (expense) or RECEIVED by this person (income).\n\n`;
        }

        dynamicPrompt += `Email to analyze:\n${emailContent}`;

        if (pdfTexts && pdfTexts.length > 0) {
          for (const pdfText of pdfTexts) {
            dynamicPrompt += `\n\n--- PDF ATTACHMENT ---\n${pdfText}`;
          }
        }

        if (images && images.length > 0) {
          dynamicPrompt += `\n\nNote: ${images.length} image attachment(s) are included below. These may contain receipts, invoices, or transaction details. Analyze them along with the email text.`;
        }

        // Build generateText options
        const baseOptions = {
          model: xai(MODEL),
          system: EMAIL_EXTRACTION_SYSTEM,
          temperature: TEMPERATURE,
          output: Output.object({
            schema: TransactionResponseSchema,
          }),
        };

        let output;
        let usage: any = null;

        if (images && images.length > 0) {
          // Use messages format with image parts
          const contentParts: any[] = [
            { type: "text" as const, text: dynamicPrompt },
          ];

          for (const img of images) {
            contentParts.push({
              type: "image" as const,
              image: img.data,
              mimeType: img.mimeType,
            });
          }

          const result = await generateText({
            ...baseOptions,
            messages: [
              {
                role: "user",
                content: contentParts,
              },
            ],
          });
          output = result.output;
          usage = result.usage; // Capture usage from AI SDK
        } else {
          // Text-only: use simple prompt format
          const result = await generateText({
            ...baseOptions,
            prompt: dynamicPrompt,
          });
          output = result.output;
          usage = result.usage; // Capture usage from AI SDK
        }

        if (output.hasTransaction) {
          if (output.data.amount === 0) {
            return {
              hasTransaction: false,
              reason: "Invalid transaction: amount is 0",
            };
          }

          return {
            hasTransaction: true,
            data: {
              ...output.data,
              merchant: output.data.merchant || "Unknown",
              date: validateAndFixDate(output.data.date),
            },
            usage, // Include usage information for Langfuse tracking
          };
        }

        const baseNoTransaction: TransactionResponse = {
          hasTransaction: false,
          reason: output.reason,
          usage, // Include usage information even for no-transaction cases
        };

        if (
          !output.hasTransaction &&
          (!pdfTexts || pdfTexts.length === 0) &&
          pdfFallbackAttachments &&
          pdfFallbackAttachments.length > 0
        ) {
          console.log(
            "[xai-file-fallback] Triggering PDF fallback extraction",
            {
              fallbackPdfCount: pdfFallbackAttachments.length,
            }
          );
          const fallbackResult = await extractTransactionFromPdfWithXaiFile(
            emailContent,
            userFullName,
            pdfFallbackAttachments
          );
          if (fallbackResult?.hasTransaction) {
            console.log(
              "[xai-file-fallback] Transaction detected from PDF file fallback"
            );
            return fallbackResult;
          }
          if (fallbackResult && !fallbackResult.hasTransaction) {
            return {
              ...baseNoTransaction,
              reason: `${baseNoTransaction.reason} | PDF fallback: ${fallbackResult.reason}`,
            };
          }
        }

        return baseNoTransaction;
      } catch (error) {
        console.error("AI extraction error", error);
        return {
          hasTransaction: false,
          reason: "AI processing failed",
          usage: null, // No usage info on error
        };
      }
    },
    {
      imageCount: images?.length || 0,
      pdfCount: pdfTexts?.length || 0,
      fallbackPdfCount: pdfFallbackAttachments?.length || 0,
      contentLength: emailContent.length,
      hasUserContext: !!userFullName,
    }
  );
}
