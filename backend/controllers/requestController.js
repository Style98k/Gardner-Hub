const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

// ─── Submit New Document Request (Student Only) ──────────────────────────────
exports.submitRequest = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { documentType } = req.body;

    const validTypes = [
      "Cumulative Grade Report",
      "Transcript of Records (TOR)",
      "Form 137 (Permanent Record)",
      "Certificate of Enrollment (COE)",
      "Certificate of Good Moral Character",
    ];

    if (!documentType || !validTypes.includes(documentType)) {
      return res.status(400).json({ message: "Invalid or missing document type." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "ID proof photo is required." });
    }

    const idProofPath = req.file.path.replace(/\\/g, "/");

    const [result] = await pool.query(
      `INSERT INTO document_requests (student_id, document_type, id_proof_path)
       VALUES (?, ?, ?)`,
      [studentId, documentType, idProofPath]
    );

    const [rows] = await pool.query("SELECT * FROM document_requests WHERE id = ?", [result.insertId]);

    res.status(201).json({
      message: "Document request submitted successfully.",
      inquiry: rows[0],
    });
  } catch (error) {
    console.error("Submit request error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Get My Requests (Student) — Strict student_id filter via JWT ────────────
exports.getMyRequests = async (req, res) => {
  try {
    const studentId = req.user.id;

    const [rows] = await pool.query(
      "SELECT * FROM document_requests WHERE student_id = ? ORDER BY created_at DESC",
      [studentId]
    );

    res.json({ inquiries: rows });
  } catch (error) {
    console.error("Get my requests error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Get All Requests (Admin/Faculty — Master List) ──────────────────────────
exports.getAllRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT dr.*, u.full_name, u.school_id, u.email, u.department_course
       FROM document_requests dr
       JOIN users u ON dr.student_id = u.id
       ORDER BY dr.created_at DESC`
    );

    res.json({ inquiries: rows });
  } catch (error) {
    console.error("Get all requests error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Secure Download Grade File (Student) ────────────────────────────────────
exports.secureDownload = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, inquiryId } = req.body;

    if (!password || !inquiryId) {
      return res.status(400).json({ message: "Password and request ID are required." });
    }

    const [users] = await pool.query("SELECT password FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, users[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    const [requests] = await pool.query(
      "SELECT * FROM document_requests WHERE id = ? AND student_id = ?",
      [inquiryId, userId]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: "Request not found." });
    }

    const request = requests[0];

    if (!request.grade_file_path) {
      return res.status(404).json({ message: "Document file is not yet available." });
    }

    const filePath = path.resolve(request.grade_file_path);
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

// ─── Update Request Status (Admin/Faculty) ───────────────────────────────────
exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "under_review", "resolved"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be: pending, under_review, or resolved." });
    }

    const [result] = await pool.query(
      "UPDATE document_requests SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Request not found." });
    }

    const [rows] = await pool.query("SELECT * FROM document_requests WHERE id = ?", [id]);

    res.json({ message: "Status updated successfully.", inquiry: rows[0] });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Upload Document File (Admin/Faculty) ────────────────────────────────────
exports.uploadDocumentFile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "Document file is required." });
    }

    const gradeFilePath = req.file.path.replace(/\\/g, "/");

    const [result] = await pool.query(
      "UPDATE document_requests SET grade_file_path = ? WHERE id = ?",
      [gradeFilePath, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Request not found." });
    }

    const [rows] = await pool.query("SELECT * FROM document_requests WHERE id = ?", [id]);

    res.json({ message: "Document file uploaded successfully.", inquiry: rows[0] });
  } catch (error) {
    console.error("Upload document file error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
