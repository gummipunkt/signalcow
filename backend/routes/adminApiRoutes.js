const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');

// Middleware to check if the user is an admin
const isAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Apply JWT authentication and admin check to all routes in this file
router.use(authenticateToken, isAdmin);

// GET /api/admin/users - List all users
router.get('/users', async (req, res) => {
  try {
    const query = `
      SELECT 
          u.id, 
          u.username,
          u.email, 
          u.is_admin, 
          u.created_at,
          COUNT(DISTINCT g.id) as group_count,
          COUNT(DISTINCT w.id) as webhook_count_total
      FROM users u
      LEFT JOIN groups g ON u.id = g.user_id
      LEFT JOIN webhooks w ON g.id = w.group_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error loading users for admin:', err.message);
    res.status(500).json({ message: 'Server error loading users.' });
  }
});

// DELETE /api/admin/users/:userId - Delete a user
router.delete('/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const requestingAdminId = req.user.id;

  try {
    const userToDeleteResult = await pool.query('SELECT id, email, is_admin FROM users WHERE id = $1', [userId]);
    if (userToDeleteResult.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const userToDelete = userToDeleteResult.rows[0];

    // Prevent admin from deleting themselves
    if (parseInt(userId, 10) === requestingAdminId) {
      return res.status(403).json({ message: 'Admin cannot delete themselves.' });
    }

    // Prevent deletion of the last admin if this user is an admin
    if (userToDelete.is_admin) {
      const adminCountResult = await pool.query('SELECT COUNT(*) AS count FROM users WHERE is_admin = TRUE');
      if (parseInt(adminCountResult.rows[0].count, 10) <= 1) {
        return res.status(403).json({ message: 'Cannot delete the last admin account.' });
      }
    }
    
    // Database schema should handle cascading deletes for groups and webhooks 
    // (ON DELETE CASCADE for user_id in groups, and group_id in webhooks)
    // If not, explicit deletion would be needed here.
    const deleteOp = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    if (deleteOp.rowCount === 0) {
      return res.status(404).json({ message: 'User not found during deletion process.' });
    }
    res.json({ message: `User ${userToDelete.email} successfully deleted.` });
  } catch (err) {
    console.error('Error deleting user (Admin API):', err.message);
    res.status(500).json({ message: 'Server error deleting user.' });
  }
});

// GET /api/admin/groups - List all groups
router.get('/groups', async (req, res) => {
  try {
    const query = `
      SELECT 
          g.id, 
          g.group_name,
          g.description,
          g.signal_group_id, 
          g.bot_phone_number, 
          g.created_at, 
          g.user_id,
          u.email as user_email,
          u.username as user_username,
          COUNT(w.id) as webhook_count
      FROM groups g
      JOIN users u ON g.user_id = u.id
      LEFT JOIN webhooks w ON g.id = w.group_id
      GROUP BY g.id, u.email, u.username
      ORDER BY g.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error loading groups for admin:', err.message);
    res.status(500).json({ message: 'Server error loading groups.' });
  }
});

// DELETE /api/admin/groups/:groupId - Delete a group
router.delete('/groups/:groupId', async (req, res) => {
  const { groupId } = req.params;
  try {
    // Database schema should handle cascading deletes for webhooks
    const deleteOp = await pool.query('DELETE FROM groups WHERE id = $1 RETURNING id', [groupId]);
    if (deleteOp.rowCount === 0) {
      return res.status(404).json({ message: 'Group not found.' });
    }
    res.json({ message: 'Group and associated webhooks successfully deleted.' });
  } catch (err) {
    console.error('Error deleting group (Admin API):', err.message);
    res.status(500).json({ message: 'Server error deleting group.' });
  }
});

// GET /api/admin/webhooks - List all webhooks
router.get('/webhooks', async (req, res) => {
  try {
    const query = `
      SELECT 
          w.id, 
          w.webhook_token, 
          w.is_active, 
          w.description as webhook_description,
          w.created_at, 
          w.group_id,
          g.group_name,
          u.id as user_id,
          u.email as user_email,
          u.username as user_username
      FROM webhooks w
      JOIN groups g ON w.group_id = g.id
      JOIN users u ON g.user_id = u.id
      ORDER BY w.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error loading webhooks for admin:', err.message);
    res.status(500).json({ message: 'Server error loading webhooks.' });
  }
});

// DELETE /api/admin/webhooks/:webhookId - Delete a webhook
router.delete('/webhooks/:webhookId', async (req, res) => {
  const { webhookId } = req.params;
  try {
    const deleteOp = await pool.query('DELETE FROM webhooks WHERE id = $1 RETURNING id', [webhookId]);
    if (deleteOp.rowCount === 0) {
      return res.status(404).json({ message: 'Webhook not found.' });
    }
    res.json({ message: 'Webhook successfully deleted.' });
  } catch (err) {
    console.error('Error deleting webhook (Admin API):', err.message);
    res.status(500).json({ message: 'Server error deleting webhook.' });
  }
});

module.exports = router; 