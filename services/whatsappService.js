const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const cron = require("node-cron");

class WhatsAppService {
  constructor() {
    this.client = null;
    this.qrImageData = "";
    this.isReady = false;
    this.scheduledJobs = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async initialize() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "whatsapp-reminder",
      }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });

    this.setupEventHandlers();

    try {
      await this.client.initialize();
    } catch (error) {
      console.error("Failed to initialize WhatsApp client:", error);
      throw error;
    }
  }

  setupEventHandlers() {
    // Generate QR and store in base64
    this.client.on("qr", async (qr) => {
      console.log("🔄 QR code generated. Open /qr in browser to scan.");
      this.qrImageData = await qrcode.toDataURL(qr);
    });

    this.client.on("ready", async () => {
      console.log("✅ WhatsApp client is ready");
      this.isReady = true;
      this.reconnectAttempts = 0;
      await this.setupScheduledMessages();
    });

    // Handle disconnection
    this.client.on("disconnected", (reason) => {
      console.log("❌ WhatsApp client disconnected:", reason);
      this.isReady = false;
      this.clearAllScheduledJobs();
      this.handleReconnect();
    });

    this.client.on("auth_failure", (msg) => {
      console.error("🚫 Authentication failed:", msg);
      this.isReady = false;
    });

    // Add connection monitoring
    this.client.on("change_state", (state) => {
      console.log("🔄 Connection state changed:", state);
    });
  }

  async handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      await this.delay(5000 * this.reconnectAttempts);

      try {
        await this.client.initialize();
      } catch (error) {
        console.error("Reconnection failed:", error);
      }
    } else {
      console.error("❌ Max reconnection attempts reached");
    }
  }

  formatPhoneNumber(phoneNumber) {
    let cleaned = phoneNumber.replace(/\D/g, "");

    if (cleaned.startsWith("0")) {
      cleaned = "63" + cleaned.substring(1);
    } else if (cleaned.length === 10) {
      cleaned = "63" + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
      cleaned = cleaned;
    }

    return cleaned + "@c.us";
  }

  async setupScheduledMessages() {
    try {
      this.clearAllScheduledJobs();

      const Message = require("../models/Message");
      const messages = await Message.find({ isActive: true });

      for (const messageDoc of messages) {
        this.scheduleMessage(messageDoc);
      }

      console.log(`📅 Scheduled ${messages.length} messages`);
    } catch (error) {
      console.error("Error setting up scheduled messages:", error);
    }
  }

  scheduleMessage(messageDoc) {
    const jobId = messageDoc._id.toString();

    // Create cron job
    const job = cron.schedule(
      messageDoc.cronTime,
      async () => {
        console.log(`🕐 Executing scheduled message: "${messageDoc.title}"`);
        await this.sendMessageToAllPhones(messageDoc.message);
      },
      {
        scheduled: true,
        timezone: process.env.TIMEZONE,
      }
    );

    this.scheduledJobs.set(jobId, job);
    console.log(
      `📋 Scheduled message: "${messageDoc.title}" at ${messageDoc.cronTime}`
    );
  }

  async sendMessageToAllPhones(message) {
    try {
      if (!this.isReady) {
        console.log("⚠️ WhatsApp client not ready");
        return { success: false, message: "Client not ready" };
      }

      const Phone = require("../models/Phone");
      const phones = await Phone.find({ isActive: true });

      if (phones.length === 0) {
        console.log("📭 No active phones found");
        return { success: true, message: "No phones to send to" };
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [],
      };

      // Process phones in batches to avoid overwhelming WhatsApp
      const batchSize = 5;
      for (let i = 0; i < phones.length; i += batchSize) {
        const batch = phones.slice(i, i + batchSize);

        const batchPromises = batch.map(async (phone) => {
          try {
            const chatId = this.formatPhoneNumber(phone.phone);
            await this.sendWithRetry(chatId, message, 2);
            console.log(`📤 Message sent to ${phone.name} (${phone.phone})`);
            results.success++;
          } catch (error) {
            console.error(
              `❌ Failed to send to ${phone.phone}:`,
              error.message
            );
            results.failed++;
            results.errors.push({
              phone: phone.phone,
              name: phone.name,
              error: error.message,
            });
          }
        });

        await Promise.allSettled(batchPromises);

        // Delay between batches to respect rate limits
        if (i + batchSize < phones.length) {
          await this.delay(2000);
        }
      }

      console.log(
        `📊 Bulk send complete: ${results.success} sent, ${results.failed} failed`
      );
      return results;
    } catch (error) {
      console.error("Error in bulk send:", error);
      return { success: false, message: error.message };
    }
  }

  async sendMessageToPhone(phoneNumber, message) {
    try {
      if (!this.isReady) {
        throw new Error("WhatsApp client not ready");
      }

      const chatId = this.formatPhoneNumber(phoneNumber);

      const isRegistered = await this.client.isRegisteredUser(chatId);
      if (!isRegistered) {
        throw new Error(`Number ${phoneNumber} is not registered on WhatsApp`);
      }

      await this.sendWithRetry(chatId, message, 3);
      return { success: true, message: "Message sent successfully" };
    } catch (error) {
      console.error(`Failed to send message to ${phoneNumber}:`, error);
      return { success: false, message: error.message };
    }
  }

  async sendWithRetry(chatId, message, maxRetries) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.client.sendMessage(chatId, message);
        console.log(`📤 Message sent successfully to ${chatId}`);
        return;
      } catch (error) {
        console.error(`❌ Send attempt ${attempt} failed:`, error.message);

        if (attempt === maxRetries) {
          throw error;
        }

        await this.delay(1000 * attempt);
      }
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async waitForReady(timeout = 10000) {
    const start = Date.now();
    while (!this.isReady && Date.now() - start < timeout) {
      await this.delay(100);
    }

    if (!this.isReady) {
      throw new Error("WhatsApp client not ready within timeout");
    }
  }

  async updateScheduledMessage(messageDoc) {
    const jobId = messageDoc._id.toString();

    if (this.scheduledJobs.has(jobId)) {
      this.scheduledJobs.get(jobId).destroy();
      this.scheduledJobs.delete(jobId);
      console.log(`🔄 Updated scheduled message: ${jobId}`);
    }

    if (messageDoc.isActive) {
      this.scheduleMessage(messageDoc);
    }
  }

  removeScheduledMessage(messageId) {
    const jobId = messageId.toString();
    if (this.scheduledJobs.has(jobId)) {
      this.scheduledJobs.get(jobId).destroy();
      this.scheduledJobs.delete(jobId);
      console.log(`🗑️ Removed scheduled message: ${jobId}`);
    }
  }

  clearAllScheduledJobs() {
    for (const [jobId, job] of this.scheduledJobs) {
      job.destroy();
    }
    this.scheduledJobs.clear();
    console.log("🧹 Cleared all scheduled jobs");
  }

  async healthCheck() {
    try {
      if (!this.client || !this.isReady) {
        return {
          status: "not_ready",
          message: "Client not initialized or not ready",
          scheduledJobs: this.scheduledJobs.size,
        };
      }

      const info = this.client.info;
      return {
        status: "ready",
        phone: info?.wid?.user,
        name: info?.pushname,
        scheduledJobs: this.scheduledJobs.size,
        platform: info?.platform,
        reconnectAttempts: this.reconnectAttempts,
      };
    } catch (error) {
      return {
        status: "error",
        message: error.message,
        scheduledJobs: this.scheduledJobs.size,
      };
    }
  }

  getQRImageData() {
    return this.qrImageData;
  }

  isClientReady() {
    return this.isReady;
  }

  getScheduledJobsCount() {
    return this.scheduledJobs.size;
  }

  // Graceful shutdown
  async shutdown() {
    console.log("🔄 Shutting down WhatsApp service...");

    this.clearAllScheduledJobs();

    if (this.client) {
      try {
        await this.client.destroy();
        console.log("✅ WhatsApp client destroyed");
      } catch (error) {
        console.error("Error destroying client:", error);
      }
    }

    this.isReady = false;
    console.log("✅ WhatsApp service shutdown complete");
  }
}

module.exports = new WhatsAppService();
