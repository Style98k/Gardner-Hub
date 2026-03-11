const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const {
  submitRequest,
  getMyRequests,
  secureDownload,
  getAllRequests,
  updateRequestStatus,
  uploadDocumentFile,
} = require("../controllers/requestController");

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

// ─── Multer Configuration: Grade/Document Files ─────────────────────────────
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
// POST /api/inquiries          — Submit a new document request (with ID proof upload)
router.post("/", verifyToken, requireRole("student"), uploadIdProof.single("idProof"), submitRequest);

// GET  /api/inquiries/my       — Get all requests for the logged-in student
router.get("/my", verifyToken, requireRole("student"), getMyRequests);

// POST /api/inquiries/secure-download — Download document file (password required)
router.post("/secure-download", verifyToken, requireRole("student"), secureDownload);

// ─── Admin / Faculty Routes ──────────────────────────────────────────────────
// GET  /api/inquiries/all      — Get all requests (admin/faculty master list)
router.get("/all", verifyToken, requireRole("faculty", "admin"), getAllRequests);

// PATCH /api/inquiries/:id/status — Update request status
router.patch("/:id/status", verifyToken, requireRole("faculty", "admin"), updateRequestStatus);

// POST /api/inquiries/:id/upload-grade — Upload document file for a request
router.post("/:id/upload-grade", verifyToken, requireRole("faculty", "admin"), uploadGradeFileMulter.single("gradeFile"), uploadDocumentFile);

module.exports = router;
