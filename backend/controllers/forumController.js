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
    const userId = req.user ? req.user.id : null;

    let query = `
      SELECT t.*, u.full_name AS author_name, u.role AS author_role, u.profile_photo AS author_photo,
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
    `;
    const params = userId ? [userId] : [];

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

// ─── Create Thread (supports academic image upload) ──────────────────────────
exports.createThread = async (req, res) => {
  try {
    const { category, title, content, tag } = req.body;
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

    // For academic category, validate flair tag
    let postTag = null;
    if (category === "academic") {
      const validAcademicTags = ["Lessons", "Q&A", "School Org"];
      if (!tag || !validAcademicTags.includes(tag)) {
        return res.status(400).json({ message: "A valid flair is required: Lessons, Q&A, or School Org." });
      }
      postTag = tag;
    }

    // Handle optional image upload (for academic posts)
    const image_url = req.file ? req.file.filename : null;

    const [result] = await pool.query(
      "INSERT INTO forum_threads (category, title, content, tag, image_url, author_id) VALUES (?, ?, ?, ?, ?, ?)",
      [category, title, content, postTag, image_url, authorId]
    );

    res.status(201).json({
      message: "Thread created",
      thread: { id: result.insertId, category, title, content, tag: postTag, image_url, author_id: authorId },
    });
  } catch (error) {
    console.error("Create thread error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Get Single Thread with Threaded Comments ────────────────────────────────
exports.getThread = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    // Get thread with like status
    let threadQuery = `
      SELECT t.*, u.full_name AS author_name, u.role AS author_role, u.profile_photo AS author_photo,
        (SELECT COUNT(*) FROM post_comments WHERE post_id = t.id) AS comment_count
    `;
    if (userId) {
      threadQuery += `, (SELECT COUNT(*) FROM post_likes WHERE post_id = t.id AND user_id = ?) AS liked`;
    } else {
      threadQuery += `, 0 AS liked`;
    }
    threadQuery += `
       FROM forum_threads t
       JOIN users u ON t.author_id = u.id
       WHERE t.id = ?`;

    const threadParams = userId ? [userId, id] : [id];
    const [threadRows] = await pool.query(threadQuery, threadParams);

    if (threadRows.length === 0) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Get all comments (flat) with like info
    let commentQuery = `
      SELECT c.*, u.full_name AS author_name, u.role AS author_role, u.profile_photo AS author_photo
    `;
    if (userId) {
      commentQuery += `, (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND user_id = ?) AS liked`;
    } else {
      commentQuery += `, 0 AS liked`;
    }
    commentQuery += `
       FROM post_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`;

    const commentParams = userId ? [userId, id] : [id];
    const [flatComments] = await pool.query(commentQuery, commentParams);

    // Build nested tree structure
    const commentMap = {};
    const rootComments = [];

    flatComments.forEach((c) => {
      c.replies = [];
      commentMap[c.id] = c;
    });

    flatComments.forEach((c) => {
      if (c.parent_id && commentMap[c.parent_id]) {
        commentMap[c.parent_id].replies.push(c);
      } else {
        rootComments.push(c);
      }
    });

    // Get posts (legacy replies) — keep backward compatibility
    const [posts] = await pool.query(
      `SELECT p.*, u.full_name AS author_name, u.role AS author_role, u.profile_photo AS author_photo
       FROM forum_posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.thread_id = ?
       ORDER BY p.created_at ASC`,
      [id]
    );

    res.json({ thread: threadRows[0], posts, comments: rootComments });
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

// ─── Add Comment (supports threaded parent_id) ──────────────────────────────
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params; // post_id (thread id)
    const userId = req.user.id;
    const { content, parent_id } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Comment content is required." });
    }

    // Verify thread exists
    const [threadRows] = await pool.query(
      "SELECT id FROM forum_threads WHERE id = ?",
      [id]
    );
    if (threadRows.length === 0) {
      return res.status(404).json({ message: "Thread not found." });
    }

    // If parent_id provided, verify it exists and belongs to this thread
    if (parent_id) {
      const [parentRows] = await pool.query(
        "SELECT id FROM post_comments WHERE id = ? AND post_id = ?",
        [parent_id, id]
      );
      if (parentRows.length === 0) {
        return res.status(404).json({ message: "Parent comment not found." });
      }
    }

    const [result] = await pool.query(
      "INSERT INTO post_comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)",
      [id, userId, content.trim(), parent_id || null]
    );

    // Fetch inserted comment with author info
    const [commentRows] = await pool.query(
      `SELECT c.*, u.full_name AS author_name, u.role AS author_role, u.profile_photo AS author_photo
       FROM post_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.insertId]
    );

    const comment = commentRows[0];
    comment.replies = [];
    comment.liked = 0;

    // Update thread's updated_at
    await pool.query(
      "UPDATE forum_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );

    res.status(201).json({
      message: "Comment added.",
      comment,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Get Threaded Comments ───────────────────────────────────────────────────
exports.getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    let query = `
      SELECT c.*, u.full_name AS author_name, u.role AS author_role, u.profile_photo AS author_photo
    `;
    if (userId) {
      query += `, (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND user_id = ?) AS liked`;
    } else {
      query += `, 0 AS liked`;
    }
    query += `
       FROM post_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`;

    const params = userId ? [userId, id] : [id];
    const [flatComments] = await pool.query(query, params);

    // Build nested tree
    const commentMap = {};
    const rootComments = [];

    flatComments.forEach((c) => {
      c.replies = [];
      commentMap[c.id] = c;
    });

    flatComments.forEach((c) => {
      if (c.parent_id && commentMap[c.parent_id]) {
        commentMap[c.parent_id].replies.push(c);
      } else {
        rootComments.push(c);
      }
    });

    res.json({ comments: rootComments });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Toggle Like on Thread (Heart) ───────────────────────────────────────────
exports.toggleThreadLike = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await connection.beginTransaction();

    const [existing] = await connection.query(
      "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?",
      [id, userId]
    );

    let liked;
    if (existing.length > 0) {
      await connection.query("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", [id, userId]);
      await connection.query("UPDATE forum_threads SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?", [id]);
      liked = false;
    } else {
      await connection.query("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)", [id, userId]);
      await connection.query("UPDATE forum_threads SET like_count = like_count + 1 WHERE id = ?", [id]);
      liked = true;
    }

    await connection.commit();

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
    console.error("Toggle thread like error:", error);
    res.status(500).json({ message: "Server error." });
  } finally {
    connection.release();
  }
};

// ─── Toggle Like on Comment (Heart) ─────────────────────────────────────────
exports.toggleCommentLike = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    await connection.beginTransaction();

    const [existing] = await connection.query(
      "SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?",
      [commentId, userId]
    );

    let liked;
    if (existing.length > 0) {
      await connection.query("DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?", [commentId, userId]);
      await connection.query("UPDATE post_comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?", [commentId]);
      liked = false;
    } else {
      await connection.query("INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)", [commentId, userId]);
      await connection.query("UPDATE post_comments SET like_count = like_count + 1 WHERE id = ?", [commentId]);
      liked = true;
    }

    await connection.commit();

    const [countRows] = await connection.query(
      "SELECT like_count FROM post_comments WHERE id = ?",
      [commentId]
    );

    res.json({
      liked,
      like_count: countRows.length > 0 ? countRows[0].like_count : 0,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Toggle comment like error:", error);
    res.status(500).json({ message: "Server error." });
  } finally {
    connection.release();
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
