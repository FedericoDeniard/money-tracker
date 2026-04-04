// Gmail Webhook Edge Function - Processes real-time Gmail notifications
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { analyzeDocumentForTransaction } from "../_shared/lib/document-analysis.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createSystemNotification } from "../_shared/notifications.ts";
import {
  type OAuthTokenRow,
  GmailReconnectRequiredError,
  ensureFreshAccessToken,
  fetchGmailWithRecovery,
} from "../_shared/lib/gmail-auth.ts";

// Set to avoid processing the same message multiple times
const processedMessages = new Set<string>();

Deno.serve(async req => {
  const preflightResponse = handleCorsPreflightRequest(req);
  if (preflightResponse) {
    return preflightResponse;
  }
  const corsHeaders = getCorsHeaders(req);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Verify the request is from Google Pub/Sub
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("Webhook received without proper authorization header");
      // TODO: enforce auth rejection after configuring Pub/Sub OIDC token verification
    }

    // Verify the message has the expected structure
    const body = await req.json();

    if (!body || !body.message || !body.message.data) {
      console.error("Invalid webhook payload structure");
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode the base64 message
    const data = JSON.parse(atob(body.message.data));

    const gmailEmail = data.emailAddress;
    const historyId = data.historyId;

    // Avoid processing the same historyId multiple times
    const historyKey = `${gmailEmail}-${historyId}`;
    if (processedMessages.has(historyKey)) {
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    processedMessages.add(historyKey);
    console.log("Processing notification", { gmailEmail });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find ALL user tokens for this Gmail account
    const { data: allTokens, error: tokenError } = await supabase
      .from("user_oauth_tokens")
      .select("*")
      .eq("gmail_email", gmailEmail)
      .eq("is_active", true);

    if (tokenError || !allTokens || allTokens.length === 0) {
      console.error("No active tokens found for", { gmailEmail });
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    console.log(`Found ${allTokens.length} active token(s) for ${gmailEmail}`);

    // Keep only tokens that can be refreshed/used.
    const validTokens: OAuthTokenRow[] = [];
    for (const tokenData of allTokens as OAuthTokenRow[]) {
      try {
        await ensureFreshAccessToken(
          supabase,
          tokenData,
          "webhook_token_check"
        );
        validTokens.push(tokenData);
      } catch (error) {
        if (error instanceof GmailReconnectRequiredError) {
          console.warn(
            `Token deactivated for user ${tokenData.user_id} during webhook preflight`
          );
          continue;
        }
        console.error(`Error verifying token for user ${tokenData.user_id}`, {
          error,
        });
      }
    }

    if (validTokens.length === 0) {
      console.error("No valid tokens to process this email");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    console.log(`${validTokens.length} valid token(s) found`);

    // Use the first valid token to read the message
    const firstToken = validTokens[0];

    // Get the last historyId saved
    const { data: watchData } = await supabase
      .from("gmail_watches")
      .select("history_id, topic_name")
      .eq("gmail_email", gmailEmail)
      .eq("is_active", true)
      .order("history_id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!watchData?.history_id) {
      // No saved historyId — save current one so next notification works properly
      console.log("No saved historyId, initializing gmail_watches record");
      await supabase.from("gmail_watches").upsert(
        {
          user_id: firstToken.user_id,
          gmail_email: gmailEmail,
          history_id: historyId.toString(),
          is_active: true,
          topic_name:
            watchData?.topic_name ||
            "projects/unknown/topics/gmail-notifications",
          label_ids: ["INBOX"],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,gmail_email" }
      );
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Use History API to find new INBOX messages since last processed historyId
    const historyUrl = `https://www.googleapis.com/gmail/v1/users/me/history?startHistoryId=${watchData.history_id}&historyTypes=messageAdded&labelId=INBOX`;

    let historyResponse: Response;
    try {
      historyResponse = await fetchGmailWithRecovery(
        supabase,
        firstToken,
        historyUrl,
        { method: "GET" },
        "webhook_history_fetch"
      );
    } catch (error) {
      if (error instanceof GmailReconnectRequiredError) {
        console.warn(
          `Token requires reconnect while fetching history for ${gmailEmail}`
        );
        return new Response("OK", { status: 200, headers: corsHeaders });
      }
      throw error;
    }

    if (!historyResponse.ok) {
      console.error("Failed to fetch history:", historyResponse.statusText);
      await createSystemNotification({
        typeKey: "gmail_sync_error",
        userId: firstToken.user_id,
        actionPath: "/settings",
        iconKey: "alert",
        i18nParams: {
          email: gmailEmail,
          reason: historyResponse.statusText,
        },
        metadata: {
          gmailEmail,
          stage: "history_fetch",
          status: historyResponse.status,
        },
        dedupeKey: `gmail-sync-error-${firstToken.user_id}-${gmailEmail}-history`,
        dedupeWindowMinutes: 180,
      });
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const historyData = await historyResponse.json();
    const history = historyData.history;

    if (!history || history.length === 0) {
      // Update historyId even if no new messages (could be a draft/label event)
      await supabase
        .from("gmail_watches")
        .update({
          history_id: historyId.toString(),
          updated_at: new Date().toISOString(),
        })
        .eq("gmail_email", gmailEmail)
        .eq("is_active", true);
      console.log("No new INBOX messages (probably a draft/label/read event)");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const addedMessages = history
      .flatMap((h: any) => h.messagesAdded || [])
      .filter((m: any) => m.message?.labelIds?.includes("INBOX"));

    if (addedMessages.length === 0) {
      await supabase
        .from("gmail_watches")
        .update({
          history_id: historyId.toString(),
          updated_at: new Date().toISOString(),
        })
        .eq("gmail_email", gmailEmail)
        .eq("is_active", true);
      console.log("No new messages in INBOX");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const latestMessage = addedMessages[addedMessages.length - 1];
    const messageId = latestMessage?.message?.id;
    if (!messageId) {
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    console.log("Processing message", { messageId });

    // Update historyId in database
    await supabase
      .from("gmail_watches")
      .update({
        history_id: historyId.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq("gmail_email", gmailEmail)
      .eq("is_active", true);

    // Get full message details
    let messageResponse: Response;
    try {
      messageResponse = await fetchGmailWithRecovery(
        supabase,
        firstToken,
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        { method: "GET" },
        "webhook_message_fetch"
      );
    } catch (error) {
      if (error instanceof GmailReconnectRequiredError) {
        console.warn(
          `Token requires reconnect while fetching message for ${gmailEmail}`
        );
        return new Response("OK", { status: 200, headers: corsHeaders });
      }
      throw error;
    }

    if (!messageResponse.ok) {
      console.error("Failed to fetch message:", messageResponse.statusText);
      await createSystemNotification({
        typeKey: "gmail_sync_error",
        userId: firstToken.user_id,
        actionPath: "/settings",
        iconKey: "alert",
        i18nParams: {
          email: gmailEmail,
          reason: messageResponse.statusText,
        },
        metadata: {
          gmailEmail,
          stage: "message_fetch",
          status: messageResponse.status,
          messageId,
        },
        dedupeKey: `gmail-sync-error-${firstToken.user_id}-${gmailEmail}-message`,
        dedupeWindowMinutes: 180,
      });
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const message = await messageResponse.json();

    // Verify that the email is in INBOX and not in SPAM
    const labelIds = message.labelIds || [];
    if (
      !labelIds.includes("INBOX") ||
      labelIds.includes("SPAM") ||
      labelIds.includes("TRASH")
    ) {
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Extract important headers
    const headers = message.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
    const fromHeader = headers.find((h: any) => h.name === "From")?.value || "";
    const dateHeader = headers.find((h: any) => h.name === "Date")?.value;
    const date = dateHeader
      ? new Date(dateHeader).toISOString()
      : new Date().toISOString();

    // Extract sender email
    const fromEmailMatch =
      fromHeader.match(/<(.+?)>/) || fromHeader.match(/([^\s]+@[^\s]+)/);
    const fromEmail = fromEmailMatch
      ? fromEmailMatch[1] || fromEmailMatch[0]
      : fromHeader;

    // Extract body text
    const bodyText = extractBodyText(message.payload);

    // Get user context for AI
    let userFullName: string | undefined;
    if (validTokens.length > 0) {
      const { data: userData, error: userError } =
        await supabase.auth.admin.getUserById(validTokens[0].user_id);
      if (!userError && userData?.user?.user_metadata?.full_name) {
        userFullName = userData.user.user_metadata.full_name;
        console.log("User context for AI", { userFullName });
      }
    }

    console.log("Analyzing email...", { bodyTextLength: bodyText.length });

    // Use shared document analysis pipeline (image/PDF extraction + AI)
    try {
      const aiResult = await analyzeDocumentForTransaction({
        kind: "gmail",
        accessToken: firstToken.access_token || "",
        messageId: message.id,
        payload: message.payload,
        bodyText,
        userFullName,
        attachmentOptions: {
          fetchAttachmentData: async (
            targetMessageId: string,
            attachmentId: string
          ) => {
            const attachmentResponse = await fetchGmailWithRecovery(
              supabase,
              firstToken,
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${targetMessageId}/attachments/${attachmentId}`,
              { method: "GET" },
              "webhook_fetch_attachment"
            );
            if (!attachmentResponse.ok) return null;
            return await attachmentResponse.json();
          },
        },
      });

      // Flush Langfuse events before returning (critical for serverless)
      const { flushLangfuse } = await import("../_shared/lib/langfuse.ts");
      await flushLangfuse();

      if (aiResult.hasTransaction) {
        console.log("Transaction detected by AI", { fromEmail, subject });
        const transaction = aiResult.data;

        // Create transaction for each user with valid token
        for (const tokenData of validTokens) {
          const { error: insertError } = await supabase
            .from("transactions")
            .insert({
              user_id: tokenData.user_id, // ← Agregar user_id explícitamente
              user_oauth_token_id: tokenData.id,
              source_email: fromEmail,
              source_message_id: message.id,
              date: date,
              amount: transaction.amount,
              currency: transaction.currency,
              transaction_type: transaction.type,
              transaction_description: transaction.description,
              transaction_date: transaction.date || date.split("T")[0],
              merchant: transaction.merchant,
              category: transaction.category,
            });

          if (insertError) {
            if (insertError.code === "23505") {
              console.log(
                `Transaction already exists for user ${tokenData.user_id}`
              );
            } else {
              console.error(
                `Error saving transaction for user ${tokenData.user_id}`,
                { error: insertError }
              );
            }
          } else {
            console.log(
              `AI transaction saved for user ${tokenData.user_id}: ${transaction.amount} ${transaction.currency}`
            );
          }
        }

        console.log(
          `AI transaction processed for ${validTokens.length} user(s)`
        );
      } else {
        console.log("No transaction detected by AI - discarding");

        // Save in discarded_emails for each valid user
        for (const tokenData of validTokens) {
          const { error: discardError } = await supabase
            .from("discarded_emails")
            .insert({
              user_oauth_token_id: tokenData.id,
              message_id: message.id,
              reason: aiResult.reason || "No transaction detected",
            });

          if (discardError) {
            if (discardError.code === "23505") {
              console.log(
                `Email already discarded for user ${tokenData.user_id}`
              );
            } else {
              console.error(
                `Error saving discarded email for user ${tokenData.user_id}`,
                { error: discardError }
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in AI processing:", error);

      // Fallback to keyword detection
      const transactionKeywords = [
        "purchase",
        "payment",
        "charge",
        "debit",
        "credit",
        "invoice",
        "receipt",
        "$",
        "€",
        "£",
      ];
      const hasTransactionKeywords = transactionKeywords.some(
        keyword =>
          subject.toLowerCase().includes(keyword) ||
          bodyText.toLowerCase().includes(keyword)
      );

      if (hasTransactionKeywords) {
        console.log("Fallback: Transaction detected by keywords", {
          fromEmail,
          subject,
        });

        // Create transaction for each user with valid token
        for (const tokenData of validTokens) {
          const { error: insertError } = await supabase
            .from("transactions")
            .insert({
              user_oauth_token_id: tokenData.id,
              source_email: fromEmail,
              source_message_id: message.id,
              date: date,
              amount: 0,
              currency: "USD",
              transaction_type: "expense",
              transaction_description: subject,
              transaction_date: date.split("T")[0],
              merchant: fromEmail,
              category: "uncategorized",
            });

          if (insertError) {
            if (insertError.code === "23505") {
              console.log(
                `Transaction already exists for user ${tokenData.user_id}`
              );
            } else {
              console.error(
                `Error saving transaction for user ${tokenData.user_id}`,
                { error: insertError }
              );
            }
          } else {
            console.log(
              `Fallback transaction saved for user ${tokenData.user_id}`
            );
          }
        }

        console.log(
          `Fallback transaction processed for ${validTokens.length} user(s)`
        );
      } else {
        console.log("No transaction detected - discarding");

        // Save in discarded_emails for each valid user
        for (const tokenData of validTokens) {
          const { error: discardError } = await supabase
            .from("discarded_emails")
            .insert({
              user_oauth_token_id: tokenData.id,
              message_id: message.id,
              reason: "No transaction detected (fallback)",
            });

          if (discardError && discardError.code !== "23505") {
            console.error(
              `Error saving discarded email for user ${tokenData.user_id}`,
              { error: discardError }
            );
          }
        }
      }
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error) {
    if (error instanceof GmailReconnectRequiredError) {
      console.warn("Webhook token requires reconnect");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }
    console.error("Error processing webhook", { error });
    return new Response("OK", { status: 500, headers: corsHeaders });
  }
});

function extractBodyText(payload: any): string {
  let text = "";

  if (payload.body?.data) {
    text = atob(payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        const plainText = atob(
          part.body.data.replace(/-/g, "+").replace(/_/g, "/")
        );
        if (plainText.trim()) {
          text = plainText;
          break;
        }
      }
      // If multipart, search recursively
      if (part.mimeType?.startsWith("multipart/")) {
        const nestedText = extractBodyText(part);
        if (nestedText.trim()) {
          text = nestedText;
        }
      }
    }

    // If no text/plain found, try text/html
    if (!text.trim()) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/html" && part.body?.data) {
          const htmlText = atob(
            part.body.data.replace(/-/g, "+").replace(/_/g, "/")
          );
          // Extract basic text from HTML
          text = htmlText
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (text) break;
        }
      }
    }
  }

  return text;
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request with Gmail webhook payload:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/gmail-webhook' \
    --header 'Content-Type: application/json' \
    --data '{
      "message": {
        "data": "eyJlbWFpbEFkZHJlc3MiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaGlzdG9yeUlkIjoxMjM0NX0="
      }
    }'

*/
