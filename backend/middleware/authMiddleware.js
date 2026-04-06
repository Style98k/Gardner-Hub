const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// ─── Verify JWT Token ────────────────────────────────────────────────────────
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, iat, exp }

    // Check if user is still active (not suspended) - Session Kill feature
    const [rows] = await pool.query("SELECT status FROM users WHERE id = ?", [decoded.id]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "User not found.", forceLogout: true });
    }
    if (rows[0].status !== 'approved') {
      return res.status(403).json({ 
        message: "Your account has been suspended. Please contact the System Administrator.",
        suspended: true,
        forceLogout: true
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

// ─── Require Specific Roles ──────────────────────────────────────────────────
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden. Insufficient permissions." });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };
