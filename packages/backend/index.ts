import express from "express";
import { google } from "googleapis";
import fs from "fs";
import path from "path";

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
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });
  res.redirect(authUrl);
});

// OAuth callback
app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("No code");

  try {
    const { tokens } = await oAuth2Client.getToken(code as string);
    oAuth2Client.setCredentials(tokens);

    // Save tokens
    fs.writeFileSync(
      path.join(import.meta.dir, "tokens.json"),
      JSON.stringify(tokens),
    );

    // Set up Gmail watch
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    const watchResponse = await gmail.users.watch({
      userId: "me",
      requestBody: {
        labelIds: ["INBOX"],
        topicName: `projects/${projectId}/topics/${process.env.PUBSUB_TOPIC || "gmail-notifications"}`,
      },
    });

    console.log("Watch configurado exitosamente:", watchResponse.data);
    res.send("Autenticación y watch exitosos. Notificaciones listas.");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error en auth");
  }
});

// Webhook for push notifications
app.post("/webhook", async (req, res) => {
  console.log("Notificación de Gmail:", req.body);

  try {
    // Decodificar el mensaje base64
    const data = decodeNotification(req.body.message.data);
    console.log("Datos decodificados:", data);

    // Evitar procesar el mismo historyId múltiples veces
    const historyKey = `${data.emailAddress}-${data.historyId}`;
    if (processedMessages.has(historyKey)) {
      console.log("Notificación ya procesada, ignorando...");
      return res.sendStatus(200);
    }
    processedMessages.add(historyKey);
    console.log("✓ Procesando nueva notificación...");

    // Cargar tokens guardados
    const tokens = JSON.parse(
      fs.readFileSync(path.join(import.meta.dir, "tokens.json"), "utf8"),
    );
    oAuth2Client.setCredentials(tokens);

    // Obtener el último mensaje del INBOX
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    const messages = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX"],
      maxResults: 1,
    });

    if (messages.data.messages && messages.data.messages.length > 0) {
      const messageId = messages.data.messages[0].id;
      if (!messageId) return res.sendStatus(200);

      const message = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      // Extraer headers importantes
      const headers = message.data.payload?.headers;
      const subject = headers?.find((h) => h.name === "Subject")?.value;
      const from = headers?.find((h) => h.name === "From")?.value;
      const date = headers?.find((h) => h.name === "Date")?.value;

      console.log("\n=== NUEVO EMAIL ===");
      console.log("De:", from);
      console.log("Asunto:", subject);
      console.log("Fecha:", date);
      console.log("ID:", message.data.id);
      console.log("==================\n");

      // Extraer el cuerpo del email
      const parts = message.data.payload?.parts;
      if (parts) {
        const bodyPart = parts.find((part) => part.mimeType === "text/plain");
        if (bodyPart?.body?.data) {
          const body = Buffer.from(bodyPart.body.data, "base64").toString();
          console.log("Cuerpo del email:");
          console.log(body);
        }
      }
    }
  } catch (error) {
    console.error("Error procesando webhook:", error);
    res.sendStatus(500);
  }
});

app.listen(3001, () =>
  console.log("Servidor backend corriendo en http://localhost:3001"),
);
