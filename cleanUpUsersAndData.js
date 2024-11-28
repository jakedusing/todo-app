const mongoose = require("mongoose");
const User = require("./models/User"); // Adjust the path as needed
const Friendship = require("./models/Friendship");
const Todo = require("./models/Todo");
const Group = require("./models/Group");

async function cleanUpUsersAndData() {
  try {
    // Connect to the MongoDB database
    await mongoose.connect("mongodb://localhost:27017/todoApp", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Delete all friendships
    const friendshipsResult = await Friendship.deleteMany({});
    console.log(`${friendshipsResult.deletedCount} friendships were deleted.`);

    // Fetch all user IDs
    const userIds = await User.find({}, { _id: 1 }).exec();
    const userIdArray = userIds.map((user) => user._id);

    // Delete all todos created by the users
    const todosResult = await Todo.deleteMany({ userId: { $in: userIdArray } });
    console.log(`${todosResult.deletedCount} todos were deleted.`);

    // Delete all groups created by the users
    const groupsResult = await Group.deleteMany({
      owner: { $in: userIdArray },
    });
    console.log(`${groupsResult.deletedCount} groups were deleted.`);

    // Finally, delete all users
    const usersResult = await User.deleteMany({});
    console.log(`${usersResult.deletedCount} users were deleted.`);
  } catch (err) {
    console.error("Error cleaning up users and data:", err);
  } finally {
    // Close the connection after the operation
    mongoose.connection.close();
  }
}

cleanUpUsersAndData();
