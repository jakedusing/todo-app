const express = require("express");
const Todo = require("../models/Todo");
const isAuthenticated = require("../middleware/auth");
const router = express.Router();

// Dashboard
router.get("/", isAuthenticated, async (req, res) => {
  const todos = await Todo.find({ userId: req.session.user._id });
  res.render("dashboard", { title: "Dashboard", todos });
});

// Add Todo
router.post("/add", isAuthenticated, async (req, res) => {
  const { title } = req.body;
  await Todo.create({ userId: req.session._id, title });
  res.redirect("/todos");
});

// Delete Todo
router.post("/delete/:id", isAuthenticated, async (req, res) => {
  await Todo.findByIdAndDelete(req.params.id);
  res.redirect("/todos");
});

module.exports = router;
