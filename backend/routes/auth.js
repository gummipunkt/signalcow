// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // Imports the DB pool
const crypto = require('crypto'); // Added for token generation
const nodemailer = require('nodemailer'); // Added nodemailer
const { authenticateToken } = require('../middleware/authMiddleware'); // Import authenticateToken

// Placeholder - authentication routes will go here later
// e.g., router.post('/register', ...);
// router.post('/login', ...);

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and registration
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registers a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Desired username for the new user.
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address for the new user.
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Password for the new user (min 6 characters recommended).
 *                 example: Str0ngP@sswOrd
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully.
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     is_admin:
 *                       type: boolean
 *       400:
 *         description: Username, email, and password are required.
 *       409:
 *         description: User with this email or username already exists.
 *       500:
 *         description: Internal server error during registration.
 */
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

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Logs in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Str0ngP@sswOrd
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token and user object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged in successfully.
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     username:
 *                       type: string
 *                     is_admin:
 *                       type: boolean
 *       400:
 *         description: Email and password are required.
 *       401:
 *         description: Invalid credentials.
 *       500:
 *         description: Internal server error during login or JWT_SECRET not configured.
 */
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

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Initiates the password reset process for a user.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email address of the user requesting a password reset.
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: If a user with that email exists, a password reset link will be sent. (Generic message for security)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: If an account with that email exists, a password reset link has been sent.
 *       400:
 *         description: Email is required.
 *       500:
 *         description: Internal server error.
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const userResult = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expiresIn = 3600; // Token valid for 1 hour
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
      await pool.query(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [user.id, hashedToken, expiresAt]
      );

      // Send email using Nodemailer
      const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL, FRONTEND_BASE_URL } = process.env;

      if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM_EMAIL || !FRONTEND_BASE_URL) {
        console.error('SMTP configuration or FRONTEND_BASE_URL is missing in .env file. Cannot send password reset email.');
        // Do not expose this error to the client for security, but log it.
        // The generic success message will still be sent.
      } else {
        try {
          const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: parseInt(SMTP_PORT, 10),
            secure: parseInt(SMTP_PORT, 10) === 465, // true for 465, false for other ports
            auth: {
              user: SMTP_USER,
              pass: SMTP_PASS,
            },
          });

          const resetLink = `${FRONTEND_BASE_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

          const mailOptions = {
            from: SMTP_FROM_EMAIL,
            to: user.email,
            subject: 'Password Reset Request for SignalCow',
            text: `You requested a password reset. Click this link to reset your password: ${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`,
            html: `<p>You requested a password reset. Click this link to reset your password: <a href="${resetLink}">${resetLink}</a></p><p>This link will expire in 1 hour.</p><p>If you did not request this, please ignore this email.</p>`,
          };

          await transporter.sendMail(mailOptions);
          console.log('Password reset email sent to:', user.email);
        } catch (emailError) {
          console.error('Error sending password reset email:', emailError);
          // Do not expose this error to the client for security
        }
      }
    }
    // For security reasons, always return a generic success message 
    // regardless of whether the email was found or if the email sending failed.
    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'An internal error occurred. Please try again later.' });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Resets the user's password using a token.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - email
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: The password reset token received by the user (e.g., via email).
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address.
 *               password:
 *                 type: string
 *                 description: The new password for the user (min 6 characters recommended).
 *     responses:
 *       200:
 *         description: Password has been reset successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password has been reset successfully.
 *       400:
 *         description: Invalid or expired token, or missing parameters.
 *       404:
 *         description: User not found or token mismatch.
 *       500:
 *         description: Internal server error.
 */
router.post('/reset-password', async (req, res) => {
  const { token, email, password } = req.body;

  if (!token || !email || !password) {
    return res.status(400).json({ message: 'Token, email, and new password are required.' });
  }

  // Basic password validation (e.g., minimum length)
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  try {
    // Hash the token received from the client to compare with the stored hashed token
    const hashedTokenFromClient = crypto.createHash('sha256').update(token).digest('hex');

    // Find the token in the database, associated with the email
    const tokenQuery = await pool.query(
      'SELECT prt.*, u.id as user_id FROM password_reset_tokens prt JOIN users u ON prt.user_id = u.id WHERE u.email = $1 AND prt.token_hash = $2',
      [email, hashedTokenFromClient]
    );

    if (tokenQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired password reset token. Please request a new one.' });
    }

    const storedTokenData = tokenQuery.rows[0];

    // Check if the token has expired
    if (new Date(storedTokenData.expires_at) < new Date()) {
      // Optionally, delete the expired token
      await pool.query('DELETE FROM password_reset_tokens WHERE id = $1', [storedTokenData.id]);
      return res.status(400).json({ message: 'Password reset token has expired. Please request a new one.' });
    }

    // Token is valid and not expired, proceed to update password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(password, salt);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, storedTokenData.user_id]);

    // Delete the used token from the database
    await pool.query('DELETE FROM password_reset_tokens WHERE id = $1', [storedTokenData.id]);

    res.status(200).json({ message: 'Password has been reset successfully. You can now login with your new password.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'An internal error occurred. Please try again later.' });
  }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Allows an authenticated user to change their password.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmNewPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: The user's current password.
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: The user's desired new password (min 6 characters recommended).
 *               confirmNewPassword:
 *                 type: string
 *                 format: password
 *                 description: Confirmation of the new password.
 *     responses:
 *       200:
 *         description: Password changed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password changed successfully.
 *       400:
 *         description: Invalid input (e.g., passwords don't match, new password too short).
 *       401:
 *         description: Unauthorized (e.g., token missing or invalid, or current password incorrect).
 *       500:
 *         description: Internal server error.
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const userId = req.user.id; // Extracted from JWT by authenticateToken middleware

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ message: 'Current password, new password, and confirmation are required.' });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ message: 'New passwords do not match.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
  }

  try {
    // Fetch the user's current hashed password from the database
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      // This should not happen if authenticateToken works correctly and user exists
      return res.status(404).json({ message: 'User not found.' }); 
    }

    const user = userResult.rows[0];

    // Verify the current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password.' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update the password in the database
    await pool.query('UPDATE users SET password_hash = $1, updated_at = current_timestamp WHERE id = $2', [newPasswordHash, userId]);

    res.status(200).json({ message: 'Password changed successfully.' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'An internal error occurred while changing the password.' });
  }
});

module.exports = router; 