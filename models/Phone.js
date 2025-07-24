const mongoose = require("mongoose");
const { Schema } = mongoose;

const phoneSchema = new Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          // Basic phone validation (adjust regex as needed)
          return /^\d{10,15}@c\.us$/.test(v);
        },
        message: "Phone must be in format: 1234567890@c.us",
      },
    },
    name: {
      type: String,
      default: "Unknown",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("Phone", phoneSchema);
