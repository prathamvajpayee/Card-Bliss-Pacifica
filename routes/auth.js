const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;

router.get('/', (req, res) => {
  if (!req.cookies.token) {
    res.render('auth');
  } else {
    res.redirect('/');
  }
});

router.post('/', (req, res) => {
  const { code } = req.body;
  if (code === "Alucard-Turbo777") {
    const token = jwt.sign({ code }, secret);
    res.cookie('token', token);
    res.redirect('/');
  } else {
    res.redirect('/access');
  }
});

module.exports = router;
