const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getThreads,
  createThread,
  getThread,
  createPost,
  deleteThread,
  addComment,
  getComments,
  toggleThreadLike,
  toggleCommentLike,
} = require("../controllers/forumController");

// ─── Optional auth middleware ────────────────────────────────────────────────
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const jwt = require("jsonwebtoken");
    const token = authHeader.split(" ")[1];
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

// ─── Multer config for academic discussion images ───────────────────────────
const uploadDir = path.join(__dirname, "..", "uploads", "academic");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = function (req, file, cb) {
  const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /image|video/.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image/video files are allowed."));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: fileFilter,
});

// ─── Thread Routes ───────────────────────────────────────────────────────────

// GET /api/forum/threads?category=academic — list threads (optional auth for like status)
router.get("/threads", optionalAuth, getThreads);

// POST /api/forum/threads — create a new thread with optional image (auth required)
router.post("/threads", verifyToken, upload.single("image"), createThread);

// GET /api/forum/threads/:id — get thread + nested comments (optional auth for like status)
router.get("/threads/:id", optionalAuth, getThread);

// POST /api/forum/threads/:id/posts — reply to a thread (auth required)
router.post("/threads/:id/posts", verifyToken, createPost);

// DELETE /api/forum/threads/:id — delete thread (author or admin)
router.delete("/threads/:id", verifyToken, deleteThread);

// ─── Comment Routes (Threaded) ───────────────────────────────────────────────

// GET /api/forum/threads/:id/comments — get threaded comments
router.get("/threads/:id/comments", optionalAuth, getComments);

// POST /api/forum/threads/:id/comments — add comment (supports parent_id for threading)
router.post("/threads/:id/comments", verifyToken, addComment);

// ─── Reaction Routes (Heart) ────────────────────────────────────────────────

// POST /api/forum/threads/:id/like — toggle heart on thread
router.post("/threads/:id/like", verifyToken, toggleThreadLike);

// POST /api/forum/comments/:commentId/like — toggle heart on comment
router.post("/comments/:commentId/like", verifyToken, toggleCommentLike);

module.exports = router;
