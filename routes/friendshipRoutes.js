const express = require("express");
const Friendship = require("../models/Friendship");
const User = require("../models/User");
const isAuthenicated = require("../middleware/auth");
const router = express.Router();

// get all friends
router.get("/", isAuthenicated, async (req, res) => {
  try {
    // Fetch accepted friendships
    const friendships = await Friendship.find({
      $or: [
        { requester: req.session.userId, status: "accepted" },
        { recipient: req.session.userId, status: "accepted" },
      ],
    }).populate("requester recipient", "username");

    const friends = friendships.map((friendship) =>
      friendship.requester._id.toString() === req.session.userId
        ? friendship.recipient
        : friendship.requester
    );

    // Fetch pending friend requests received
    const pendingRequests = await Friendship.find({
      recipient: req.session.userId,
      status: "pending",
    }).populate("requester", "username");

    // Fetch pending friend requests sent
    const sentRequests = await Friendship.find({
      requester: req.session.userId,
      status: "pending",
    }).populate("recipient", "username");

    res.render("FriendList", { friends, pendingRequests, sentRequests });
  } catch (err) {
    console.error("Error fetching friends:", err);
    res.status(500).send("Server Error");
  }
});

// Send a friend request
router.post("/request", isAuthenicated, async (req, res) => {
  const { recipientUsername } = req.body;

  try {
    const recipient = await User.findOne({ username: recipientUsername });
    if (!recipient) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if friendship already exists
    const exisitingFriendship = await Friendship.findOne({
      $or: [
        { requester: req.session.userId, recipient: recipient._id },
        { requester: recipient._id, recipient: req.session.userId },
      ],
    });

    if (exisitingFriendship) {
      req.flash("error", "This user is already your friend.");
      return res.redirect("/friends/browse");
    }

    // create a new friendship
    await Friendship.create({
      requester: req.session.userId,
      recipient: recipient._id,
    });

    res.json({ message: "Friend request sent" });
  } catch (err) {
    console.error("Error sending friend request:", err);
    res.status(500).send("Server Error");
  }
});

// Accept a friend request
router.post("/accept/:id", isAuthenicated, async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.id);
    if (!friendship || friendship.recipient.toString() !== req.session.userId) {
      return res.status(403).send("Unauthorized");
    }

    friendship.status = "accepted";
    await friendship.save();

    res.json({ message: "Friend request accepted" });
  } catch (err) {
    console.error("Error accepting friend request:", err);
    res.status(500).send("Server Error");
  }
});

// Cancel friend request
router.post("/cancel/:id", isAuthenicated, async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.id);

    if (
      friendship &&
      friendship.requester.toString() === req.session.userId &&
      friendship.status === "pending"
    ) {
      await friendship.delete();
      res.json({ message: "Friend request canceled" });
    } else {
      res.status(403).send("Unauthorized");
    }
  } catch (err) {
    console.error("Error canceling friend request:", err);
    res.status(500).send("Server Error");
  }
});

// View all users except the logged-in user
router.get("/browse", isAuthenicated, async (req, res) => {
  try {
    const currentUserId = req.session.userId;

    // Fetch all users except the current user
    const users = await User.find({ _id: { $ne: currentUserId } });

    // Fetch friendships where the user is involved and accepted
    const friendships = await Friendship.find({
      $or: [
        { requester: currentUserId, status: "accepted" },
        { recipient: currentUserId, status: "accepted" },
      ],
    });

    // collect IDs of friends
    const friendIds = friendships.map((friendship) =>
      friendship.requester.toString() === currentUserId
        ? friendship.recipient.toString()
        : friendship.requester.toString()
    );

    // fetch friend requests sent by the current user
    const sentRequests = await Friendship.find({
      requester: currentUserId,
      status: "pending",
    }).populate("recipient", "username");

    // Collect IDs of users who have been sent a friend request
    const sentIds = sentRequests.map((req) => req.recipient._id.toString());

    res.render("BrowseUsers", { users, sentIds, friendIds });
  } catch (err) {
    console.error("Error browsing users:", err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
