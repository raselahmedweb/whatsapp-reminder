const mongoose = require("mongoose");
const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
    },
    cronTime: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          // Basic cron validation (5 parts: min hour day month weekday)
          const cronParts = v.split(" ");
          return cronParts.length === 5;
        },
        message: 'Invalid cron format. Use: "minute hour day month weekday"',
      },
    },
    title: {
      type: String,
      default: "Reminder",
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

module.exports = mongoose.model("Message", messageSchema);
