import express from "express";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { supabase } from "./lib/supabase";

// Load environment variables with fallback to credentials.json
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const projectId = process.env.GOOGLE_PROJECT_ID;
const redirectUri = process.env.OAUTH_REDIRECT_URI;

// Fallback to credentials.json if environment variables are not set
let credentials;
if (!clientId || !clientSecret || !projectId) {
  console.log("Loading credentials from credentials.json...");
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
app.use(express.json());

// Función para decodificar notificaciones de Pub/Sub
function decodeNotification(data: string) {
  return JSON.parse(Buffer.from(data, "base64").toString());
}

// Set para evitar procesar el mismo mensaje múltiples veces
const processedMessages = new Set<string>();

// Endpoint to start OAuth
app.get("/auth", (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send("Missing userId parameter");
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    state: userId as string, // Pass userId in state to retrieve it in callback
    prompt: "consent", // Force consent to get refresh token
  });
  res.redirect(authUrl);
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

    // Save tokens to database
    const { error: tokenError } = await supabase
      .from("user_oauth_tokens")
      .upsert(
        {
          user_id: userId,
          access_token: tokens.access_token!,
          refresh_token: tokens.refresh_token || null,
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

    console.log("Watch configurado exitosamente para usuario:", userId);

    // Redirect to frontend settings page with success
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/settings?success=true`);
  } catch (error) {
    console.error("Error en auth:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/settings?error=auth_failed`);
  }
});

// Webhook for push notifications
app.post("/webhook", async (req, res) => {
  console.log("Webhook hit! Raw body:", JSON.stringify(req.body, null, 2));

  try {
    // Decodificar el mensaje base64
    const data = decodeNotification(req.body.message.data);
    console.log("Datos decodificados:", data);

    const gmailEmail = data.emailAddress;
    const historyId = data.historyId;

    // Evitar procesar el mismo historyId múltiples veces
    const historyKey = `${gmailEmail}-${historyId}`;
    if (processedMessages.has(historyKey)) {
      console.log("Notificación ya procesada, ignorando...");
      return res.sendStatus(200);
    }
    processedMessages.add(historyKey);
    console.log("✓ Procesando nueva notificación para:", gmailEmail);

    // Find user tokens from database
    const { data: tokenData, error: tokenError } = await supabase
      .from("user_oauth_tokens")
      .select("*")
      .eq("gmail_email", gmailEmail)
      .single();

    if (tokenError || !tokenData) {
      console.error("No se encontraron tokens para:", gmailEmail);
      return res.sendStatus(200);
    }

    // Check if token needs refresh
    const now = new Date();
    const expiresAt = tokenData.expires_at
      ? new Date(tokenData.expires_at)
      : null;

    if (expiresAt && now >= expiresAt && tokenData.refresh_token) {
      console.log("Token expirado, refrescando...");
      oAuth2Client.setCredentials({
        refresh_token: tokenData.refresh_token,
      });

      const { credentials } = await oAuth2Client.refreshAccessToken();

      // Update tokens in database
      const newExpiresAt = credentials.expiry_date
        ? new Date(credentials.expiry_date).toISOString()
        : null;

      await supabase
        .from("user_oauth_tokens")
        .update({
          access_token: credentials.access_token!,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tokenData.id);

      oAuth2Client.setCredentials(credentials);
    } else {
      oAuth2Client.setCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || undefined,
        token_type: tokenData.token_type || "Bearer",
      });
    }

    // Obtener el último mensaje del INBOX
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    const messages = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX"],
      maxResults: 1,
    });

    if (messages.data.messages && messages.data.messages.length > 0) {
      const latestMessageSummary = messages.data.messages[0];
      if (!latestMessageSummary || !latestMessageSummary.id)
        return res.sendStatus(200);
      const messageId = latestMessageSummary.id;

      const messageResponse = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      // Extraer headers importantes
      const headers = messageResponse.data.payload?.headers;
      const subject = headers?.find((h) => h.name === "Subject")?.value;
      const from = headers?.find((h) => h.name === "From")?.value;
      const date = headers?.find((h) => h.name === "Date")?.value;

      console.log("\n=== NUEVO EMAIL ===");
      console.log("Usuario:", gmailEmail);
      console.log("De:", from);
      console.log("Asunto:", subject);
      console.log("Fecha:", date);
      console.log("ID:", messageResponse.data.id);
      console.log("==================\n");

      // Extraer el cuerpo del email
      const parts = messageResponse.data.payload?.parts;
      if (parts) {
        const bodyPart = parts.find(
          (part: any) => part.mimeType === "text/plain",
        );
        if (bodyPart?.body?.data) {
          const body = Buffer.from(bodyPart.body.data, "base64").toString();
          console.log("Cuerpo del email:");
          console.log(body);
        }
      }
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
