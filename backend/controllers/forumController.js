const pool = require("../config/db");

// Category → allowed roles mapping
const CATEGORY_PERMISSIONS = {
  announcements: ["admin", "faculty"],
  materials: ["admin", "faculty"],
  academic: ["student", "faculty", "admin"],
  grades: ["student", "faculty", "admin"],
};

// ─── Get Threads by Category ─────────────────────────────────────────────────
exports.getThreads = async (req, res) => {
  try {
    const { category } = req.query;

    let query = `
      SELECT t.*, u.full_name AS author_name, u.role AS author_role, u.profile_photo AS author_photo,
        (SELECT COUNT(*) FROM forum_posts WHERE thread_id = t.id) AS post_count
      FROM forum_threads t
      JOIN users u ON t.author_id = u.id
    `;
    const params = [];

    if (category) {
      query += " WHERE t.category = ?";
      params.push(category);
    }

    query += " ORDER BY t.updated_at DESC";

    const [rows] = await pool.query(query, params);
    res.json({ threads: rows });
  } catch (error) {
    console.error("Get threads error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Create Thread ───────────────────────────────────────────────────────────
exports.createThread = async (req, res) => {
  try {
    const { category, title, content } = req.body;
    const authorId = req.user.id;
    const userRole = req.user.role;

    // Validate category
    const validCategories = ["announcements", "academic", "materials", "grades"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    // Check role permission for this category
    const allowedRoles = CATEGORY_PERMISSIONS[category];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: `Only ${allowedRoles.join(" and ")} can post in this category.`,
      });
    }

    if (!title || !content) {
      return res
        .status(400)
        .json({ message: "Title and content are required" });
    }

    const [result] = await pool.query(
      "INSERT INTO forum_threads (category, title, content, author_id) VALUES (?, ?, ?, ?)",
      [category, title, content, authorId]
    );

    res.status(201).json({
      message: "Thread created",
      thread: { id: result.insertId, category, title, content, author_id: authorId },
    });
  } catch (error) {
    console.error("Create thread error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Get Single Thread with Posts ────────────────────────────────────────────
exports.getThread = async (req, res) => {
  try {
    const { id } = req.params;

    // Get thread
    const [threadRows] = await pool.query(
      `SELECT t.*, u.full_name AS author_name, u.role AS author_role, u.profile_photo AS author_photo
       FROM forum_threads t
       JOIN users u ON t.author_id = u.id
       WHERE t.id = ?`,
      [id]
    );

    if (threadRows.length === 0) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Get posts (replies)
    const [posts] = await pool.query(
      `SELECT p.*, u.full_name AS author_name, u.role AS author_role, u.profile_photo AS author_photo
       FROM forum_posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.thread_id = ?
       ORDER BY p.created_at ASC`,
      [id]
    );

    res.json({ thread: threadRows[0], posts });
  } catch (error) {
    console.error("Get thread error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Create Post (Reply) ────────────────────────────────────────────────────
exports.createPost = async (req, res) => {
  try {
    const { id } = req.params; // thread_id
    const { content } = req.body;
    const authorId = req.user.id;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    // Check thread exists
    const [threadRows] = await pool.query(
      "SELECT id, category FROM forum_threads WHERE id = ?",
      [id]
    );
    if (threadRows.length === 0) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const [result] = await pool.query(
      "INSERT INTO forum_posts (thread_id, author_id, content) VALUES (?, ?, ?)",
      [id, authorId, content]
    );

    // Update thread's updated_at
    await pool.query(
      "UPDATE forum_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );

    res.status(201).json({
      message: "Reply posted",
      post: { id: result.insertId, thread_id: id, author_id: authorId, content },
    });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Delete Thread ───────────────────────────────────────────────────────────
exports.deleteThread = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check thread exists and get author
    const [threadRows] = await pool.query(
      "SELECT id, author_id FROM forum_threads WHERE id = ?",
      [id]
    );
    if (threadRows.length === 0) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Only author or admin can delete
    if (threadRows[0].author_id !== userId && userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this thread" });
    }

    await pool.query("DELETE FROM forum_threads WHERE id = ?", [id]);
    res.json({ message: "Thread deleted" });
  } catch (error) {
    console.error("Delete thread error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
