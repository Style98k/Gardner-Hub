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
