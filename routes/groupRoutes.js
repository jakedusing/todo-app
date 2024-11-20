const express = require("express");
const Group = require("...models/Group");
const Todo = require("../models/Todo");
const User = require("../models/User");
const isAuthenticated = require("../middleware/auth");
const router = express.Router();

// Get all groups the user belongs to
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.session.userId });
    res.render("groups/index", { groups });
  } catch (err) {
    console.error("Error fetching groups:", err);
    res.status(500).send("Server Error");
  }
});
