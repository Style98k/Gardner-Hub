const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { getUnreadCounts, markAsRead } = require("../controllers/notificationController");

// GET /api/notifications/unread-counts — returns unread counts grouped by category
router.get("/unread-counts", verifyToken, getUnreadCounts);

// POST /api/notifications/mark-as-read — marks all unread in a category as read
router.post("/mark-as-read", verifyToken, markAsRead);

module.exports = router;
