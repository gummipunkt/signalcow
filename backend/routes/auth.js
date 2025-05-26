// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // Imports the DB pool

// Placeholder - authentication routes will go here later
// e.g., router.post('/register', ...);
// router.post('/login', ...);

// Registration endpoint: POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required.' });
  }

  try {
    // Check if an admin already exists
    const adminCheck = await pool.query('SELECT id FROM users WHERE is_admin = TRUE LIMIT 1');
    const isAdmin = adminCheck.rows.length === 0; // First user will be admin

    // Check if the user already exists (email OR username)
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (userCheck.rows.length > 0) {
      if (userCheck.rows.find(u => u.email === email)) {
        return res.status(409).json({ message: 'User with this email already exists.' });
      }
      if (userCheck.rows.find(u => u.username === username)) {
        return res.status(409).json({ message: 'User with this username already exists.' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save new user to the database (with username and admin status)
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, username, email, created_at, is_admin',
      [username, email, passwordHash, isAdmin]
    );

    res.status(201).json({
      message: 'User registered successfully.',
      user: newUser.rows[0],
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration.' });
  }
});

// Login endpoint: POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Find user in the database
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' }); // User not found
    }

    const user = userResult.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' }); // Incorrect password
    }

    // Create JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in the .env file!');
      return res.status(500).json({ message: 'Token creation error: Server configuration issue.' })
    }

    const payload = {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        is_admin: user.is_admin
      },
    };

    jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: '1h' }, // Token expires in 1 hour
      (err, token) => {
        if (err) throw err;
        res.json({ 
          message: 'Logged in successfully.',
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            is_admin: user.is_admin
          }
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
});

module.exports = router; 