const pool = require("../config/db");
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");

// ─── Create Learning Material (Faculty/Admin Only) ──────────────────────────
exports.createMaterial = async (req, res) => {
  try {
    const { title, content, material_type, is_downloadable } = req.body;
    const authorId = req.user.id;
    const userRole = req.user.role;

    // Block students from creating materials
    if (userRole === "student") {
      return res.status(403).json({
        message: "Students are not allowed to upload learning materials.",
      });
    }

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ message: "Title and description are required." });
    }

    // Validate material_type
    const validTypes = ["Handout", "Syllabus", "Reference"];
    if (!material_type || !validTypes.includes(material_type)) {
      return res.status(400).json({
        message: "Invalid material type. Must be one of: " + validTypes.join(", "),
      });
    }

    // Get file paths from multer
    let filePath = null;
    let thumbnailPath = null;

    if (req.files) {
      if (req.files.material_file && req.files.material_file[0]) {
        filePath = req.files.material_file[0].filename;
      }
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        thumbnailPath = req.files.thumbnail[0].filename;
      }
    }

    if (!filePath) {
      return res.status(400).json({ message: "A file is required." });
    }

    // Default is_downloadable to true (1) unless explicitly set
    const downloadable = is_downloadable === "false" || is_downloadable === "0" ? 0 : 1;

    const [result] = await pool.query(
      `INSERT INTO forum_threads 
        (category, title, content, material_type, file_path, thumbnail_path, is_downloadable, author_id) 
       VALUES ('materials', ?, ?, ?, ?, ?, ?, ?)`,
      [title, content, material_type, filePath, thumbnailPath, downloadable, authorId]
    );

    res.status(201).json({
      message: "Learning material posted successfully.",
      material: {
        id: result.insertId,
        title,
        content,
        material_type,
        file_path: filePath,
        thumbnail_path: thumbnailPath,
        is_downloadable: downloadable,
        author_id: authorId,
      },
    });
  } catch (error) {
    console.error("Create material error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Get All Materials ──────────────────────────────────────────────────────
exports.getMaterials = async (req, res) => {
  try {
    const userRole = req.user ? req.user.role : null;

    const [rows] = await pool.query(
      `SELECT t.id, t.title, t.content, t.material_type, t.file_path, t.thumbnail_path, 
              t.is_downloadable, t.created_at, t.updated_at,
              u.full_name AS author_name, u.role AS author_role, u.profile_photo AS author_photo
       FROM forum_threads t
       JOIN users u ON t.author_id = u.id
       WHERE t.category = 'materials'
       ORDER BY t.created_at DESC`
    );

    // Return materials with stream URL + public URL; strip raw file_path for students
    const materials = rows.map((row) => {
      const mat = { ...row };
      // Add stream URL, file extension, and public URL for all roles (used by the document previewer)
      if (row.file_path) {
        mat.stream_url = "/api/materials/" + row.id + "/stream";
        mat.file_ext = path.extname(row.file_path).replace(".", "").toLowerCase();
        mat.public_url = "/uploads/materials/" + row.file_path;
      }
      // Strip raw file_path for students — they use the secure stream endpoint
      if (userRole === "student" || !userRole) {
        delete mat.file_path;
      }
      return mat;
    });

    res.json({ materials });
  } catch (error) {
    console.error("Get materials error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Get Single Material Detail ─────────────────────────────────────────────
exports.getMaterialDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user ? req.user.role : null;

    const [rows] = await pool.query(
      `SELECT t.id, t.title, t.content, t.material_type, t.file_path, t.thumbnail_path,
              t.is_downloadable, t.created_at, t.updated_at,
              u.full_name AS author_name, u.role AS author_role, u.profile_photo AS author_photo
       FROM forum_threads t
       JOIN users u ON t.author_id = u.id
       WHERE t.id = ? AND t.category = 'materials'`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Material not found." });
    }

    let material = { ...rows[0] };

    // Add stream URL, file extension, and public URL for all roles
    if (material.file_path) {
      material.stream_url = "/api/materials/" + material.id + "/stream";
      material.file_ext = path.extname(material.file_path).replace(".", "").toLowerCase();
      material.public_url = "/uploads/materials/" + material.file_path;
    }

    // Strip raw file_path for students
    if (userRole === "student" || !userRole) {
      delete material.file_path;
    }

    res.json({ material });
  } catch (error) {
    console.error("Get material detail error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Delete Material (Author or Admin Only) ─────────────────────────────────
exports.deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Block students
    if (userRole === "student") {
      return res.status(403).json({ message: "Students cannot delete materials." });
    }

    // Check material exists and get author + file info
    const [rows] = await pool.query(
      "SELECT id, author_id, file_path, thumbnail_path FROM forum_threads WHERE id = ? AND category = 'materials'",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Material not found." });
    }

    const material = rows[0];

    // Only author or admin can delete
    if (material.author_id !== userId && userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this material." });
    }

    // Delete files from disk
    const uploadsDir = path.join(__dirname, "..", "uploads", "materials");

    if (material.file_path) {
      const pdfPath = path.join(uploadsDir, material.file_path);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }

    if (material.thumbnail_path) {
      const thumbPath = path.join(uploadsDir, material.thumbnail_path);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }

    // Delete from database
    await pool.query("DELETE FROM forum_threads WHERE id = ?", [id]);

    res.json({ message: "Material deleted successfully." });
  } catch (error) {
    console.error("Delete material error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Stream / Preview Material File (Secure) ────────────────────────────────
exports.streamMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : null;

    // Look up the material
    const [rows] = await pool.query(
      "SELECT id, file_path, is_downloadable FROM forum_threads WHERE id = ? AND category = 'materials'",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Material not found." });
    }

    const material = rows[0];

    if (!material.file_path) {
      return res.status(404).json({ message: "No file associated with this material." });
    }

    const filePath = path.join(__dirname, "..", "uploads", "materials", material.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on server." });
    }

    // Determine MIME type
    const mimeType = mime.lookup(filePath) || "application/octet-stream";

    // If ?download=true query param, force attachment disposition
    const isDownload = req.query.download === "true";

    // Students can only download if is_downloadable is enabled
    if (isDownload && userRole === "student" && !material.is_downloadable) {
      return res.status(403).json({ message: "Download is not enabled for this material." });
    }

    const stat = fs.statSync(filePath);

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (isDownload) {
      res.setHeader("Content-Disposition", 'attachment; filename="' + material.file_path + '"');
    } else {
      res.setHeader("Content-Disposition", 'inline; filename="' + material.file_path + '"');
    }

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (error) {
    console.error("Stream material error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
