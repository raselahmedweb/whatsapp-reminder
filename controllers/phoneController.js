const Phone = require("../models/Phone");

const phoneController = {
  // Create new phone
  async create(req, res) {
    try {
      const { phone, name } = req.body;

      // Ensure phone format includes @c.us
      const formattedPhone = phone.includes("@c.us") ? phone : `${phone}@c.us`;

      const newPhone = new Phone({
        phone: formattedPhone,
        name: name || "Unknown",
      });

      const savedPhone = await newPhone.save();
      res.status(201).json({
        success: true,
        data: savedPhone,
        message: "Phone added successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Get all phones
  async getAll(req, res) {
    try {
      const phones = await Phone.find({ isActive: true }).sort({
        createdAt: -1,
      });
      res.json({
        success: true,
        data: phones,
        count: phones.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Get single phone
  async getById(req, res) {
    try {
      const phone = await Phone.findById(req.params.id);
      if (!phone) {
        return res.status(404).json({
          success: false,
          message: "Phone not found",
        });
      }
      res.json({
        success: true,
        data: phone,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Update phone
  async update(req, res) {
    try {
      const { phone, name, isActive } = req.body;
      const formattedPhone =
        phone && phone.includes("@c.us") ? phone : `${phone}@c.us`;

      const updatedPhone = await Phone.findByIdAndUpdate(
        req.params.id,
        {
          ...(formattedPhone && { phone: formattedPhone }),
          ...(name && { name }),
          ...(typeof isActive === "boolean" && { isActive }),
        },
        { new: true, runValidators: true }
      );

      if (!updatedPhone) {
        return res.status(404).json({
          success: false,
          message: "Phone not found",
        });
      }

      res.json({
        success: true,
        data: updatedPhone,
        message: "Phone updated successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Delete phone (soft delete)
  async delete(req, res) {
    try {
      const phone = await Phone.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );

      if (!phone) {
        return res.status(404).json({
          success: false,
          message: "Phone not found",
        });
      }

      res.json({
        success: true,
        message: "Phone deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Hard delete phone
  async hardDelete(req, res) {
    try {
      const phone = await Phone.findByIdAndDelete(req.params.id);

      if (!phone) {
        return res.status(404).json({
          success: false,
          message: "Phone not found",
        });
      }

      res.json({
        success: true,
        message: "Phone permanently deleted",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

module.exports = phoneController;
