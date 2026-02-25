const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { register, login, getProfile, updateProfile, uploadPhoto, listUsers } = require("../controllers/authController");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

// Multer config for profile photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "..", "uploads", "profile_photos"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/profile — get own profile
router.get("/profile", verifyToken, getProfile);

// GET /api/auth/profile/:id — get any user's profile
router.get("/profile/:id", verifyToken, getProfile);

// PATCH /api/auth/profile — update own profile
router.patch("/profile", verifyToken, updateProfile);

// POST /api/auth/profile/photo — upload profile photo
router.post("/profile/photo", verifyToken, upload.single("photo"), uploadPhoto);

// GET /api/auth/users — list all users (admin only)
router.get("/users", verifyToken, requireRole("admin"), listUsers);

module.exports = router;
