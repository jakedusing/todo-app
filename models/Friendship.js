const mongoose = require("mongoose");

const friendshipSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["pending", "accepted"], default: "pending" },
});

module.exports = mongoose.model("Friendship", friendshipSchema);
