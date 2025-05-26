const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' }); // Ensures .env is loaded from the backend root

const authenticateToken = (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // Extract token from header (Bearer <token>)
      token = authHeader.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Add user information to the request object (without password or other sensitive data)
      // We stored user ID and email in the token payload
      req.user = decoded.user; 

      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      res.status(401).json({ message: 'Not authorized, token invalid.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token provided.' });
  }
};

module.exports = { authenticateToken }; 