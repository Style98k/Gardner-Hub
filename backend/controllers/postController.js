const pool = require("../config/db");

// ─── Create Official Announcement ────────────────────────────────────────────
// Strict: Only admin/faculty can post. Students get 403.
exports.createOfficialAnnouncement = async (req, res) => {
  try {
    const { title, content, tag, link_url } = req.body;
    const userRole = req.user.role;
    const authorId = req.user.id;

    // Strict role check
    if (userRole === "student") {
      return res
        .status(403)
        .json({ message: "Forbidden. Only admin or faculty can post official announcements." });
    }

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required." });
    }

    // Validate tag
    const validTags = ["Enrollment", "Class Schedule", "Class Suspension", "Events"];
    if (!tag || !validTags.includes(tag)) {
      return res
        .status(400)
        .json({ message: "A valid tag is required: Enrollment, Class Schedule, Class Suspension, or Events." });
    }

    // Handle optional image upload
    const image_url = req.file ? req.file.filename : null;

    const [result] = await pool.query(
      `INSERT INTO forum_threads (category, title, content, tag, image_url, link_url, author_id)
       VALUES ('announcements', ?, ?, ?, ?, ?, ?)`,
      [title, content, tag, image_url, link_url || null, authorId]
    );

    res.status(201).json({
      message: "Announcement created successfully.",
      announcement: {
        id: result.insertId,
        category: "announcements",
        title,
        content,
        tag,
        image_url,
        link_url: link_url || null,
        author_id: authorId,
      },
    });
  } catch (error) {
    console.error("Create announcement error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Get All Announcements ───────────────────────────────────────────────────
exports.getAnnouncements = async (req, res) => {
  try {
    // Optional: check if user is logged in (for like status)
    const userId = req.user ? req.user.id : null;

    let query = `
      SELECT t.*, 
        u.full_name AS author_name, 
        u.role AS author_role, 
        u.profile_photo AS author_photo,
        (SELECT COUNT(*) FROM post_comments WHERE post_id = t.id) AS comment_count
    `;

    if (userId) {
      query += `, (SELECT COUNT(*) FROM post_likes WHERE post_id = t.id AND user_id = ?) AS liked`;
    } else {
      query += `, 0 AS liked`;
    }

    query += `
      FROM forum_threads t
      JOIN users u ON t.author_id = u.id
      WHERE t.category = 'announcements'
      ORDER BY t.created_at DESC
    `;

    const params = userId ? [userId] : [];
    const [rows] = await pool.query(query, params);

    res.json({ announcements: rows });
  } catch (error) {
    console.error("Get announcements error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Get Single Announcement Detail ──────────────────────────────────────────
exports.getAnnouncementDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    let query = `
      SELECT t.*, 
        u.full_name AS author_name, 
        u.role AS author_role, 
        u.profile_photo AS author_photo,
        (SELECT COUNT(*) FROM post_comments WHERE post_id = t.id) AS comment_count
    `;

    if (userId) {
      query += `, (SELECT COUNT(*) FROM post_likes WHERE post_id = t.id AND user_id = ?) AS liked`;
    } else {
      query += `, 0 AS liked`;
    }

    query += `
      FROM forum_threads t
      JOIN users u ON t.author_id = u.id
      WHERE t.id = ? AND t.category = 'announcements'
    `;

    const params = userId ? [userId, id] : [id];
    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    res.json({ announcement: rows[0] });
  } catch (error) {
    console.error("Get announcement detail error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Toggle Like ─────────────────────────────────────────────────────────────
exports.toggleLike = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params; // post_id (forum_threads.id)
    const userId = req.user.id;

    await connection.beginTransaction();

    // Check if already liked
    const [existing] = await connection.query(
      "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?",
      [id, userId]
    );

    let liked;
    if (existing.length > 0) {
      // Unlike — remove row and decrement
      await connection.query("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", [id, userId]);
      await connection.query("UPDATE forum_threads SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?", [id]);
      liked = false;
    } else {
      // Like — insert row and increment
      await connection.query("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)", [id, userId]);
      await connection.query("UPDATE forum_threads SET like_count = like_count + 1 WHERE id = ?", [id]);
      liked = true;
    }

    await connection.commit();

    // Get updated count
    const [countRows] = await connection.query(
      "SELECT like_count FROM forum_threads WHERE id = ?",
      [id]
    );

    res.json({
      liked,
      like_count: countRows.length > 0 ? countRows[0].like_count : 0,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Toggle like error:", error);
    res.status(500).json({ message: "Server error." });
  } finally {
    connection.release();
  }
};

// ─── Add Comment ─────────────────────────────────────────────────────────────
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params; // post_id
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Comment content is required." });
    }

    // Verify the announcement exists
    const [threadRows] = await pool.query(
      "SELECT id FROM forum_threads WHERE id = ? AND category = 'announcements'",
      [id]
    );
    if (threadRows.length === 0) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    const [result] = await pool.query(
      "INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)",
      [id, userId, content.trim()]
    );

    // Fetch inserted comment with author info
    const [commentRows] = await pool.query(
      `SELECT c.*, u.full_name AS author_name, u.role AS author_role, u.profile_photo AS author_photo
       FROM post_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: "Comment added.",
      comment: commentRows[0],
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Get Comments for an Announcement ────────────────────────────────────────
exports.getComments = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT c.*, u.full_name AS author_name, u.role AS author_role, u.profile_photo AS author_photo
       FROM post_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [id]
    );

    res.json({ comments: rows });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
