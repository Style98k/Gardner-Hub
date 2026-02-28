const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("../middleware/authMiddleware");
const {
  createMaterial,
  getMaterials,
  getMaterialDetail,
  deleteMaterial,
  streamMaterial,
} = require("../controllers/materialController");

// ─── Upload directory setup ─────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "..", "uploads", "materials");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── Multer disk storage ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// ─── File filter: allow documents + images ──────────────────────────────────
const fileFilter = function (req, file, cb) {
  if (file.fieldname === "material_file") {
    // Accept common document types (PDF, Word, Excel, PowerPoint, text, etc.)
    const allowedMimes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "application/rtf",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Allowed: PDF, Word, Excel, PowerPoint, TXT, RTF."));
    }
  } else if (file.fieldname === "thumbnail") {
    // Only accept images for the thumbnail field
    const allowedImages = /jpeg|jpg|png|gif|webp/;
    const extOk = allowedImages.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowedImages.test(file.mimetype);
    if (extOk && mimeOk) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed for the thumbnail."));
    }
  } else {
    cb(new Error("Unexpected file field."));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max (PDFs can be large)
  fileFilter: fileFilter,
});

// ─── Optional auth middleware (sets req.user if token present) ───────────────
// Supports both Authorization header and ?token= query parameter (for iframes)
const optionalAuth = (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
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

// ─── Security middleware: block students from POST/upload ────────────────────
const blockStudentUpload = (req, res, next) => {
  if (req.user && req.user.role === "student") {
    return res.status(403).json({
      message: "Students are not authorized to upload learning materials.",
    });
  }
  next();
};

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /api/materials — list all materials (optional auth for role-based file_path stripping)
router.get("/", optionalAuth, getMaterials);

// POST /api/materials — upload new material (auth required, students blocked)
router.post(
  "/",
  verifyToken,
  blockStudentUpload,
  upload.fields([
    { name: "material_file", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  createMaterial
);

// GET /api/materials/:id/stream — secure file streaming (preview / download)
router.get("/:id/stream", optionalAuth, streamMaterial);

// GET /api/materials/:id — single material detail
router.get("/:id", optionalAuth, getMaterialDetail);

// DELETE /api/materials/:id — delete material (auth required)
router.delete("/:id", verifyToken, deleteMaterial);

module.exports = router;
