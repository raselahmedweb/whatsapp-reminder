const Message = require("../models/Message");
const whatsappService = require("../services/whatsappService");

const messageController = {
  // Create new message
  async create(req, res) {
    try {
      const { message, cronTime, title } = req.body;

      const newMessage = new Message({
        message,
        cronTime,
        title: title || "Reminder",
      });

      const savedMessage = await newMessage.save();

      // Update WhatsApp scheduled jobs
      await whatsappService.updateScheduledMessage(savedMessage);

      res.status(201).json({
        success: true,
        data: savedMessage,
        message: "Message created and scheduled successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Get all messages
  async getAll(req, res) {
    try {
      const messages = await Message.find({ isActive: true }).sort({
        createdAt: -1,
      });
      res.json({
        success: true,
        data: messages,
        count: messages.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Get single message
  async getById(req, res) {
    try {
      const message = await Message.findById(req.params.id);
      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }
      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Update message
  async update(req, res) {
    try {
      const { message, cronTime, title, isActive } = req.body;

      const updatedMessage = await Message.findByIdAndUpdate(
        req.params.id,
        {
          ...(message && { message }),
          ...(cronTime && { cronTime }),
          ...(title && { title }),
          ...(typeof isActive === "boolean" && { isActive }),
        },
        { new: true, runValidators: true }
      );

      if (!updatedMessage) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      // Update WhatsApp scheduled jobs
      await whatsappService.updateScheduledMessage(updatedMessage);

      res.json({
        success: true,
        data: updatedMessage,
        message: "Message updated successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Delete message (soft delete)
  async delete(req, res) {
    try {
      const message = await Message.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      // Remove from WhatsApp scheduled jobs
      whatsappService.removeScheduledMessage(message._id);

      res.json({
        success: true,
        message: "Message deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Hard delete message
  async hardDelete(req, res) {
    try {
      const message = await Message.findByIdAndDelete(req.params.id);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      // Remove from WhatsApp scheduled jobs
      whatsappService.removeScheduledMessage(message._id);

      res.json({
        success: true,
        message: "Message permanently deleted",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

module.exports = messageController;
