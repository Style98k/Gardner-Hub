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

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded ID proofs as static files (grade files are served via secure download)
app.use("/uploads/id_proofs", express.static(path.join(__dirname, "uploads", "id_proofs")));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/inquiries", inquiryRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Gardner Hub API is running" });
});

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
