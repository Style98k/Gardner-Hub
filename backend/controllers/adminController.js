const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// ─── Get Admin Stats (granular counts) ───────────────────────────────────────
exports.getAdminStats = async (req, res) => {
  try {
    const [[totalUsers]] = await pool.query('SELECT COUNT(*) AS c FROM users');
    const [[totalStudents]] = await pool.query("SELECT COUNT(*) AS c FROM users WHERE role = 'student'");
    const [[totalFaculty]] = await pool.query("SELECT COUNT(*) AS c FROM users WHERE role = 'faculty'");
    const [[totalThreads]] = await pool.query('SELECT COUNT(*) AS c FROM forum_threads');
    const [[totalInquiries]] = await pool.query('SELECT COUNT(*) AS c FROM grade_inquiries');
    const [[pendingInquiries]] = await pool.query("SELECT COUNT(*) AS c FROM grade_inquiries WHERE status = 'pending'");

    res.json({
      totalUsers: Number(totalUsers.c),
      totalStudents: Number(totalStudents.c),
      totalFaculty: Number(totalFaculty.c),
      totalThreads: Number(totalThreads.c),
      totalInquiries: Number(totalInquiries.c),
      pendingInquiriesCount: Number(pendingInquiries.c),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Get Audit Logs (10 most recent across users, threads, inquiries) ────────
exports.getAuditLogs = async (req, res) => {
  try {
    const query = `
      (
        SELECT
          id,
          'signup'                                        AS type,
          full_name   COLLATE utf8mb4_general_ci          AS label,
          role        COLLATE utf8mb4_general_ci          AS meta,
          created_at
        FROM users
      )
      UNION ALL
      (
        SELECT
          id,
          'thread'                                        AS type,
          title       COLLATE utf8mb4_general_ci          AS label,
          category    COLLATE utf8mb4_general_ci          AS meta,
          created_at
        FROM forum_threads
      )
      UNION ALL
      (
        SELECT
          gi.id,
          'inquiry'                                       AS type,
          CONCAT('GCD-', gi.id) COLLATE utf8mb4_general_ci AS label,
          u.full_name           COLLATE utf8mb4_general_ci AS meta,
          gi.created_at
        FROM grade_inquiries gi
        JOIN users u ON gi.student_id = u.id
      )
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const [rows] = await pool.query(query);
    res.json({ logs: rows });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Delete User ─────────────────────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const targetId = Number(req.params.id);

    // Prevent self-deletion
    if (targetId === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    // Block deleting other admins
    const [[target]] = await pool.query('SELECT role FROM users WHERE id = ?', [targetId]);
    if (!target) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (target.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete an admin account.' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [targetId]);
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Reset User Password ────────────────────────────────────────────────────
exports.resetUserPassword = async (req, res) => {
  try {
    const targetId = Number(req.params.id);

    const [[target]] = await pool.query('SELECT role FROM users WHERE id = ?', [targetId]);
    if (!target) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (target.role === 'admin') {
      return res.status(403).json({ message: 'Cannot reset an admin password via this endpoint.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('password123', salt);

    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, targetId]);
    res.json({ message: 'Password reset to default successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
