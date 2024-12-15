//capture deprecation warnings early
process.on("warning", (warning) => {
  console.log("Deprecation warning caught: ", warning.name);
  console.log("Message:", warning.message);
  console.log("Stack trace:", warning.stack);
});

const express = require("express");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const dotenv = require("dotenv");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");
const authRoutes = require("./routes/authRoutes");
const todoRoutes = require("./routes/todoRoutes");
const groupRoutes = require("./routes/groupRoutes");
const friendshipRoutes = require("./routes/friendshipRoutes");
const chatRoutes = require("./routes/chatRoutes");
const infoRoutes = require("./routes/infoRoutes");
const Message = require("./models/Message");
const User = require("./models/User");

dotenv.config();
const app = express();

// Create an HTTP server
const server = http.createServer(app); // wrap express app with HTTP server
const io = new Server(server); // create socket.io instance

const dbUrl = process.env.MONGO_URI;
const secret = process.env.SESSION_SECRET || "fallback-secret";

// Database connection
mongoose
  .connect(dbUrl)
  .then(() => console.log("mongodb connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const store = new MongoDBStore({
  url: dbUrl,
  secret,
  touchAfter: 24 * 60 * 60,
});

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    store,
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      //secure: true,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);
app.use((req, res, next) => {
  res.locals.user = req.session.userId
    ? { id: req.session.userId, username: req.session.username }
    : null;
  next();
});
app.use(flash());

// Middleware to make flash messages available in templates
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success");
  res.locals.error_msg = req.flash("error");
  next();
});

// Routes
app.use("/auth", authRoutes);
app.use("/todos", todoRoutes);
app.use("/groups", groupRoutes);
app.use("/friends", friendshipRoutes);
//app.use("/chat", chatRoutes);
app.use("/info", infoRoutes);

// Serve the landing page at "/"
app.get("/", (req, res) => {
  res.render("landing");
});

// Websocket integration
io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle joining a group room
  socket.on("joinGroup", (groupId) => {
    socket.join(groupId), // Join the group room
      console.log(`User joined group ${groupId}`);
  });

  // Handle receiving a new chat message
  socket.on("chatMessage", async (data) => {
    try {
      const { groupId, sender, content } = data;

      // Find the user by username and get their ObjectId
      const user = await User.findOne({ username: sender });
      if (!user) {
        throw new Error("User not found");
      }
      // Log the received data
      console.log("Received chatMessage event:", data);

      // Ensure sender is provided (not empty)
      if (!sender || !content) {
        throw new Error("Sender or content missing");
      }

      // Create and save the chat message
      const chatMessage = new Message({
        groupId,
        sender: user._id,
        content,
      });

      await chatMessage.save();
      console.log("Message saved successfully");

      const formattedTime = new Date(chatMessage.createdAt).toLocaleString(
        "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }
      );

      // Broadcast the message to the group
      io.to(groupId).emit("chatMessage", {
        groupId,
        sender,
        content,
        createdAt: formattedTime,
      });
    } catch (error) {
      console.error("Error saving message to DB:", error);
    }
  });

  socket.on("chatMessage", (data) => {
    console.log("Received chatMessage event:", data);
  });
  /* socket.on("chatMessage", ({ groupId, sender, content }) => {
    console.log("Emitting message:", { sender, content });
    const message = { sender, content };
    io.to(groupId).emit("chatMessage", message);
  }); */

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`server running on port ${PORT}`));
