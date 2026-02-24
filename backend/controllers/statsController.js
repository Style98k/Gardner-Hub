const pool = require('../config/db');

// ─── Get User Count ───────────────────────────────────────────────────────────
exports.getUserCount = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS count FROM users');
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
