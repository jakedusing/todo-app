const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const todoRoutes = require("./routes/todoRoutes");
const groupRoutes = require("./routes/groupRoutes");
const friendshipRoutes = require("./routes/friendshipRoutes");
const chatRoutes = require("./routes/chatRoutes");

dotenv.config();
const app = express();

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);
app.use((req, res, next) => {
  res.locals.user = req.session.userId ? { id: req.session.userId } : null;
  next();
});
app.use(flash());

// Middleware to make flash messages available in templates
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success");
  res.locals.error_msg = req.flash("error");
  next();
});

// Database connection
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log("mongodb connected"))
  .catch((err) => console.log(err));

// Routes
app.use("/auth", authRoutes);
app.use("/todos", todoRoutes);
app.use("/groups", groupRoutes);
app.use("/friends", friendshipRoutes);
app.use("/chat", chatRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`server running on port ${PORT}`));
