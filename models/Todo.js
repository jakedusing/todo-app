const mongoose = require("mongoose");

const TodoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // reference to a user
    ref: "User", // reference the usermodel
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Todo", TodoSchema);
