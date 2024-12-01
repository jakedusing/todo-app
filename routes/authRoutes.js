const express = require("express");
const User = require("../models/User"); //import user model
const isAuthenticated = require("../middleware/auth");
const router = express.Router();

// Reigster Route
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if username or email already exists
    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      req.flash("error", "Username or email already exists");
      return res.redirect("/auth/register");
    }

    // Create a new user
    const newUser = new User({ username, email, password });
    await newUser.save();

    req.flash("success", "User registered successfully! Please log in.");
    res.redirect("/auth/login");
  } catch (err) {
    console.error(err);
    req.flash("error", "Server error. Please try again.");
    res.redirect("/auth/register");
  }
});

router.get("/register", (req, res) => {
  res.render("register");
});

router.get("/login", (req, res) => {
  res.render("login");
});

// Login Route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      req.flash("error", "Invalid username or password");
      return res.redirect("/auth/login");
    }

    // Check password validity
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      req.flash("error", "Invalid username or password");
      return res.redirect("/auth/login");
    }

    // Successful login, set session and redirect
    req.session.userId = user._id; // Store user ID in session
    req.session.username = user.username;
    req.flash("success", "Logged in successfully!");
    return res.redirect("/todos/dashboard"); // Redirect to a protected route (only if authenticated)
  } catch (err) {
    console.error(err);
    req.flash("error", "Server error. Please try again.");
    res.redirect("/auth/login");
  }
});

// Profile Route
router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId); // fetch user details
    if (!user) {
      return res.status(404).send("User not found");
    }

    res.render("profile", { user }); // Render the profile view with user data
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// logout route
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      req.flash("error", "Failed to log out. Please try again.");
      return res.redirect("/todos/dashboard");
    }
    //req.flash("success", "Logged out successfully.");
    res.redirect("/auth/login"); // redirect to login page after logging out
  });
});

module.exports = router;
