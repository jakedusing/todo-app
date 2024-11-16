const express = require("express");
const User = require("../models/User"); //import user model
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

module.exports = router;
