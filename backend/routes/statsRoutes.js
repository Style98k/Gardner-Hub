const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getUserCount, getCategoryStats } = require('../controllers/statsController');

// ─── Optional auth middleware (sets req.user if token present, else continues) ─
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};

router.get('/user-count', getUserCount);
router.get('/category-stats', optionalAuth, getCategoryStats);

module.exports = router;
