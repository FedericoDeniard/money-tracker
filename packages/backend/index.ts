import express from "express";
import { google } from "googleapis";
import fs from "fs";
import path from "path";

const credentials = JSON.parse(
  fs.readFileSync(path.join(import.meta.dir, "credentials.json"), "utf8"),
);
const { client_secret, client_id, redirect_uris } = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0],
);

const app = express();
app.use(express.json());

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
    await gmail.users.watch({
      userId: "me",
      requestBody: {
        labelIds: ["INBOX"],
        topicName: "projects/YOUR_PROJECT_ID/topics/gmail-notifications", // Replace with your GCP project and topic
      },
    });

    res.send("Autenticación y watch exitosos. Notificaciones listas.");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error en auth");
  }
});

// Webhook for push notifications
app.post("/webhook", (req, res) => {
  console.log("Notificación de Gmail:", req.body);
  // Aquí procesa: usa historyId para obtener cambios
  res.sendStatus(200);
});

app.listen(3001, () =>
  console.log("Servidor backend corriendo en http://localhost:3001"),
);
