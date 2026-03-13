const pool = require("../config/db");

// ─── Get Unread Notification Counts (grouped by category) ────────────────────
exports.getUnreadCounts = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT category, COUNT(*) AS count
       FROM notifications
       WHERE user_id = ? AND is_read = 0
       GROUP BY category`,
      [userId]
    );

    // Build a map with all categories defaulting to 0
    const counts = {
      announcement: 0,
      academic: 0,
      materials: 0,
      document_request: 0,
    };

    rows.forEach((row) => {
      if (counts.hasOwnProperty(row.category)) {
        counts[row.category] = row.count;
      }
    });

    res.json({ counts });
  } catch (error) {
    console.error("Get unread counts error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── Mark All Notifications as Read (for a specific category) ────────────────
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.body;

    console.log("[Notifications] markAsRead called — userId:", userId, "category:", category, "body:", req.body);

    const validCategories = ["announcement", "academic", "materials", "document_request"];
    if (!category || !validCategories.includes(category)) {
      console.log("[Notifications] Invalid category rejected:", category);
      return res.status(400).json({ message: "Invalid category." });
    }

    const [result] = await pool.query(
      `UPDATE notifications SET is_read = 1
       WHERE user_id = ? AND category = ? AND is_read = 0`,
      [userId, category]
    );

    console.log("[Notifications] Marked as read — affected rows:", result.affectedRows);

    res.json({ message: "Notifications marked as read." });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
