const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/auth");
const Chat = require("../models/Chat");
const Group = require("../models/Group");

// Fetch chat messages for a group
router.get("/:groupId", isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Ensure the user is a member of the group
    const group = await Group.findById(groupId);
    if (
      !group ||
      !group.members.some((member) => member.equals(req.user._id))
    ) {
      return res.status(403).send("You do not have access to this group.");
    }

    const messages = await Chat.find({ groupId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Add a new message
router.post("/:groupId", isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { message } = req.body;

    // Ensure the user is a member of the group
    const group = await Group.findById(groupId);
    if (
      !group ||
      !group.members.some((member) => member.equals(req.user._id))
    ) {
      return res.status(403).send("You do not have access to this group.");
    }

    // Create a new chat message
    const newMessage = new Chat({
      groupId,
      sender: req.user._id,
      message,
    });

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
