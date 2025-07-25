const express = require("express");
const connectDB = require("./config/database");
const routes = require("./routes");
const whatsappService = require("./services/whatsappService");
const resolveServerDownIssue = require("./config/auto_rel");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 3000;
connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use("/", routes);

// QR Code route for WhatsApp authentication
app.get("/qr", (req, res) => {
  const qrImageData = whatsappService.getQRImageData();

  if (!qrImageData) {
    return res.send(`
      <html>
        <head>
          <meta http-equiv="refresh" content="5">
        </head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:sans-serif">
          <h2>📡 QR code is not ready yet...</h2>
          <p>Please wait, page will refresh automatically.</p>
          <div style="margin-top: 20px;">
            <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 2s linear infinite;"></div>
          </div>
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </body>
      </html>
    `);
  }

  res.send(`
    <html>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:sans-serif;background:#f5f5f5">
        <div style="background:white;padding:30px;border-radius:15px;box-shadow:0 10px 30px rgba(0,0,0,0.1);text-align:center">
          <h2 style="color:#25D366;margin-bottom:20px">📲 Scan to Connect WhatsApp</h2>
          <img src="${qrImageData}" style="border-radius:10px;max-width:300px;" />
          <p style="margin-top:20px;color:#666">Keep this page open until WhatsApp connects</p>
          <div style="margin-top:15px">
            <span style="display:inline-block;width:10px;height:10px;background:#ffc107;border-radius:50%;margin-right:8px"></span>
            <span style="color:#666;font-size:14px">Waiting for scan...</span>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Status endpoint
app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    data: {
      whatsappReady: whatsappService.isClientReady(),
      scheduledJobs: whatsappService.getScheduledJobsCount(),
      server: "running",
      timestamp: new Date().toISOString(),
    },
  });
});

// error handling
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("📴 SIGTERM received. Shutting down gracefully...");
  whatsappService.clearAllScheduledJobs();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("📴 SIGINT received. Shutting down gracefully...");
  whatsappService.clearAllScheduledJobs();
  process.exit(0);
});

// Start server and initialize WhatsApp
async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Web interface: http://localhost:${PORT}`);
      console.log(`QR code page: http://localhost:${PORT}/qr`);
    });

    console.log("Initializing WhatsApp service...");
    await whatsappService.initialize();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}
setInterval(() => {
  resolveServerDownIssue();
}, 840000);

startServer();
