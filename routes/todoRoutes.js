const express = require("express");
const Todo = require("../models/Todo");
const User = require("../models/User");
const isAuthenticated = require("../middleware/auth");
const router = express.Router();

// Dashboard
router.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const todos = await Todo.find({ userId: req.session.userId });

    // Separate completed and incomplete todos
    const incompleteTodos = todos.filter((todo) => !todo.completed);
    const completedTodos = todos.filter((todo) => todo.completed);

    res.render("dashboard", {
      title: "Dashboard",
      username: user.username, // pass the username to the view
      incompleteTodos,
      completedTodos,
    });
  } catch (err) {
    console.error("Error fetching todos:", err);
    res.status(500).send("Server Error");
  }
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

// Toggle Todo Completion
router.post("/toggle/:id", isAuthenticated, async (req, res) => {
  try {
    // Find the todo by ID and toggle its "completed" status
    const todo = await Todo.findById(req.params.id);
    if (!todo) {
      return res.status(404).send("Todo not found");
    }

    // Ensure the users own the todo
    if (todo.userId.toString() !== req.session.userId) {
      return res.status(403).send("Unauthorized");
    }

    //Toggle compelted status
    todo.completed = !todo.completed;
    await todo.save();

    //Redirect back to dashboard
    res.redirect("/todos/dashboard");
  } catch (err) {
    console.error("Error toggling todo:", err);
    res.status(500).send("Server Error");
  }
});

// Delete Todo
router.post("/delete/:id", isAuthenticated, async (req, res) => {
  await Todo.findByIdAndDelete(req.params.id);
  res.redirect("/todos/dashboard");
});

module.exports = router;
