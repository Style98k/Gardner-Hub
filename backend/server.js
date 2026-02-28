const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Import DB (triggers connection test on startup)
require("./config/db");

// Import routes
const authRoutes = require("./routes/authRoutes");
const statsRoutes = require("./routes/statsRoutes");
const inquiryRoutes = require("./routes/inquiryRoutes");
const forumRoutes = require("./routes/forumRoutes");
const postRoutes = require("./routes/postRoutes");
const adminRoutes = require("./routes/adminRoutes");
const materialRoutes = require("./routes/materialRoutes");

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded ID proofs as static files (grade files are served via secure download)
app.use("/uploads/id_proofs", express.static(path.join(__dirname, "uploads", "id_proofs")));

// Serve profile photos
app.use("/uploads/profile_photos", express.static(path.join(__dirname, "uploads", "profile_photos")));

// Serve announcement images
app.use("/uploads/announcements", express.static(path.join(__dirname, "uploads", "announcements")));

// Serve learning material files (PDFs & thumbnails)
app.use("/uploads/materials", express.static(path.join(__dirname, "uploads", "materials")));

// Serve academic discussion images/videos
app.use("/uploads/academic", express.static(path.join(__dirname, "uploads", "academic")));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Gardner Hub API is running" });
});

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
