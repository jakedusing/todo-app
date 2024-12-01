const User = require("../models/User"); // Import the User model

async function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId); // Fetch the user details
      if (!user) {
        return res.redirect("/auth/login");
      }
      req.user = user; // Attach user details to the request object
      return next(); // Continue to the next middleware or route handler
    } catch (err) {
      console.error(err);
      return res.status(500).send("Server Error");
    }
  }
  res.redirect("/auth/login");
}

module.exports = isAuthenticated;
