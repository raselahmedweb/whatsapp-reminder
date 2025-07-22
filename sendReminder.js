const cron = require("node-cron");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true },
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ WhatsApp client ready");

  const employeeNumbers = ["639279382092@c.us", "639973403472@c.us"];

  const sendMessage = (text) => {
    employeeNumbers.forEach((number) => {
      client.sendMessage(number, text);
    });
  };

  cron.schedule("25 21 * * *", () => {
    sendMessage("Greetings");
  });

  cron.schedule("26 21 * * *", () => {
    sendMessage("Greetings again");
  });
  cron.schedule("27 21 * * *", () => {
    sendMessage("Greetings again and again");
  });
  cron.schedule("28 21 * * *", () => {
    sendMessage("Greetings last");
  });
});
client.initialize();
