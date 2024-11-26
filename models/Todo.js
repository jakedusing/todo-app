const mongoose = require("mongoose");

const TodoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // reference to a user, for personal todos
      ref: "User", // reference the usermodel
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false, // default to not complete
    },
    dueDate: {
      type: Date, // Optional field for due dates
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" }, // for group todos
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // for assigned todos
  },
  { timestamps: true } // Enable automatic createdAt and updatedAt timestamps
);

module.exports = mongoose.model("Todo", TodoSchema);
