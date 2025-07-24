const express = require("express");
const phoneController = require("../controllers/phoneController");
const messageController = require("../controllers/messageController");
const path = require("path");

const router = express.Router();

// Serve the main form page
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/index.html"));
});

// Phone routes
router.post("/api/phones", phoneController.create);
router.get("/api/phones", phoneController.getAll);
router.get("/api/phones/:id", phoneController.getById);
router.put("/api/phones/:id", phoneController.update);
router.delete("/api/phones/:id", phoneController.delete);
router.delete("/api/phones/:id/hard", phoneController.hardDelete);

// Message routes
router.post("/api/messages", messageController.create);
router.get("/api/messages", messageController.getAll);
router.get("/api/messages/:id", messageController.getById);
router.put("/api/messages/:id", messageController.update);
router.delete("/api/messages/:id", messageController.delete);
router.delete("/api/messages/:id/hard", messageController.hardDelete);

module.exports = router;
