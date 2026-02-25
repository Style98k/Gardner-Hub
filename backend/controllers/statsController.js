const pool = require('../config/db');

// ─── Get User Count (role-filtered) ──────────────────────────────────────────
exports.getUserCount = async (req, res) => {
  try {
    const [totalRows] = await pool.query('SELECT COUNT(*) AS count FROM users');
    const [studentRows] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'student'");
    const [facultyRows] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'faculty'");
    const [threadRows] = await pool.query('SELECT COUNT(*) AS count FROM forum_threads');
    const [postRows] = await pool.query('SELECT COUNT(*) AS count FROM forum_posts');
    const [inquiryRows] = await pool.query('SELECT COUNT(*) AS count FROM grade_inquiries');
    const [announcementRows] = await pool.query("SELECT COUNT(*) AS count FROM forum_threads WHERE category = 'announcements'");

    res.json({
      totalCount: Number(totalRows[0].count),
      studentCount: Number(studentRows[0].count),
      facultyCount: Number(facultyRows[0].count),
      threadCount: Number(threadRows[0].count),
      postCount: Number(postRows[0].count),
      inquiryCount: Number(inquiryRows[0].count),
      announcementCount: Number(announcementRows[0].count),
      // Keep legacy field for backward compat
      count: Number(totalRows[0].count),
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Get Category Stats (topics, posts/replies per category) ─────────────────
exports.getCategoryStats = async (req, res) => {
  try {
    // Count threads per category
    const [announcementTopics] = await pool.query(
      "SELECT COUNT(*) AS count FROM forum_threads WHERE category = 'announcements'"
    );
    const [academicTopics] = await pool.query(
      "SELECT COUNT(*) AS count FROM forum_threads WHERE category = 'academic'"
    );
    const [materialsTopics] = await pool.query(
      "SELECT COUNT(*) AS count FROM forum_threads WHERE category = 'materials'"
    );

    // Count comments/replies per category (post_comments linked to threads)
    const [announcementPosts] = await pool.query(
      "SELECT COUNT(*) AS count FROM post_comments WHERE post_id IN (SELECT id FROM forum_threads WHERE category = 'announcements')"
    );
    const [academicPosts] = await pool.query(
      "SELECT COUNT(*) AS count FROM post_comments WHERE post_id IN (SELECT id FROM forum_threads WHERE category = 'academic')"
    );
    const [materialsPosts] = await pool.query(
      "SELECT COUNT(*) AS count FROM post_comments WHERE post_id IN (SELECT id FROM forum_threads WHERE category = 'materials')"
    );

    // Grade inquiries: role-based count
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : null;

    let gradeInquiriesQuery = 'SELECT COUNT(*) AS count FROM grade_inquiries';
    let gradeInquiriesParams = [];

    if (userRole === 'student' && userId) {
      gradeInquiriesQuery += ' WHERE student_id = ?';
      gradeInquiriesParams = [userId];
    }
    // admin/faculty see all; unauthenticated users see 0 (handled by null userId check)
    if (!userId) {
      gradeInquiriesQuery = 'SELECT 0 AS count';
      gradeInquiriesParams = [];
    }

    const [gradeInquiries] = await pool.query(gradeInquiriesQuery, gradeInquiriesParams);

    // Grade replies: comments on threads with category='grades'
    const [gradeReplies] = await pool.query(
      "SELECT COUNT(*) AS count FROM post_comments WHERE post_id IN (SELECT id FROM forum_threads WHERE category = 'grades')"
    );

    // ── Latest activity per category ──
    const [latestAnnouncement] = await pool.query(
      "SELECT title, created_at FROM forum_threads WHERE category = 'announcements' ORDER BY created_at DESC LIMIT 1"
    );
    const [latestAcademic] = await pool.query(
      "SELECT title, created_at FROM forum_threads WHERE category = 'academic' ORDER BY created_at DESC LIMIT 1"
    );
    const [latestMaterials] = await pool.query(
      "SELECT title, created_at FROM forum_threads WHERE category = 'materials' ORDER BY created_at DESC LIMIT 1"
    );

    // Grade inquiry latest: role-dependent
    let latestGradeInquiry = null;
    if (userRole === 'student' && userId) {
      const [rows] = await pool.query(
        "SELECT status, updated_at FROM grade_inquiries WHERE student_id = ? ORDER BY updated_at DESC LIMIT 1",
        [userId]
      );
      if (rows.length > 0) {
        const statusLabel = rows[0].status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
        latestGradeInquiry = { title: 'Grade inquiry is now ' + statusLabel, created_at: rows[0].updated_at };
      }
    } else if (userId && (userRole === 'admin' || userRole === 'faculty')) {
      const [rows] = await pool.query(
        `SELECT gi.status, gi.updated_at, u.full_name
         FROM grade_inquiries gi
         JOIN users u ON gi.student_id = u.id
         ORDER BY gi.updated_at DESC LIMIT 1`
      );
      if (rows.length > 0) {
        const statusLabel = rows[0].status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
        latestGradeInquiry = { title: rows[0].full_name + ' — ' + statusLabel, created_at: rows[0].updated_at };
      }
    }

    res.json({
      announcements: {
        topics: Number(announcementTopics[0].count),
        posts: Number(announcementPosts[0].count),
        latestActivity: latestAnnouncement.length > 0 ? { title: latestAnnouncement[0].title, created_at: latestAnnouncement[0].created_at } : null,
      },
      academic: {
        topics: Number(academicTopics[0].count),
        posts: Number(academicPosts[0].count),
        latestActivity: latestAcademic.length > 0 ? { title: latestAcademic[0].title, created_at: latestAcademic[0].created_at } : null,
      },
      materials: {
        topics: Number(materialsTopics[0].count),
        posts: Number(materialsPosts[0].count),
        latestActivity: latestMaterials.length > 0 ? { title: latestMaterials[0].title, created_at: latestMaterials[0].created_at } : null,
      },
      gradeInquiries: {
        inquiries: Number(gradeInquiries[0].count),
        replies: Number(gradeReplies[0].count),
        latestActivity: latestGradeInquiry,
      },
    });
  } catch (error) {
    console.error('Category stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Get Recent Activity (global, 5 most recent across all tables) ───────────
exports.getRecentActivity = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : null;

    // Build UNION query parts
    const parts = [];
    const params = [];

    // Forum threads (announcements, academic, materials)
    // Use COLLATE to normalize collation across tables for UNION
    parts.push(
      `(SELECT id, category COLLATE utf8mb4_general_ci AS source, title COLLATE utf8mb4_general_ci AS label, created_at FROM forum_threads WHERE category IN ('announcements', 'academic', 'materials'))`
    );

    // Grade inquiries — role-dependent
    if (userRole === 'student' && userId) {
      parts.push(
        `(SELECT gi.id, 'grades' COLLATE utf8mb4_general_ci AS source, CONCAT('Grade inquiry is now ', REPLACE(CONCAT(UPPER(LEFT(gi.status,1)), LOWER(SUBSTRING(gi.status,2))), '_', ' ')) COLLATE utf8mb4_general_ci AS label, gi.updated_at AS created_at FROM grade_inquiries gi WHERE gi.student_id = ?)`
      );
      params.push(userId);
    } else if (userId && (userRole === 'admin' || userRole === 'faculty')) {
      parts.push(
        `(SELECT gi.id, 'grades' COLLATE utf8mb4_general_ci AS source, CONCAT(u.full_name, ' — ', REPLACE(CONCAT(UPPER(LEFT(gi.status,1)), LOWER(SUBSTRING(gi.status,2))), '_', ' ')) COLLATE utf8mb4_general_ci AS label, gi.updated_at AS created_at FROM grade_inquiries gi JOIN users u ON gi.student_id = u.id)`
      );
    }
    // Unauthenticated users: no grade inquiries in the union

    const query = parts.join(' UNION ALL ') + ' ORDER BY created_at DESC LIMIT 5';
    const [rows] = await pool.query(query, params);

    res.json({ activities: rows });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
