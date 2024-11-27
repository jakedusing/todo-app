// for cleaning up Todos

const mongoose = require("mongoose");
const Group = require("./models/Group"); // Adjust path if necessary
const Todo = require("./models/Todo"); // Adjust path if necessary

async function cleanUpTodos() {
  try {
    // Connect to the MongoDB database
    await mongoose.connect("mongodb://localhost:27017/todoApp", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Fetch all valid group IDs
    const groupIds = await Group.find({}, { _id: 1 }).exec();
    const groupIdArray = groupIds.map((group) => group._id);

    // Delete todos not associated with valid group IDs
    const result = await Todo.deleteMany({ groupId: { $nin: groupIdArray } });

    console.log(`${result.deletedCount} todos were deleted.`);
  } catch (err) {
    console.error("Error cleaning up todos:", err);
  } finally {
    // Close the connection after the operation
    mongoose.connection.close();
  }
}

cleanUpTodos();
