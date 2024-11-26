const express = require("express");
const Todo = require("../models/Todo");
const User = require("../models/User");
const isAuthenticated = require("../middleware/auth");
const router = express.Router();

// Dashboard
router.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    // Todos created by the user
    const selfCreatedTodos = await Todo.find({
      userId: req.session.userId,
      groupId: null, // only personal todos, no group association
    });

    // seperate personal todos into completed and incomplete
    const incompleteSelfCreatedTodos = selfCreatedTodos.filter(
      (todo) => !todo.completed
    );
    const completedSelfCreatedTodos = selfCreatedTodos.filter(
      (todo) => todo.completed
    );

    // Todos assigned to the user in groups
    const assignedTodos = await Todo.find({
      assignee: req.session.userId,
    })
      .populate("groupId", "name")
      .populate("userId", "username");

    // Separate completed and incomplete todos
    const incompleteAssignedTodos = assignedTodos.filter(
      (todo) => !todo.completed
    );
    const completedAssignedTodos = assignedTodos.filter(
      (todo) => todo.completed
    );

    res.render("dashboard", {
      title: "Dashboard",
      username: user.username, // pass the username to the view
      selfCreatedTodos,
      incompleteAssignedTodos,
      completedAssignedTodos,
      incompleteSelfCreatedTodos,
      completedSelfCreatedTodos,
    });
  } catch (err) {
    console.error("Error fetching todos:", err);
    res.status(500).send("Server Error");
  }
});

// Add Todo
router.post("/add", isAuthenticated, async (req, res) => {
  const { title, dueDate, priority } = req.body;

  try {
    // Create the new todo
    await Todo.create({
      userId: req.session.userId, // Attach the logged-in user's ID
      title,
      dueDate,
      priority,
      groupId: null, // Personal todos have no group association
    });

    // Redirect back to the dashboard
    res.redirect("/todos/dashboard");
  } catch (err) {
    console.error("Error adding personal todo:", err);
    res.status(500).send("Server Error");
  }
});

// Toggle Todo Completion
router.post("/toggle/:id", isAuthenticated, async (req, res) => {
  try {
    // Find the todo by ID and toggle its "completed" status
    const todo = await Todo.findById(req.params.id).populate("groupId");
    if (!todo) {
      return res.status(404).send("Todo not found");
    }

    // Check authorization
    if (todo.groupId) {
      // Group todo: check  if the user is the assignee or a group member
      const isGroupMember = todo.groupId.members.some((member) =>
        member.equals(req.session.userId)
      );
      if (!isGroupMember || !todo.assignee.equals(req.session.userId)) {
        return res.status(403).send("unauthorized");
      }
    } else {
      // Personal todo: ensure the user owns it
      if (todo.userId.toString() !== req.session.userId) {
        return res.status(403).send("Unauthorized");
      }
    }

    //Toggle compelted status
    todo.completed = !todo.completed;
    await todo.save();

    //Redirect based on Todo type
    if (todo.groupId) {
      // Redirect to thge group details page if the todo is part of a group
      res.redirect(`/groups/${todo.groupId._id}`);
    } else {
      // Redirect to the dashboard for personal todos
      res.redirect("/todos/dashboard");
    }
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
