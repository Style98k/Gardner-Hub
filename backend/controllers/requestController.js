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

    // Store path relative to uploads directory for proper URL construction
    const idProofPath = `uploads/id_proofs/${req.file.filename}`;

    const [result] = await pool.query(
      `INSERT INTO document_requests (student_id, document_type, id_proof_path)
       VALUES (?, ?, ?)`,
      [studentId, documentType, idProofPath]
    );

    const [rows] = await pool.query("SELECT * FROM document_requests WHERE id = ?", [result.insertId]);

    // ── Notify ALL Registrar Office staff about the new request ──
    try {
      const [registrarStaff] = await pool.query(
        "SELECT id FROM users WHERE department_course = 'Registrar Office' AND role IN ('faculty', 'admin')"
      );
      if (registrarStaff.length > 0) {
        const values = registrarStaff.map((s) => [s.id, "document_request", `New document request: ${documentType}`, 0]);
        await pool.query(
          "INSERT INTO notifications (user_id, category, message, is_read) VALUES ?",
          [values]
        );
      }
    } catch (notifErr) {
      console.error("Notification insert error (request submit):", notifErr);
    }

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

// ─── Get All Requests (Admin/Faculty — Three-Tier Access) ─────────────────────
exports.getAllRequests = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userDept = req.user.department_course || "";

    // PATH B: Registrar Office faculty/admin — full access to all records
    if (userRole === "admin" || userDept === "Registrar Office") {
      const [rows] = await pool.query(
        `SELECT dr.*, u.full_name, u.school_id, u.email, u.department_course
         FROM document_requests dr
         JOIN users u ON dr.student_id = u.id
         ORDER BY dr.created_at DESC`
      );
      return res.json({ inquiries: rows });
    }

    // PATH C: Other faculty — return counts only, no individual records
    const [countRows] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'pending') AS pending,
         SUM(status = 'under_review') AS under_review,
         SUM(status = 'resolved') AS resolved
       FROM document_requests`
    );

    const counts = countRows[0];
    return res.json({
      inquiries: [],
      counts: {
        total: counts.total || 0,
        pending: counts.pending || 0,
        under_review: counts.under_review || 0,
        resolved: counts.resolved || 0,
      },
    });
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

    // Check for issued_document_path first, then fall back to grade_file_path
    const docPath = request.issued_document_path || request.grade_file_path;
    if (!docPath) {
      return res.status(404).json({ message: "Document file is not yet available." });
    }

    // Resolve path relative to backend directory
    const filePath = path.join(__dirname, "..", docPath);
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

    const validStatuses = ["pending", "under_review", "resolved", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be: pending, under_review, resolved, or rejected." });
    }

    // Only Registrar Office personnel can update request status
    const dept = req.user.department_course || "";
    if (req.user.role !== "admin" && dept !== "Registrar Office") {
      return res.status(403).json({ message: "Forbidden. Only Registrar Office staff can update request status." });
    }

    const [result] = await pool.query(
      "UPDATE document_requests SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Request not found." });
    }

    const [rows] = await pool.query("SELECT * FROM document_requests WHERE id = ?", [id]);

    // ── Notify the student that their request status was updated ──
    try {
      if (rows.length > 0) {
        const studentId = rows[0].student_id;
        const statusLabel = status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
        await pool.query(
          "INSERT INTO notifications (user_id, category, message, is_read) VALUES (?, 'document_request', ?, 0)",
          [studentId, `Your document request is now: ${statusLabel}`]
        );
      }
    } catch (notifErr) {
      console.error("Notification insert error (status update):", notifErr);
    }

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

    // Only Registrar Office personnel can upload documents
    const dept = req.user.department_course || "";
    if (req.user.role !== "admin" && dept !== "Registrar Office") {
      return res.status(403).json({ message: "Forbidden. Only Registrar Office staff can upload documents." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Document file is required." });
    }

    // Store path relative to uploads directory
    const gradeFilePath = `uploads/grade_files/${req.file.filename}`;

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

// ─── Fulfill Request (Registrar: Upload + Resolve + Notify) ──────────────────
exports.fulfillRequest = async (req, res) => {
  try {
    const { id } = req.params;

    // Only Registrar Office personnel can fulfill requests
    const dept = req.user.department_course || "";
    if (req.user.role !== "admin" && dept !== "Registrar Office") {
      return res.status(403).json({ message: "Forbidden. Only Registrar Office staff can fulfill requests." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Official document file is required to fulfill the request." });
    }

    // Check if request exists
    const [existing] = await pool.query("SELECT * FROM document_requests WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Request not found." });
    }

    const request = existing[0];
    // Store path relative to uploads directory
    const issuedDocPath = `uploads/issued_docs/${req.file.filename}`;

    // Update request: set status to resolved and save issued_document_path
    await pool.query(
      "UPDATE document_requests SET status = 'resolved', issued_document_path = ? WHERE id = ?",
      [issuedDocPath, id]
    );

    // Notify the student
    try {
      const studentId = request.student_id;
      const docType = request.document_type || "requested document";
      await pool.query(
        "INSERT INTO notifications (user_id, category, message, is_read) VALUES (?, 'document_request', ?, 0)",
        [studentId, `Your request for ${docType} has been resolved. You can now view or download it.`]
      );
    } catch (notifErr) {
      console.error("Notification insert error (fulfill request):", notifErr);
    }

    const [rows] = await pool.query("SELECT * FROM document_requests WHERE id = ?", [id]);

    res.json({ message: "Request fulfilled successfully.", inquiry: rows[0] });
  } catch (error) {
    console.error("Fulfill request error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Preview Issued Document (Student: View Only) ────────────────────────────
exports.previewIssuedDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Security: Students can only preview their own documents
    const [requests] = await pool.query(
      "SELECT * FROM document_requests WHERE id = ? AND student_id = ?",
      [id, userId]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: "Request not found or access denied." });
    }

    const request = requests[0];

    if (request.status !== "resolved") {
      return res.status(400).json({ message: "Document is not yet available for preview." });
    }

    const docPath = request.issued_document_path || request.grade_file_path;
    if (!docPath) {
      return res.status(404).json({ message: "Document file is not available." });
    }

    // Resolve path relative to backend directory
    const filePath = path.join(__dirname, "..", docPath);
    const ext = path.extname(filePath).toLowerCase();

    // Set appropriate content type
    const mimeTypes = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", "inline"); // Display in browser, not download
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("File preview error:", err);
        if (!res.headersSent) {
          res.status(500).json({ message: "Error previewing file." });
        }
      }
    });
  } catch (error) {
    console.error("Preview document error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Get Issued Document Path (Student: Security Check) ──────────────────────
exports.getIssuedDocumentPath = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Security: Students can only access their own documents
    const [requests] = await pool.query(
      "SELECT id, status, issued_document_path, grade_file_path, document_type FROM document_requests WHERE id = ? AND student_id = ?",
      [id, userId]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: "Request not found or access denied." });
    }

    const request = requests[0];

    if (request.status !== "resolved") {
      return res.status(400).json({ message: "Document is not yet available." });
    }

    const docPath = request.issued_document_path || request.grade_file_path;
    if (!docPath) {
      return res.status(404).json({ message: "Document file is not available." });
    }

    res.json({
      id: request.id,
      document_type: request.document_type,
      hasDocument: true,
    });
  } catch (error) {
    console.error("Get issued document path error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
