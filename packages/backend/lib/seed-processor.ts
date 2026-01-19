import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { decryptToken } from "./encryption";
import { extractTransactionFromEmail } from "../ai/agents/transaction-agent";
import { extractPdfAttachments } from "./pdf-extractor";
import { extractImageAttachments } from "./image-extractor";
import { gmailLogger } from "../src/config/logger";
import type { gmail_v1 } from "googleapis";

// Initialize Supabase with service role key
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// OAuth2 Client
const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.OAUTH_REDIRECT_URI
);

const BATCH_SIZE = 50; // Process 50 emails in parallel (aggressive mode)
const MAX_RETRIES = 3;
const MONTHS_TO_SEED = 3;

interface SeedJobData {
    id: string;
    user_id: string;
    user_oauth_token_id: string;
    status: string;
}

interface EmailMessage {
    id: string;
    threadId?: string;
}

/**
 * Main function to process a seed job
 */
export async function processSeedJob(seedId: string): Promise<void> {
    try {
        // Get seed data
        const { data: seed, error: seedError } = await supabase
            .from("seeds")
            .select("*")
            .eq("id", seedId)
            .single();

        if (seedError || !seed) {
            throw new Error(`Seed not found: ${seedId}`);
        }

        const typedSeed = seed as SeedJobData;

        // Get user OAuth tokens
        const { data: tokenData, error: tokenError } = await supabase
            .from("user_oauth_tokens")
            .select("*")
            .eq("id", typedSeed.user_oauth_token_id)
            .single();

        if (tokenError || !tokenData) {
            throw new Error("OAuth tokens not found");
        }

        // Decrypt tokens
        const accessToken = await decryptToken(tokenData.access_token_encrypted);
        const refreshToken = tokenData.refresh_token_encrypted
            ? await decryptToken(tokenData.refresh_token_encrypted)
            : null;

        // Set credentials
        oAuth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken || undefined,
        });

        const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

        // Get user full name for context
        let userFullName: string | undefined;
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
            typedSeed.user_id
        );
        if (!userError && userData?.user?.user_metadata?.full_name) {
            userFullName = userData.user.user_metadata.full_name;
        }

        // Calculate date 3 months ago
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - MONTHS_TO_SEED);
        const afterDate = threeMonthsAgo.toISOString().split('T')[0]?.replace(/-/g, '/') || '';
        const query = `after:${afterDate}`;

        // Get all message IDs
        const messageIds = await getAllMessageIds(gmail, query);

        if (messageIds.length === 0) {
            await updateSeedStatus(seedId, "completed", undefined, {
                totalEmails: 0,
                transactionsFound: 0,
                totalSkipped: 0,
                emailsProcessedByAI: 0,
            });
            return;
        }

        // Process emails in batches
        let transactionsFound = 0;
        let errorsCount = 0;
        let totalSkipped = 0;

        for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
            const batch = messageIds.slice(i, i + BATCH_SIZE);

            const results = await Promise.allSettled(
                batch.map(msgId => processEmail(gmail, msgId, tokenData.id, userFullName))
            );

            // Count results
            for (const result of results) {
                if (result.status === "fulfilled") {
                    if (result.value.skipped) {
                        totalSkipped++;
                    } else if (result.value.success) {
                        transactionsFound++;
                    }
                } else {
                    errorsCount++;
                }
            }
        }

        // Mark seed as completed
        await updateSeedStatus(seedId, "completed", undefined, {
            totalEmails: messageIds.length,
            transactionsFound,
            totalSkipped,
            emailsProcessedByAI: messageIds.length - totalSkipped,
        });

        gmailLogger.info("Seed completed", {
            seedId,
            totalEmails: messageIds.length,
            transactionsFound,
            totalSkipped,
            emailsProcessedByAI: messageIds.length - totalSkipped,
            errorsCount,
        });

    } catch (error) {
        gmailLogger.error("Seed job failed", { error, seedId });
        await updateSeedStatus(seedId, "failed",
            error instanceof Error ? error.message : "Unknown error"
        );
        throw error;
    }
}

/**
 * Get all message IDs from Gmail with pagination
 */
async function getAllMessageIds(
    gmail: gmail_v1.Gmail,
    query: string
): Promise<string[]> {
    const allMessages: string[] = [];
    let pageToken: string | undefined;

    do {
        const response = await gmail.users.messages.list({
            userId: "me",
            q: query,
            maxResults: 500,
            pageToken,
        });

        const messages = (response.data.messages || []) as EmailMessage[];
        allMessages.push(...messages.map(m => m.id));
        pageToken = response.data.nextPageToken || undefined;

    } while (pageToken);

    return allMessages;
}

/**
 * Check if an email should be processed (not already in transactions or discarded_emails)
 */
async function shouldProcessEmail(
    messageId: string,
    userOauthTokenId: string
): Promise<boolean> {
    // 1. Check if already in transactions
    const { data: transaction } = await supabase
        .from("transactions")
        .select("id")
        .eq("user_oauth_token_id", userOauthTokenId)
        .eq("source_message_id", messageId)
        .maybeSingle();

    if (transaction) return false; // Already a saved transaction

    // 2. Check if already discarded
    const { data: discarded } = await supabase
        .from("discarded_emails")
        .select("id")
        .eq("user_oauth_token_id", userOauthTokenId)
        .eq("message_id", messageId)
        .maybeSingle();

    if (discarded) return false; // Already processed and discarded

    return true; // Should process
}

/**
 * Process a single email and extract transaction
 */
async function processEmail(
    gmail: gmail_v1.Gmail,
    messageId: string,
    userOauthTokenId: string,
    userFullName?: string,
    retryCount: number = 0
): Promise<{ success: boolean; isDuplicate: boolean; skipped: boolean }> {
    try {
        // Check if we should skip this email
        const shouldProcess = await shouldProcessEmail(messageId, userOauthTokenId);
        if (!shouldProcess) {
            return { success: false, isDuplicate: false, skipped: true };
        }

        // Get message details
        const messageResponse = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "full",
        });

        // Use the ID from the response for consistency
        const gmailMessageId = messageResponse.data.id || messageId;

        // Skip if not in INBOX or in SPAM/TRASH
        const labelIds = messageResponse.data.labelIds || [];
        if (!labelIds.includes('INBOX') || labelIds.includes('SPAM') || labelIds.includes('TRASH')) {
            return { success: false, isDuplicate: false, skipped: true };
        }

        // Extract headers
        const headers = messageResponse.data.payload?.headers;
        const fromHeader = headers?.find((h) => h.name === "From")?.value || '';
        const dateHeader = headers?.find((h) => h.name === "Date")?.value;
        const date = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();

        // Extract sender email
        const fromEmailMatch = fromHeader.match(/<(.+?)>/) || fromHeader.match(/([^\s]+@[^\s]+)/);
        const fromEmail = fromEmailMatch ? (fromEmailMatch[1] || fromEmailMatch[0]) : fromHeader;

        // Extract body text
        const bodyText = extractBody(messageResponse.data.payload || {});

        // Extract text from PDF attachments
        const pdfTexts = await extractPdfAttachments(gmail, gmailMessageId);

        // Extract text from images with OCR
        const imageTexts = await extractImageAttachments(gmail, gmailMessageId);

        // Combine all content
        const contentParts = [bodyText];
        if (pdfTexts.length > 0) {
            for (const pdfText of pdfTexts) {
                contentParts.push('--- PDF ATTACHMENT ---');
                contentParts.push(pdfText);
            }
        }
        if (imageTexts.length > 0) {
            for (const imageText of imageTexts) {
                contentParts.push('--- IMAGE ATTACHMENT (OCR) ---');
                contentParts.push(imageText);
            }
        }
        const fullContent = contentParts.filter(t => t.trim()).join('\n\n');

        // Extract transaction using AI
        let aiResult;
        try {
            aiResult = await extractTransactionFromEmail(fullContent, userFullName);
        } catch (error) {
            // ZodError o cualquier error de validación - descartar email
            const reason = error instanceof Error
                ? `Validation error: ${error.message}`
                : 'Invalid AI response format';

            await supabase.from("discarded_emails").insert({
                user_oauth_token_id: userOauthTokenId,
                message_id: gmailMessageId,
                reason: reason
            });

            // Silently ignore duplicate errors (already discarded)

            return { success: false, isDuplicate: false, skipped: false };
        }

        // Si aiResult.success === false, también es un email descartado
        if (!aiResult.success) {
            const reason = 'error' in aiResult && aiResult.error
                ? aiResult.error
                : 'AI failed to process email';

            await supabase.from("discarded_emails").insert({
                user_oauth_token_id: userOauthTokenId,
                message_id: gmailMessageId,
                reason: reason
            });

            // Silently ignore duplicate errors (already discarded)

            return { success: false, isDuplicate: false, skipped: false };
        }

        if (aiResult.success && aiResult.data && 'amount' in aiResult.data) {
            const transaction = aiResult.data;

            // Insert transaction into database
            const { error: insertError } = await supabase
                .from("transactions")
                .insert({
                    user_oauth_token_id: userOauthTokenId,
                    source_email: fromEmail,
                    source_message_id: gmailMessageId,
                    date: date,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    transaction_type: transaction.type,
                    transaction_description: transaction.description,
                    transaction_date: transaction.date || date.split('T')[0],
                    merchant: transaction.merchant,
                    category: transaction.category,
                });

            if (insertError) {
                if (insertError.code === '23505') {
                    // Duplicate - this is expected
                    return { success: false, isDuplicate: true, skipped: false };
                }
                throw insertError;
            }

            return { success: true, isDuplicate: false, skipped: false };
        }

        // Not a transaction - save as discarded to avoid re-processing
        const reason = (aiResult.data && 'reason' in aiResult.data && aiResult.data.reason)
            ? aiResult.data.reason
            : 'No transaction found';

        await supabase.from("discarded_emails").insert({
            user_oauth_token_id: userOauthTokenId,
            message_id: gmailMessageId,
            reason: reason
        });

        // Silently ignore duplicate errors (already discarded)

        return { success: false, isDuplicate: false, skipped: false };

    } catch (error) {
        // Retry on network errors
        if (retryCount < MAX_RETRIES && isRetryableError(error)) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return processEmail(gmail, messageId, userOauthTokenId, userFullName, retryCount + 1);
        }

        throw error;
    }
}

/**
 * Extract body text from email payload (same logic as webhook)
 */
function extractBody(payload: {
    body?: { data?: string | null };
    parts?: Array<{
        mimeType?: string | null;
        body?: { data?: string | null };
        parts?: unknown[];
    }>
}): string {
    let text = '';

    // If has body data directly
    if (payload.body?.data) {
        text = Buffer.from(payload.body.data, "base64").toString();
    }

    // If has parts, search recursively
    if (payload.parts) {
        for (const part of payload.parts) {
            // Prioritize text/plain
            if (part.mimeType === "text/plain" && part.body?.data) {
                const plainText = Buffer.from(part.body.data, "base64").toString();
                if (plainText.trim()) {
                    text = plainText;
                    break;
                }
            }
            // If multipart, search recursively
            if (part.mimeType?.startsWith("multipart/")) {
                const nestedText = extractBody(part as Parameters<typeof extractBody>[0]);
                if (nestedText.trim()) {
                    text = nestedText;
                }
            }
        }

        // If no text/plain found, try text/html
        if (!text.trim()) {
            for (const part of payload.parts) {
                if (part.mimeType === "text/html" && part.body?.data) {
                    const htmlText = Buffer.from(part.body.data, "base64").toString();
                    // Extract basic text from HTML (remove tags)
                    text = htmlText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                    if (text) break;
                }
            }
        }
    }

    return text;
}

/**
 * Update seed status
 */
async function updateSeedStatus(
    seedId: string,
    status: string,
    errorMessage?: string,
    results?: {
        totalEmails?: number;
        transactionsFound?: number;
        totalSkipped?: number;
        emailsProcessedByAI?: number;
    }
): Promise<void> {
    const updateData: Record<string, string | number> = {
        status,
        updated_at: new Date().toISOString(),
    };

    if (errorMessage) {
        updateData.error_message = errorMessage;
    }

    if (results) {
        if (results.totalEmails !== undefined) {
            updateData.total_emails = results.totalEmails;
        }
        if (results.transactionsFound !== undefined) {
            updateData.transactions_found = results.transactionsFound;
        }
        if (results.totalSkipped !== undefined) {
            updateData.total_skipped = results.totalSkipped;
        }
        if (results.emailsProcessedByAI !== undefined) {
            updateData.emails_processed_by_ai = results.emailsProcessedByAI;
        }
    }

    await supabase
        .from("seeds")
        .update(updateData)
        .eq("id", seedId);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
    if (!error) return false;

    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH'];
    const retryableStatusCodes = [429, 500, 502, 503, 504];

    const err = error as { code?: string; status?: number; message?: string };

    return !!(
        (err.code && retryableCodes.includes(err.code)) ||
        (err.status && retryableStatusCodes.includes(err.status)) ||
        err.message?.includes('timeout') ||
        err.message?.includes('network')
    );
}
