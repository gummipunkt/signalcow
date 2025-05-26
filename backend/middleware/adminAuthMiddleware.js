const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // Database pool

module.exports = async function(req, res, next) {
  // Get the token from the header
  const token = req.header('x-auth-token') || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  // Check if no token is present
  if (!token) {
    return res.status(401).json({ msg: 'No token, access denied.' });
  }

  // Verify the token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user; // User ID and other info from the token

    // Check if the user is an admin
    const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ msg: 'Access denied. User not found.' });
    }

    if (userResult.rows[0].is_admin !== true) {
      return res.status(403).json({ msg: 'Access denied. Admin rights required.' });
    }

    next(); // Zum nächsten Middleware/Handler
  } catch (err) {
    console.error('Token error in adminAuthMiddleware:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
}; 