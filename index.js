const cron = require("node-cron");
const express = require("express");
const qrcode = require("qrcode");
const { Client, LocalAuth } = require("whatsapp-web.js");

const app = express();
const PORT = process.env.PORT || 3000;

let qrImageData = "";

// Initialize WhatsApp client with session persistence
const client = new Client({
  authStrategy: new LocalAuth(), // This creates .wwebjs_auth/ folder
  puppeteer: { headless: true },
});

// Generate QR and store in base64
client.on("qr", async (qr) => {
  console.log("🔄 QR code generated. Open /qr in browser to scan.");
  qrImageData = await qrcode.toDataURL(qr);
});

// WhatsApp Ready
client.on("ready", () => {
  console.log("✅ WhatsApp client is ready");

  // List of employee phone numbers (include country code)
  const employeeNumbers = ["639279382092@c.us", "639973403472@c.us"];

  const sendMessage = (text) => {
    employeeNumbers.forEach((number) => {
      client.sendMessage(number, text);
    });
  };

  // Schedule daily 7:55 AM
  cron.schedule("55 07 * * *", () => {
    sendMessage("🕛 Good morning! Please remember to clock in before 8 AM.");
  });
});

// Express route to show QR image
app.get("/qr", (req, res) => {
  if (!qrImageData) {
    return res.send("📡 QR code is not ready yet. Please wait...");
  }

  res.send(`
    <html>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:sans-serif">
        <h2>📲 Scan to Connect WhatsApp</h2>
        <img src="${qrImageData}" />
        <p>Leave this page open until WhatsApp connects.</p>
      </body>
    </html>
  `);
});

// Start Express server
app.listen(PORT, () => {
  console.log(`🌐 QR code page available at http://localhost:${PORT}/qr`);
});

client.initialize();
