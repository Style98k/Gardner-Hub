const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getThreads,
  createThread,
  getThread,
  createPost,
  deleteThread,
} = require("../controllers/forumController");

// GET /api/forum/threads?category=academic
router.get("/threads", getThreads);

// POST /api/forum/threads — create a new thread (auth required, role-checked in controller)
router.post("/threads", verifyToken, createThread);

// GET /api/forum/threads/:id — get thread + replies
router.get("/threads/:id", getThread);

// POST /api/forum/threads/:id/posts — reply to a thread (auth required)
router.post("/threads/:id/posts", verifyToken, createPost);

// DELETE /api/forum/threads/:id — delete thread (author or admin)
router.delete("/threads/:id", verifyToken, deleteThread);

module.exports = router;
