const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { verifyToken } = require("../middleware/authMiddleware");
const {
  createOfficialAnnouncement,
  getAnnouncements,
  getAnnouncementDetail,
  toggleLike,
  addComment,
  getComments,
} = require("../controllers/postController");

// ─── Multer config for announcement images ──────────────────────────────────
const uploadDir = path.join(__dirname, "..", "uploads", "announcements");
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
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed."));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter,
});

// ─── Optional auth middleware (sets req.user if token present, else continues) ─
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

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/posts/announcements — list all announcements (optional auth for like status)
router.get("/announcements", optionalAuth, getAnnouncements);

// POST /api/posts/announcements — create announcement (auth required, role checked in controller)
router.post("/announcements", verifyToken, upload.single("image"), createOfficialAnnouncement);

// GET /api/posts/announcements/:id — single announcement detail
router.get("/announcements/:id", optionalAuth, getAnnouncementDetail);

// POST /api/posts/announcements/:id/like — toggle like (auth required)
router.post("/announcements/:id/like", verifyToken, toggleLike);

// GET /api/posts/announcements/:id/comments — get comments
router.get("/announcements/:id/comments", getComments);

// POST /api/posts/announcements/:id/comments — add comment (auth required)
router.post("/announcements/:id/comments", verifyToken, addComment);

module.exports = router;
