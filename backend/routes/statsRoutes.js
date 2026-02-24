const express = require('express');
const router = express.Router();
const { getUserCount } = require('../controllers/statsController');

router.get('/user-count', getUserCount);

module.exports = router;
