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

    res.json({
      announcements: {
        topics: Number(announcementTopics[0].count),
        posts: Number(announcementPosts[0].count),
      },
      academic: {
        topics: Number(academicTopics[0].count),
        posts: Number(academicPosts[0].count),
      },
      materials: {
        topics: Number(materialsTopics[0].count),
        posts: Number(materialsPosts[0].count),
      },
      gradeInquiries: {
        inquiries: Number(gradeInquiries[0].count),
        replies: Number(gradeReplies[0].count),
      },
    });
  } catch (error) {
    console.error('Category stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
