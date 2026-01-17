import express from "express";
import cors from "cors";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { extractTransactionFromEmail } from "./ai/agents/transaction-agent";
import { encryptToken, decryptToken } from "./lib/encryption";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, type AuthRequest } from "./middleware/auth";

// Bun provides fetch globally
declare const fetch: typeof globalThis.fetch;

// Initialize Supabase with service role key for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Load environment variables with fallback to credentials.json
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const projectId = process.env.GOOGLE_PROJECT_ID;
const redirectUri = process.env.OAUTH_REDIRECT_URI;

// Fallback to credentials.json if environment variables are not set
let credentials;
if (!clientId || !clientSecret || !projectId) {
  credentials = JSON.parse(
    fs.readFileSync(path.join(import.meta.dir, "credentials.json"), "utf8"),
  );
}

const finalClientId = clientId || credentials?.installed?.client_id;
const finalClientSecret = clientSecret || credentials?.installed?.client_secret;
const finalProjectId = projectId || credentials?.installed?.project_id;
const finalRedirectUri =
  redirectUri ||
  credentials?.installed?.redirect_uris?.[0] ||
  "http://localhost:3001/auth/callback";

if (!finalClientId || !finalClientSecret || !finalProjectId) {
  throw new Error(
    "Missing required credentials. Set environment variables or ensure credentials.json exists.",
  );
}

const oAuth2Client = new google.auth.OAuth2(
  finalClientId,
  finalClientSecret,
  finalRedirectUri,
);

const app = express();

// Configure CORS to allow frontend requests
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Función para decodificar notificaciones de Pub/Sub
function decodeNotification(data: string) {
  return JSON.parse(Buffer.from(data, "base64").toString());
}

// Set para evitar procesar el mismo mensaje múltiples veces
const processedMessages = new Set<string>();

// Temporary endpoint to stop all Gmail watches
app.post("/stop-all-watches", async (req, res) => {
  try {
    // Get all active watches
    const { data: watches } = await supabase
      .from("gmail_watches")
      .select("*")
      .eq("is_active", true);

    if (!watches || watches.length === 0) {
      return res.json({ message: "No active watches found" });
    }

    const results = [];

    for (const watch of watches) {
      try {
        // Get user tokens
        const { data: tokenData } = await supabase
          .from("user_oauth_tokens")
          .select("*")
          .eq("gmail_email", watch.gmail_email)
          .single();

        if (!tokenData) {
          results.push({ email: watch.gmail_email, status: "no_tokens" });
          continue;
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

        // Stop watch
        const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
        await gmail.users.stop({ userId: "me" });

        // Mark as inactive in database
        await supabase
          .from("gmail_watches")
          .update({ is_active: false })
          .eq("id", watch.id);

        results.push({ email: watch.gmail_email, status: "stopped" });
      } catch (error) {
        results.push({
          email: watch.gmail_email,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    res.json({ message: "Watches processed", results });
  } catch (error) {
    console.error("Error stopping watches:", error);
    res.status(500).json({ error: "Failed to stop watches" });
  }
});

// Endpoint to disconnect Gmail
app.delete("/gmail-disconnect/:connectionId", requireAuth, async (req: AuthRequest, res) => {
  const { connectionId } = req.params;
  const userId = req.userId;

  if (!connectionId) {
    return res.status(400).json({ error: "Missing connectionId parameter" });
  }

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Get the token data first and verify ownership
    const { data: tokenData, error: fetchError } = await supabase
      .from("user_oauth_tokens")
      .select("*")
      .eq("id", connectionId)
      .eq("user_id", userId) // ✅ Verify ownership
      .single();

    if (fetchError || !tokenData) {
      return res.status(404).json({ error: "Connection not found or unauthorized" });
    }

    // Check if there are other users with the same Gmail account
    const { data: otherTokens } = await supabase
      .from("user_oauth_tokens")
      .select("id")
      .eq("gmail_email", tokenData.gmail_email)
      .neq("id", connectionId);

    const hasOtherUsers = otherTokens && otherTokens.length > 0;

    // Only stop the Gmail watch if this is the last user with this account
    if (!hasOtherUsers) {
      try {
        const accessToken = await decryptToken(tokenData.access_token_encrypted);
        oAuth2Client.setCredentials({ access_token: accessToken });
        const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
        await gmail.users.stop({ userId: "me" });
        console.log(`✓ Watch stopped for ${tokenData.gmail_email} (last user)`);
      } catch (error) {
        console.log("Could not stop watch (may not exist):", error);
      }

      // Delete ALL Gmail watches for this email (since we stopped the watch)
      await supabase
        .from("gmail_watches")
        .delete()
        .eq("gmail_email", tokenData.gmail_email);
    } else {
      console.log(`⏭️ Not stopping watch for ${tokenData.gmail_email} (${otherTokens.length} other user(s) still connected)`);

      // Only delete watches for THIS user
      await supabase
        .from("gmail_watches")
        .delete()
        .eq("gmail_email", tokenData.gmail_email)
        .eq("user_id", tokenData.user_id);
    }

    // Delete the OAuth token for this user
    const { error: tokenError } = await supabase
      .from("user_oauth_tokens")
      .delete()
      .eq("id", connectionId)
      .eq("user_id", userId); // ✅ Double-check ownership

    if (tokenError) {
      console.error("Error deleting token:", tokenError);
      return res.status(500).json({ error: "Failed to disconnect Gmail" });
    }

    return res.json({
      success: true,
      message: "Gmail disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting Gmail:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to start OAuth
app.get("/auth", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(401).send("Missing authentication token");
  }

  try {
    // Verify token with Supabase anon client
    const supabaseAnon = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || ''
    );

    const { data: { user }, error } = await supabaseAnon.auth.getUser(token as string);

    if (error || !user) {
      return res.status(401).send("Invalid or expired token");
    }

    const userId = user.id;

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/gmail.readonly"],
      state: userId, // Pass userId in state to retrieve it in callback
      prompt: "consent", // Force consent to get refresh token
    });
    res.redirect(authUrl);
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(500).send("Internal server error");
  }
});

// OAuth callback
app.get("/auth/callback", async (req, res) => {
  const { code, state } = req.query;
  const userId = state as string;

  if (!code) return res.status(400).send("No code");
  if (!userId) return res.status(400).send("No userId in state");

  try {
    const { tokens } = await oAuth2Client.getToken(code as string);
    oAuth2Client.setCredentials(tokens);

    // Get user's Gmail email address
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const gmailEmail = profile.data.emailAddress;

    if (!gmailEmail) {
      throw new Error("Could not retrieve Gmail email address");
    }

    // Calculate token expiration
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null;

    // Encrypt tokens before saving
    const encryptedAccessToken = await encryptToken(tokens.access_token!);
    const encryptedRefreshToken = tokens.refresh_token
      ? await encryptToken(tokens.refresh_token)
      : null;

    // Save encrypted tokens to database
    const { error: tokenError } = await supabase
      .from("user_oauth_tokens")
      .upsert(
        {
          user_id: userId,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_type: tokens.token_type || "Bearer",
          expires_at: expiresAt,
          scope: tokens.scope || null,
          gmail_email: gmailEmail,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,gmail_email",
        },
      );

    if (tokenError) {
      console.error("Error saving tokens:", tokenError);
      throw tokenError;
    }

    // Set up Gmail watch
    const topicName = `projects/${finalProjectId}/topics/${process.env.PUBSUB_TOPIC || "gmail-notifications"}`;
    const watchResponse = await gmail.users.watch({
      userId: "me",
      requestBody: {
        labelIds: ["INBOX"],
        topicName,
        // Solo procesar nuevos emails, no movimientos o eliminaciones
        labelFilterAction: "include",
      },
    });

    // Save watch information to database
    const watchExpiration = watchResponse.data.expiration
      ? new Date(parseInt(watchResponse.data.expiration)).toISOString()
      : null;

    const { error: watchError } = await supabase.from("gmail_watches").upsert(
      {
        user_id: userId,
        gmail_email: gmailEmail,
        watch_id: watchResponse.data.historyId || null,
        topic_name: topicName,
        label_ids: ["INBOX"],
        expiration: watchExpiration,
        history_id: watchResponse.data.historyId || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,gmail_email",
      },
    );

    if (watchError) {
      console.error("Error saving watch:", watchError);
    }

    console.log("✓ Gmail watch configurado para:", userId);

    // Redirect to frontend settings page with success
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/settings?success=true`);
  } catch (error) {
    console.error("Error en auth:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/settings?error=auth_failed`);
  }
});

// Webhook endpoint for Gmail notifications
app.post("/webhook", async (req, res) => {
  // Verify the request is from Google Pub/Sub
  const authHeader = req.headers.authorization;

  // Google Pub/Sub sends a Bearer token in the Authorization header
  // In production, you should verify this token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('⚠️ Webhook received without proper authorization header');
    // For now, we'll allow it, but in production you should reject it
    // return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verify the message has the expected structure
  if (!req.body || !req.body.message || !req.body.message.data) {
    console.error('❌ Invalid webhook payload structure');
    return res.status(400).json({ error: 'Invalid payload' });
  }

  // console.log("Webhook hit! Raw body:", JSON.stringify(req.body, null, 2)); // Debug only

  try {
    // Decodificar el mensaje base64
    const data = decodeNotification(req.body.message.data);
    // console.log("Datos decodificados:", data); // Debug only

    const gmailEmail = data.emailAddress;
    const historyId = data.historyId;

    // Evitar procesar el mismo historyId múltiples veces
    const historyKey = `${gmailEmail}-${historyId}`;
    if (processedMessages.has(historyKey)) {
      // console.log("Notificación ya procesada, ignorando..."); // Debug only
      return res.sendStatus(200);
    }
    processedMessages.add(historyKey);
    console.log("📧 Procesando notificación:", gmailEmail);

    // Find ALL user tokens for this Gmail account (multiple users can have the same account)
    const { data: allTokens, error: tokenError } = await supabase
      .from("user_oauth_tokens")
      .select("*")
      .eq("gmail_email", gmailEmail);

    if (tokenError || !allTokens || allTokens.length === 0) {
      console.error("No se encontraron tokens para:", gmailEmail);
      return res.sendStatus(200);
    }

    console.log(`📊 Encontrados ${allTokens.length} token(s) para ${gmailEmail}`);

    // Verify which tokens are valid
    const validTokens = [];

    for (const tokenData of allTokens) {
      try {
        // Check if token is expired by date first (avoid unnecessary API calls)
        const now = new Date();
        const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;

        if (expiresAt && now >= expiresAt) {
          // Try to refresh if we have refresh token
          if (tokenData.refresh_token_encrypted) {
            console.log(`🔄 Intentando refrescar token expirado para user ${tokenData.user_id}...`);
            const refreshToken = await decryptToken(tokenData.refresh_token_encrypted);

            oAuth2Client.setCredentials({
              refresh_token: refreshToken,
            });

            const { credentials } = await oAuth2Client.refreshAccessToken();
            const newEncryptedAccessToken = await encryptToken(credentials.access_token!);
            const newExpiresAt = credentials.expiry_date
              ? new Date(credentials.expiry_date).toISOString()
              : null;

            await supabase
              .from("user_oauth_tokens")
              .update({
                access_token_encrypted: newEncryptedAccessToken,
                expires_at: newExpiresAt,
                updated_at: new Date().toISOString(),
              })
              .eq("id", tokenData.id);

            // Update tokenData with new credentials
            tokenData.access_token_encrypted = newEncryptedAccessToken;
            tokenData.expires_at = newExpiresAt;

            validTokens.push(tokenData);
            console.log(`✓ Token refrescado exitosamente para user ${tokenData.user_id}`);
          } else {
            console.log(`❌ Token expirado sin refresh_token para user ${tokenData.user_id}`);
            continue;
          }
        } else {
          // Token not expired by date, verify with Google using lightweight call
          const accessToken = await decryptToken(tokenData.access_token_encrypted);

          const response = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
          );

          if (response.ok) {
            validTokens.push(tokenData);
            console.log(`✓ Token válido para user ${tokenData.user_id}`);
          } else {
            console.log(`❌ Token inválido para user ${tokenData.user_id}`);
          }
        }
      } catch (error) {
        console.log(`❌ Error verificando token para user ${tokenData.user_id}:`, error);
      }
    }

    if (validTokens.length === 0) {
      console.error("No hay tokens válidos para procesar este email");
      return res.sendStatus(200);
    }

    console.log(`✓ ${validTokens.length} token(s) válido(s) encontrado(s)`);

    // Use the first valid token to read the message (only once)
    const firstToken = validTokens[0];
    const accessToken = await decryptToken(firstToken.access_token_encrypted);
    const refreshToken = firstToken.refresh_token_encrypted
      ? await decryptToken(firstToken.refresh_token_encrypted)
      : null;

    oAuth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken || undefined,
      token_type: firstToken.token_type || "Bearer",
    });

    // Usar History API para obtener solo mensajes nuevos
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    // Obtener el último historyId guardado (puede haber múltiples watches para la misma cuenta)
    const { data: watchData } = await supabase
      .from("gmail_watches")
      .select("history_id")
      .eq("gmail_email", gmailEmail)
      .eq("is_active", true)
      .order("history_id", { ascending: false })
      .limit(1)
      .maybeSingle();

    const startHistoryId = watchData?.history_id || historyId;

    // Obtener cambios desde el último historyId
    const historyResponse = await gmail.users.history.list({
      userId: "me",
      startHistoryId: startHistoryId,
      historyTypes: ["messageAdded"], // Solo mensajes nuevos
      labelId: "INBOX",
    });

    const history = historyResponse.data.history;

    if (!history || history.length === 0) {
      console.log("No hay mensajes nuevos en el historial");
      return res.sendStatus(200);
    }

    // Filtrar solo messagesAdded
    const addedMessages = history
      .flatMap(h => h.messagesAdded || [])
      .filter(m => m.message?.labelIds?.includes("INBOX"));

    if (addedMessages.length === 0) {
      console.log("No hay mensajes nuevos en INBOX");
      return res.sendStatus(200);
    }

    // Procesar el mensaje más reciente
    const latestMessage = addedMessages[addedMessages.length - 1];
    if (!latestMessage || !latestMessage.message?.id) {
      return res.sendStatus(200);
    }

    const messageId = latestMessage.message.id;
    console.log("📨 Procesando mensaje:", messageId);

    // Actualizar historyId en la base de datos
    await supabase
      .from("gmail_watches")
      .update({ history_id: historyId })
      .eq("gmail_email", gmailEmail)
      .eq("is_active", true);

    const messageResponse = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    // Verificar que el email esté en INBOX y no en SPAM
    const labelIds = messageResponse.data.labelIds || [];
    if (!labelIds.includes('INBOX') || labelIds.includes('SPAM') || labelIds.includes('TRASH')) {
      // console.log("Email no está en INBOX o está en SPAM/TRASH - ignorando");
      // console.log("Labels:", labelIds); // Debug only
      return res.sendStatus(200);
    }

    // Extraer headers importantes
    const headers = messageResponse.data.payload?.headers;
    const subject = headers?.find((h) => h.name === "Subject")?.value || '';
    const fromHeader = headers?.find((h) => h.name === "From")?.value || '';
    const dateHeader = headers?.find((h) => h.name === "Date")?.value;
    const date = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();

    // Extraer el email del remitente del header From
    const fromEmailMatch = fromHeader.match(/<(.+?)>/) || fromHeader.match(/([^\s]+@[^\s]+)/);
    const fromEmail = fromEmailMatch ? (fromEmailMatch[1] || fromEmailMatch[0]) : fromHeader;

    // Extraer el cuerpo del email (recursivamente para manejar multipart)
    const extractBody = (payload: { body?: { data?: string | null }; parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } }> }): string => {
      let text = '';

      // Si tiene body data directamente
      if (payload.body?.data) {
        text = Buffer.from(payload.body.data, "base64").toString();
      }

      // Si tiene partes, buscar recursivamente
      if (payload.parts) {
        for (const part of payload.parts) {
          // Priorizar text/plain
          if (part.mimeType === "text/plain" && part.body?.data) {
            const plainText = Buffer.from(part.body.data, "base64").toString();
            if (plainText.trim()) {
              text = plainText;
              break;
            }
          }
          // Si es multipart, buscar recursivamente
          if (part.mimeType?.startsWith("multipart/")) {
            const nestedText = extractBody(part);
            if (nestedText.trim()) {
              text = nestedText;
            }
          }
        }

        // Si no encontramos text/plain, intentar con text/html
        if (!text.trim()) {
          for (const part of payload.parts) {
            if (part.mimeType === "text/html" && part.body?.data) {
              const htmlText = Buffer.from(part.body.data, "base64").toString();
              // Extraer texto básico del HTML (remover tags)
              text = htmlText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
              if (text) break;
            }
          }
        }
      }

      return text;
    };

    const bodyText = messageResponse.data.payload ? extractBody(messageResponse.data.payload) : '';

    console.log("🤖 Analizando email con IA...");
    // console.log("Contenido:", bodyText.substring(0, 200) + "..."); // Debug only

    // Extraer transacción usando IA
    const aiResult = await extractTransactionFromEmail(bodyText);

    if (aiResult.success && aiResult.data && 'amount' in aiResult.data) {
      // Es una transacción válida - guardar en la base de datos
      const transaction = aiResult.data;
      console.log("✓ Transacción extraída:", transaction);

      // Create one transaction for each user with valid token
      for (const tokenData of validTokens) {
        const { error: insertError } = await supabase
          .from("transactions")
          .insert({
            user_oauth_token_id: tokenData.id, // Reference to the Gmail account that received this
            source_email: fromEmail, // Email del remitente
            source_message_id: messageResponse.data.id,
            date: date, // Fecha en que se recibió el email
            // Datos extraídos por IA
            amount: transaction.amount,
            currency: transaction.currency,
            transaction_type: transaction.type,
            transaction_description: transaction.description,
            transaction_date: transaction.date || date.split('T')[0],
            merchant: transaction.merchant,
            category: transaction.category, // Category is now required
          })
          .select();

        if (insertError) {
          if (insertError.code === '23505') {
            console.log(`Transacción ya existe para user ${tokenData.user_id}`);
          } else {
            console.error(`Error guardando transacción para user ${tokenData.user_id}:`, insertError);
          }
        } else {
          console.log(`✓ Transacción guardada para user ${tokenData.user_id}`);
        }
      }

      console.log(`✓ Transacción procesada para ${validTokens.length} usuario(s)`);
    } else {
      // No se encontró transacción - no guardar nada
      console.log("No se encontró transacción en el email - descartando");
      console.log("--- Email descartado ---");
      console.log("Remitente:", fromEmail);
      console.log("Asunto:", subject);
      console.log("Cuerpo (primeros 200 chars):", bodyText.substring(0, 200) + "...");
      console.log("Razón:", (aiResult.data && 'reason' in aiResult.data && aiResult.data.reason) || "No se pudo extraer transacción");
      console.log("------------------------");
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error procesando webhook:", error);
    res.sendStatus(500);
  }
});

app.listen(3001, () =>
  console.log("Servidor backend corriendo en http://localhost:3001"),
);
