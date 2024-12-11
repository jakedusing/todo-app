const express = require("express");
const router = express.Router();

// Route for the Help page
router.get("/help", (req, res) => {
  res.render("helppage");
});

module.exports = router;
