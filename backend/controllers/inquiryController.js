const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

// ─── Submit New Inquiry (Student) ────────────────────────────────────────────
exports.submitInquiry = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ message: "ID proof photo is required." });
    }

    // Store relative path for the uploaded file
    const idProofPath = req.file.path.replace(/\\/g, "/");

    const [result] = await pool.query(
      `INSERT INTO grade_inquiries (student_id, id_proof_path)
       VALUES (?, ?)`,
      [studentId, idProofPath]
    );

    // Fetch the newly created inquiry
    const [rows] = await pool.query("SELECT * FROM grade_inquiries WHERE id = ?", [result.insertId]);

    res.status(201).json({
      message: "Grade inquiry submitted successfully.",
      inquiry: rows[0],
    });
  } catch (error) {
    console.error("Submit inquiry error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Get My Inquiries (Student) ──────────────────────────────────────────────
exports.getMyInquiries = async (req, res) => {
  try {
    const studentId = req.user.id;

    const [rows] = await pool.query(
      "SELECT * FROM grade_inquiries WHERE student_id = ? ORDER BY created_at DESC",
      [studentId]
    );

    res.json({ inquiries: rows });
  } catch (error) {
    console.error("Get inquiries error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Secure Download Grade File (Student) ────────────────────────────────────
exports.secureDownload = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, inquiryId } = req.body;

    if (!password || !inquiryId) {
      return res.status(400).json({ message: "Password and inquiry ID are required." });
    }

    // Verify the user's password
    const [users] = await pool.query("SELECT password FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, users[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    // Fetch the inquiry — ensure it belongs to this student and has a grade file
    const [inquiries] = await pool.query(
      "SELECT * FROM grade_inquiries WHERE id = ? AND student_id = ?",
      [inquiryId, userId]
    );

    if (inquiries.length === 0) {
      return res.status(404).json({ message: "Inquiry not found." });
    }

    const inquiry = inquiries[0];

    if (!inquiry.grade_file_path) {
      return res.status(404).json({ message: "Grade file is not yet available." });
    }

    // Resolve absolute path and send the file
    const filePath = path.resolve(inquiry.grade_file_path);
    res.download(filePath, (err) => {
      if (err) {
        console.error("File download error:", err);
        if (!res.headersSent) {
          res.status(500).json({ message: "Error downloading file." });
        }
      }
    });
  } catch (error) {
    console.error("Secure download error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Get All Inquiries (Admin/Faculty) ───────────────────────────────────────
exports.getAllInquiries = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT gi.*, u.full_name, u.school_id, u.email, u.department_course
       FROM grade_inquiries gi
       JOIN users u ON gi.student_id = u.id
       ORDER BY gi.created_at DESC`
    );

    res.json({ inquiries: rows });
  } catch (error) {
    console.error("Get all inquiries error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Update Inquiry Status (Admin/Faculty) ───────────────────────────────────
exports.updateInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "under_review", "resolved"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be: pending, under_review, or resolved." });
    }

    const [result] = await pool.query(
      "UPDATE grade_inquiries SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Inquiry not found." });
    }

    const [rows] = await pool.query("SELECT * FROM grade_inquiries WHERE id = ?", [id]);

    res.json({ message: "Status updated successfully.", inquiry: rows[0] });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Upload Grade File (Admin/Faculty) ───────────────────────────────────────
exports.uploadGradeFile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "Grade file is required." });
    }

    const gradeFilePath = req.file.path.replace(/\\/g, "/");

    const [result] = await pool.query(
      "UPDATE grade_inquiries SET grade_file_path = ? WHERE id = ?",
      [gradeFilePath, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Inquiry not found." });
    }

    const [rows] = await pool.query("SELECT * FROM grade_inquiries WHERE id = ?", [id]);

    res.json({ message: "Grade file uploaded successfully.", inquiry: rows[0] });
  } catch (error) {
    console.error("Upload grade file error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
