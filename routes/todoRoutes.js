const express = require("express");
const Todo = require("../models/Todo");
const isAuthenticated = require("../middleware/auth");
const router = express.Router();

// Dashboard
router.get("/dashboard", isAuthenticated, async (req, res) => {
  const todos = await Todo.find({ userId: req.session.userId });
  res.render("dashboard", { title: "Dashboard", todos });
});

// Add Todo
router.post("/add", isAuthenticated, async (req, res) => {
  const { title } = req.body;

  try {
    // Create the new todo
    await Todo.create({
      userId: req.session.userId, // Attach the logged-in user's ID
      title,
    });

    // Redirect back to the dashboard
    res.redirect("/todos/dashboard");
  } catch (err) {
    console.error("Error adding todo:", err);
    res.status(500).send("Server Error");
  }
});

// Delete Todo
router.post("/delete/:id", isAuthenticated, async (req, res) => {
  await Todo.findByIdAndDelete(req.params.id);
  res.redirect("/todos/dashboard");
});

module.exports = router;
