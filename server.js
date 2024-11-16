const express = require("express");
const mongoose = require("mongoose");
const dontenv = require("dotenv");
const path = require("path");
const session = require("express-session");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const todoRoutes = require("./routes/todoRoutes");

dontenv.config();
const app = express();

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({ secret: "secret-key", resave: false, saveUninitialized: true })
);

// Database connection
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log("mongodb connected"))
  .catch((err) => console.log(err));

// Routes
app.use("/auth", authRoutes);
app.use("/todos", todoRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`server running on port ${PORT}`));
