const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const {
  submitInquiry,
  getMyInquiries,
  secureDownload,
  getAllInquiries,
  updateInquiryStatus,
  uploadGradeFile,
} = require("../controllers/inquiryController");

// ─── Multer Configuration: ID Proofs ────────────────────────────────────────
const idProofDir = path.join(__dirname, "..", "uploads", "id_proofs");
if (!fs.existsSync(idProofDir)) {
  fs.mkdirSync(idProofDir, { recursive: true });
}

const idProofStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, idProofDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const uploadIdProof = multer({
  storage: idProofStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed."));
    }
  },
});

// ─── Multer Configuration: Grade Files ──────────────────────────────────────
const gradeFileDir = path.join(__dirname, "..", "uploads", "grade_files");
if (!fs.existsSync(gradeFileDir)) {
  fs.mkdirSync(gradeFileDir, { recursive: true });
}

const gradeFileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, gradeFileDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const uploadGradeFileMulter = multer({
  storage: gradeFileStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ─── Student Routes ─────────────────────────────────────────────────────────
// POST /api/inquiries          — Submit a new inquiry (with ID proof upload)
router.post("/", verifyToken, requireRole("student"), uploadIdProof.single("idProof"), submitInquiry);

// GET  /api/inquiries/my       — Get all inquiries for the logged-in student
router.get("/my", verifyToken, requireRole("student"), getMyInquiries);

// POST /api/inquiries/secure-download — Download grade file (password required)
router.post("/secure-download", verifyToken, requireRole("student"), secureDownload);

// ─── Admin / Faculty Routes ──────────────────────────────────────────────────
// GET  /api/inquiries/all      — Get all inquiries (admin/faculty)
router.get("/all", verifyToken, requireRole("faculty", "admin"), getAllInquiries);

// PATCH /api/inquiries/:id/status — Update inquiry status
router.patch("/:id/status", verifyToken, requireRole("faculty", "admin"), updateInquiryStatus);

// POST /api/inquiries/:id/upload-grade — Upload grade file for an inquiry
router.post("/:id/upload-grade", verifyToken, requireRole("faculty", "admin"), uploadGradeFileMulter.single("gradeFile"), uploadGradeFile);

module.exports = router;
