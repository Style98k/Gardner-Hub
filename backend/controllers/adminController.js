const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// ─── Get Admin Stats (granular counts) ───────────────────────────────────────
exports.getAdminStats = async (req, res) => {
  try {
    const [[totalUsers]] = await pool.query('SELECT COUNT(*) AS c FROM users');
    const [[totalStudents]] = await pool.query("SELECT COUNT(*) AS c FROM users WHERE role = 'student'");
    const [[totalFaculty]] = await pool.query("SELECT COUNT(*) AS c FROM users WHERE role = 'faculty'");
    const [[totalThreads]] = await pool.query('SELECT COUNT(*) AS c FROM forum_threads');
    const [[totalInquiries]] = await pool.query('SELECT COUNT(*) AS c FROM document_requests');
    const [[pendingInquiries]] = await pool.query("SELECT COUNT(*) AS c FROM document_requests WHERE status = 'pending'");

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
          dr.id,
          'inquiry'                                       AS type,
          CONCAT('DR-', dr.id) COLLATE utf8mb4_general_ci AS label,
          u.full_name           COLLATE utf8mb4_general_ci AS meta,
          dr.created_at
        FROM document_requests dr
        JOIN users u ON dr.student_id = u.id
      )
      UNION ALL
      (
        SELECT
          id,
          'password_reset'                                AS type,
          label         COLLATE utf8mb4_general_ci        AS label,
          meta          COLLATE utf8mb4_general_ci        AS meta,
          created_at
        FROM audit_logs
        WHERE type = 'password_reset'
      )
      UNION ALL
      (
        SELECT
          id,
          type          COLLATE utf8mb4_general_ci        AS type,
          label         COLLATE utf8mb4_general_ci        AS label,
          meta          COLLATE utf8mb4_general_ci        AS meta,
          created_at
        FROM audit_logs
        WHERE type = 'MODERATION'
      )
      ORDER BY created_at DESC
      LIMIT 20
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

// ─── Toggle User Status (Suspend/Reactivate) ────────────────────────────────
exports.toggleUserStatus = async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const adminId = req.user.id;

    // Prevent self-suspension
    if (targetId === adminId) {
      return res.status(400).json({ message: 'You cannot suspend your own account.' });
    }

    // Get target user info
    const [[target]] = await pool.query('SELECT id, role, status, full_name FROM users WHERE id = ?', [targetId]);
    if (!target) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Block suspending other admins
    if (target.role === 'admin') {
      return res.status(403).json({ message: 'Cannot suspend an admin account.' });
    }

    // Toggle status: approved <-> pending
    const newStatus = target.status === 'approved' ? 'pending' : 'approved';
    const action = newStatus === 'pending' ? 'suspended' : 'reactivated';

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, targetId]);

    // Get admin name for audit log
    const [[admin]] = await pool.query('SELECT full_name FROM users WHERE id = ?', [adminId]);
    const adminName = admin ? admin.full_name : 'Admin';

    // Audit log entry
    await pool.query(
      'INSERT INTO audit_logs (type, label, meta) VALUES (?, ?, ?)',
      ['user_status', `${adminName} ${action} user ${target.full_name}`, target.full_name]
    );

    res.json({ 
      message: `User ${action} successfully.`,
      newStatus: newStatus,
      action: action
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
