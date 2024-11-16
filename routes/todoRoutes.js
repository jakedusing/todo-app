const express = require("express");
const Todo = require("../models/Todo");

const router = express.Router();

// Dashboard
router.get("/", async (req, res) => {
  if (!req.session.user) return res.redirect("/auth/login");
  const todos = await Todo.find({ userId: req.session.user._id });
  res.render("dashboard", { title: "Dashboard", todos });
});

// Add Todo
router.post("/add", async (req, res) => {
  if (!req.session.user) return res.redirect("/auth/login");
  const { title } = req.body;
  await Todo.create({ userId: req.session._id, title });
  res.redirect("/todos");
});

// Delete Todo
router.post("/delete/:id", async (req, res) => {
  if (!req.session.user) return res.redirect("/auth/login");
  await Todo.findByIdAndDelete(req.params.id);
  res.redirect("/todos");
});

module.exports = router;
