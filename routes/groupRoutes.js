const express = require("express");
const Group = require("../models/Group");
const Todo = require("../models/Todo");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
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
    req.flash("error", "Could not load groups.  Please try again later.");
    res.redirect("/dashboard");
  }
});

// Create a new group
router.post("/create", isAuthenticated, async (req, res) => {
  const { name, members } = req.body;

  try {
    const groupMembers = Array.isArray(members) ? members : [members]; // ensure it's an array
    const validMembers = await User.find({ _id: { $in: groupMembers } }, "_id"); // validate member IDs

    const group = await Group.create({
      name,
      owner: req.session.userId,
      members: [...validMembers.map((user) => user._id), req.session.userId], // Include the current user
    });
    /*const groupMembers = members
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
    }); */

    await group.save();
    req.flash("success", `Group "${name}" created successfully!`);
    res.redirect("/groups");
  } catch (err) {
    console.error("Error creating group:", err);
    req.flash("error", "Could not create group. Please try again.");
    res.redirect("/groups");
  }
});

// Get group details
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members")
      .populate("owner"); // populate the owner field
    const messages = await Message.find({ group: req.params.id })
      .populate("sender", "username") // populate sender info
      .sort({ createdAt: 1 }); // oldest to newest
    if (
      !group.members.some((member) => member._id.equals(req.session.userId))
    ) {
      return res.status(403).send("Unauthorized");
    }

    const todos = await Todo.find({ groupId: group._id }).populate(
      "assignee",
      "username"
    );
    res.render("GroupDetails", { group, todos, messages, user: req.session });
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
      req.flash("error", "You are not authorized to add todos to this group.");
      return res.redirect("/groups");
    }

    // Ensure assignee is a valid group member
    if (!group.members.some((member) => member.equals(assignee))) {
      req.flash("error", "The assignee must be a member of this group.");
      return res.redirect(`/groups/${group._id}`);
    }

    const todo = await Todo.create({
      groupId: group._id,
      title,
      assignee: assignee,
      userId: req.session.userId,
      dueDate: dueDate || null,
      priority: priority || "Low", // default to low if not provided
    });

    req.flash("success", "Todo added successfully!");
    res.redirect(`/groups/${group._id}`);
  } catch (err) {
    console.error("Error adding todo:", err);
    req.flash("error", "Could not add the todo. Please try again.");
    res.redirect(`/groups/${req.params.id}`);
  }
});

// group management page
router.get("/:id/manage", isAuthenticated, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members");

    // Ensure user is authorized to manage the group
    if (group.owner.toString() !== req.session.userId) {
      req.flash("error", "Only owners of the group may manage");
      return res.redirect("/groups");
    }

    // Fetch the user's friends
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

    res.render("GroupManagement", { group, friends });
  } catch (err) {
    console.error("Error fetching group for management:", err);
    res.status(500).send("Server Error");
  }
});

// Add Member to group
router.post("/:id/add", isAuthenticated, async (req, res) => {
  const { members } = req.body; // extract member IDs from the form (array if multiple)

  try {
    const group = await Group.findById(req.params.id);

    // Only the owner can add members
    if (group.owner.toString() !== req.session.userId) {
      req.flash("error", "Only the group owner can add members");
      return res.redirect(`/groups/${group._id}/manage`);
    }

    // Ensure members is an array (handle single or multiple selections)
    const memberIds = Array.isArray(members) ? members : [members];

    // Separate new members from exisiting members
    const alreadyMembers = [];
    const newMembers = [];
    for (const memberId of memberIds) {
      if (group.members.includes(memberId)) {
        alreadyMembers.push(memberId);
      } else {
        group.members.push(memberId);
        newMembers.push(memberId);
      }
    }

    if (newMembers.length > 0) {
      await group.save();
      req.flash(
        "success",
        `Added ${newMembers.length} new member(s) to the group!`
      );
    }

    if (alreadyMembers.length > 0) {
      req.flash(
        "error",
        `${alreadyMembers.length} member(s) were already in the group.`
      );
    }

    res.redirect(`/groups/${group._id}/manage`);
  } catch (err) {
    console.error("Error adding member:", err);
    req.flash("error", "Could not add the member. Please try again.");
    res.redirect(`/groups/${req.params.id}/manage`);
  }
});

// Remove member from group
router.post("/:id/remove/:memberId", isAuthenticated, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    // Only the owner can remove members
    if (group.owner.toString() !== req.session.userId) {
      req.flash("error", "Only the group owner can remove members");
      return res.redirect(`/groups/${group._id}/manage`);
    }

    group.members = group.members.filter(
      (member) => member.toString() !== req.params.memberId
    );
    await group.save();

    req.flash("success", "Member removed from the group.");
    res.redirect(`/groups/${group._id}/manage`);
  } catch (err) {
    console.error("Error removing member:", err);
    req.flash("error", "Could not remove the member. Please try again.");
    res.redirect(`/groups/${req.params.id}/manage`);
  }
});

module.exports = router;
