// Process Document Edge Function - Extract transactions from uploaded files
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireUserAuth } from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { analyzeDocumentForTransaction } from "../_shared/lib/document-analysis.ts";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

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
    const auth = await requireUserAuth(req, corsHeaders);
    if (auth instanceof Response) {
      return auth;
    }
    const { user } = auth;

    const contentType = req.headers.get("content-type") || "";
    const fileName = req.headers.get("x-file-name") || "unknown";
    const userLocale =
      req.headers.get("x-user-locale") ||
      req.headers
        .get("accept-language")
        ?.split(",")[0]
        ?.split(";")[0]
        ?.trim() ||
      undefined;

    const arrayBuffer = await req.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);

    if (fileBytes.length === 0) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (fileBytes.length > MAX_SIZE) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum size is 5MB." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!ALLOWED_TYPES.includes(contentType)) {
      return new Response(
        JSON.stringify({
          error: "Unsupported file type. Only PDF and image files are allowed.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let userFullName: string | undefined;
    const { data: userData } = await supabase.auth.admin.getUserById(user.id);
    if (userData?.user?.user_metadata?.full_name) {
      userFullName = userData.user.user_metadata.full_name;
    }

    const aiResult = await analyzeDocumentForTransaction({
      kind: "upload",
      fileBytes,
      contentType,
      fileName,
      userFullName,
      userLocale,
    });

    const { flushLangfuse } = await import("../_shared/lib/langfuse.ts");
    await flushLangfuse();

    if (aiResult.hasTransaction) {
      console.log(
        "AI successfully extracted transaction from uploaded document"
      );

      const transaction = aiResult.data;

      const { data: savedTransaction, error: insertError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          source_email: "manual-upload",
          source_message_id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date: new Date().toISOString(),
          amount: transaction.amount,
          currency: transaction.currency || "USD",
          transaction_type: transaction.type,
          transaction_description: transaction.description,
          transaction_date:
            transaction.date || new Date().toISOString().split("T")[0],
          merchant: transaction.merchant,
          category: transaction.category,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error saving transaction:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to save transaction" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          transaction: savedTransaction,
          message: "Transaction created successfully from document",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      console.log(
        "AI could not extract transaction from uploaded document:",
        aiResult.reason
      );

      return new Response(
        JSON.stringify({
          success: false,
          error:
            aiResult.reason ||
            "Could not extract transaction data from document",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error in process-document:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
