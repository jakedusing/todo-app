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
    req.flash("error", "Unable to fetch friends at this time");
    res.redirect("/");
  }
});

// Send a friend request
router.post("/request", isAuthenicated, async (req, res) => {
  const { recipientUsername } = req.body;

  try {
    const recipient = await User.findOne({ username: recipientUsername });
    if (!recipient) {
      req.flash("error", "User not found.");
      return res.redirect("/friends/browse");
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

    req.flash("success", "Friend request sent successfully!");
    res.redirect("/friends/browse");
  } catch (err) {
    console.error("Error sending friend request:", err);
    req.flash("error", "Error sending friend request");
    res.redirect("/friends/browse");
  }
});

// Accept a friend request
router.post("/accept/:id", isAuthenicated, async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.id);
    if (!friendship || friendship.recipient.toString() !== req.session.userId) {
      req.flash("error", "Unauthorized to accept this request.");
      return res.redirect("/friends");
    }

    friendship.status = "accepted";
    await friendship.save();

    req.flash("success", "Friend request accepted!");
    res.redirect("/friends");
  } catch (err) {
    console.error("Error accepting friend request:", err);
    req.flash("error", "Error accepting friend request");
    res.redirect("/friends");
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
      req.flash("success", "Friend request canceled.");
      res.redirect("/friends");
    } else {
      req.flash("error", "Unauthorized to cancel this request.");
      res.redirect("/friends");
    }
  } catch (err) {
    console.error("Error canceling friend request:", err);
    req.flash("error", "Error canceling friend request.");
    res.redirect("/friends");
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
    req.flash("error", "Error browsing users.");
    res.redirect("/");
  }
});

module.exports = router;
