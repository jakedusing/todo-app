const express = require("express");
const Friendship = require("../models/Friendship");
const User = require("../models/User");
const isAuthenicated = require("../middleware/auth");
const router = express.Router();

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
      return res
        .status(400)
        .json({ message: "Friend request already senty or accepted" });
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

// get all friends
router.get("/", isAuthenicated, async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [
        { requester: req.session.userId, status: "accepted" },
        { recipient: req.session.userId, status: "accepted" },
      ],
    }).populate("requester receipient", "username");

    const friends = friendships.map((friendship) =>
      friendship.requester._id.toString() === req.session.userId
        ? friendship.recipient
        : friendship.requester
    );

    // Fetch pending friend requests
    const pendingRequests = await Friendship.find({
      recipient: req.session.userId,
      status: "pending",
    }).populate("requester", "username");

    res.render("FriendList", { friends, pendingRequests });
  } catch (err) {
    console.error("Error fetching friends:", err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
