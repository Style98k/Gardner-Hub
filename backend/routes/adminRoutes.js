const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const {
  getAdminStats,
  getAuditLogs,
  deleteUser,
  resetUserPassword,
} = require('../controllers/adminController');

// All routes require admin role
router.use(verifyToken, requireRole('admin'));

// GET /api/admin/stats
router.get('/stats', getAdminStats);

// GET /api/admin/audit-logs
router.get('/audit-logs', getAuditLogs);

// DELETE /api/admin/users/:id
router.delete('/users/:id', deleteUser);

// POST /api/admin/users/:id/reset-password
router.post('/users/:id/reset-password', resetUserPassword);

module.exports = router;
