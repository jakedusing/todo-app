function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next(); // user is logged in, continue to the next middleware or route handler
  }
  res.redirect("/auth/login");
}

module.exports = isAuthenticated;
