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
      return res
        .status(400)
        .json({ message: "Username or email already exists" });
    }

    // Create a new user
    const newUser = new User({ username, email, password });
    await newUser.save();

    // Redirect or send a response upon successful registration
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
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
      // Send early response if user not found
      return res.status(400).json({ message: "Invalid username or password" });
    }

    // Check password validity
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      // Send early response if password doesn't match
      return res.status(400).json({ message: "Invalid username or password" });
    }

    // Successful login, set session and redirect
    req.session.userId = user._id; // Store user ID in session
    return res.redirect("/todos/dashboard"); // Redirect to a protected route (only if authenticated)
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
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
      return res.status(500).json({ message: "Failed to log out" });
    }
    res.redirect("/auth/login"); // redirect to login page after logging out
  });
});

module.exports = router;
