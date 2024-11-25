const express = require("express");
const Group = require("../models/Group");
const Todo = require("../models/Todo");
const User = require("../models/User");
const Friendship = require("../models/Friendship");
const isAuthenticated = require("../middleware/auth");
const router = express.Router();

// Get all groups the user belongs to
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.session.userId });
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

    res.render("GroupList", { title: "My Groups", groups, friends });
  } catch (err) {
    console.error("Error fetching groups:", err);
    res.status(500).send("Server Error");
  }
});

// Create a new group
router.post("/create", isAuthenticated, async (req, res) => {
  const { name, members } = req.body;

  try {
    const groupMembers = members
      .split(",")
      .map((member) => member.trim()) // clean up whitespace
      .filter(Boolean); // remove empty strings

    const memberIds = await User.find(
      { username: { $in: groupMembers } },
      "_id"
    );
    const group = await Group.create({
      name,
      owner: req.session.userId,
      members: [...memberIds.map((user) => user._id), req.session.userId], // Add self to group
    });

    await group.save();

    res.redirect("/groups");
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).send("Server Error");
  }
});

// Get group details
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members");
    if (
      !group.members.some((member) => member._id.equals(req.session.userId))
    ) {
      return res.status(403).send("Unauthorized");
    }

    const todos = await Todo.find({ groupId: group._id }).populate(
      "assignee",
      "username"
    );
    res.render("GroupDetails", { group, todos });
  } catch (err) {
    console.error("Error fetching group details:", err);
    res.status(500).send("Server Error");
  }
});

// Add a todo to a group
router.post("/:id/todos/add", isAuthenticated, async (req, res) => {
  const { title, assignee, dueDate, priority } = req.body;

  try {
    const group = await Group.findById(req.params.id);

    // Ensure user is a group member
    if (!group.members.some((member) => member.equals(req.session.userId))) {
      return res.status(403).send("Unauthorized");
    }

    // Ensure assignee is a valid group member
    if (!group.members.some((member) => member.equals(assignee))) {
      return res.status(400).send("Assignee must be a group member");
    }

    const todo = await Todo.create({
      groupId: group._id,
      title,
      assignee: assignee,
      userId: req.session.userId,
      dueDate: dueDate || null,
      priority: priority || "Low", // default to low if not provided
    });

    res.redirect(`/groups/${group._id}`);
  } catch (err) {
    console.error("Error adding todo:", err);
    res.status(500).send("Server Error");
  }
});

// group management page
router.get("/:id/manage", isAuthenticated, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members");

    // Ensure user is authorized to manage the group
    if (group.owner.toString() !== req.session.userId) {
      return res.status(403).send("Unathorized");
    }

    res.render("GroupManagement", { group });
  } catch (err) {
    console.error("Error fetching group for management:", err);
    res.status(500).send("Server Error");
  }
});

// Add Member to group
router.post("/:id/add", isAuthenticated, async (req, res) => {
  const { username } = req.body;

  try {
    const group = await Group.findById(req.params.id);

    // Only the owner can add members
    if (group.owner.toString() !== req.session.userId) {
      return res.status(403).send("Unauthorized");
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send("User not found");
    }

    if (!group.members.includes(user._id)) {
      group.members.push(user._id);
      await group.save();
    }

    res.redirect(`/groups/${group._id}/manage`);
  } catch (err) {
    console.error("Error adding member:", err);
    res.status(500).send("Server Error");
  }
});

// Remove member from group
router.post("/:id/remove/:memberId", isAuthenticated, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    // Only the owner can remove members
    if (group.owner.toString() !== req.session.userId) {
      return res.status(403).send("Unauthorized");
    }

    group.members = group.members.filter(
      (member) => member.toString() !== req.params.memberId
    );
    await group.save();

    res.redirect(`/groups/${group._id}/manage`);
  } catch (err) {
    console.error("Error removing member:", err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
