const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;

module.exports = function (req, res, next) {
  try {
    const { token } = req.cookies;
    if (!token) return res.redirect('/access');

    const decoded = jwt.verify(token, secret);
    if (decoded.code) {
      next();
    } else {
      res.redirect('/access');
    }
  } catch (err) {
    res.redirect('/access');
  }
};
