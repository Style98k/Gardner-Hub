const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const path = require("path");

// ─── Register ────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { full_name, school_id, role, department_course, email, password } =
      req.body;

    // Basic validation
    if (!full_name || !school_id || !role || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate role — admin cannot register via API
    const validRoles = ["student", "faculty"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Role must be 'student' or 'faculty'" });
    }

    // Check if email already exists
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Check if school_id already exists
    const [existingId] = await pool.query(
      "SELECT id FROM users WHERE school_id = ?",
      [school_id]
    );
    if (existingId.length > 0) {
      return res.status(409).json({ message: "School ID already registered" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into database
    await pool.query(
      `INSERT INTO users (full_name, school_id, role, department_course, email, password, status)
       VALUES (?, ?, ?, ?, ?, ?, 'approved')`,
      [full_name, school_id, role, department_course || null, email, hashedPassword]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Login ───────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Find user by email
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = rows[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if user is suspended (status !== 'approved')
    if (user.status !== 'approved') {
      return res.status(403).json({ 
        message: "Your account has been suspended. Please contact the System Administrator.",
        suspended: true
      });
    }

    // Generate JWT token (includes department for access control)
    const token = jwt.sign(
      { id: user.id, role: user.role, department_course: user.department_course },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        school_id: user.school_id,
        email: user.email,
        role: user.role,
        department_course: user.department_course,
        profile_photo: user.profile_photo,
        show_school_id: user.show_school_id,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Get Profile ─────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const userId = req.params.id || req.user.id;
    const [rows] = await pool.query(
      "SELECT id, full_name, school_id, role, department_course, email, profile_photo, show_school_id, created_at FROM users WHERE id = ?",
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user: rows[0] });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Update Profile ──────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, show_school_id } = req.body;

    const updates = [];
    const values = [];

    if (full_name) {
      updates.push("full_name = ?");
      values.push(full_name);
    }
    if (show_school_id !== undefined) {
      updates.push("show_school_id = ?");
      values.push(show_school_id ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    values.push(userId);
    await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    // Return updated user
    const [rows] = await pool.query(
      "SELECT id, full_name, school_id, role, department_course, email, profile_photo, show_school_id, created_at FROM users WHERE id = ?",
      [userId]
    );

    res.json({ message: "Profile updated", user: rows[0] });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Upload Profile Photo ────────────────────────────────────────────────────
exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user.id;
    const photoPath = req.file.filename;

    await pool.query("UPDATE users SET profile_photo = ? WHERE id = ?", [
      photoPath,
      userId,
    ]);

    res.json({ message: "Photo uploaded", profile_photo: photoPath });
  } catch (error) {
    console.error("Upload photo error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Verify Identity (self-service password reset — step 1) ──────────────────
exports.verifyIdentity = async (req, res) => {
  try {
    const { school_id, email } = req.body;

    if (!school_id || !email) {
      return res.status(400).json({ message: "School/Employee ID and email are required" });
    }

    const [rows] = await pool.query(
      "SELECT id, full_name FROM users WHERE school_id = ? AND email = ?",
      [school_id, email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No account matches that ID and email combination" });
    }

    res.json({ verified: true, message: "Identity verified" });
  } catch (error) {
    console.error("Verify identity error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Reset Password (self-service — step 2) ─────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { school_id, email, new_password } = req.body;

    if (!school_id || !email || !new_password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const [rows] = await pool.query(
      "SELECT id, full_name FROM users WHERE school_id = ? AND email = ?",
      [school_id, email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No account matches that ID and email combination" });
    }

    const user = rows[0];

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user.id]);

    // Audit log entry
    await pool.query(
      "INSERT INTO audit_logs (type, label, meta) VALUES (?, ?, ?)",
      ["password_reset", `${user.full_name} successfully reset their password`, user.full_name]
    );

    res.json({ message: "Password successfully updated. You can now login with your new credentials." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── List All Users (admin only) ─────────────────────────────────────────────
exports.listUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, email, school_id, role, department_course, profile_photo, show_school_id, status, created_at FROM users ORDER BY created_at DESC"
    );
    res.json({ users: rows });
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
