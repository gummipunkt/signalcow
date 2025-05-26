const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware'); // Applied to the entire router instance in server.js

// List all groups of the authenticated user
router.get('/', async (req, res) => {
  const userId = req.user.id; // Set by authenticateToken middleware in server.js
  try {
    const result = await pool.query(
      'SELECT id, user_id, group_name, description, signal_group_id, link_token, link_token_expires_at, bot_linked_at, created_at FROM groups WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[GET /api/groups] Error fetching groups:', error);
    res.status(500).json({ message: 'Error fetching groups.' });
  }
});

// Get a specific group of the authenticated user
router.get('/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id; // Set by authenticateToken middleware in server.js
  try {
    const result = await pool.query(
      'SELECT id, user_id, group_name, description, signal_group_id, link_token, link_token_expires_at, bot_linked_at, created_at FROM groups WHERE id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found or access denied.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`[GET /api/groups/${groupId}] Error fetching group:`, error);
    res.status(500).json({ message: 'Error fetching group.' });
  }
});

// Route to generate a link token for a group
router.post('/:groupId/link-token', async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id; // Set by authenticateToken middleware in server.js

  if (!process.env.BOT_NUMBER) {
    console.error('[POST /:groupId/link-token] BOT_NUMBER is not defined in .env.');
    return res.status(500).json({ message: 'Server configuration error: Bot number not set up.' });
  }

  try {
    // 1. Check if the group belongs to the user and get the group name
    const groupCheck = await pool.query('SELECT id, group_name FROM groups WHERE id = $1 AND user_id = $2', [groupId, userId]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found or access denied.' });
    }
    const groupName = groupCheck.rows[0].group_name;

    // 2. Generate token
    const linkToken = crypto.randomBytes(16).toString('hex');
    
    // 3. Set expiration date for the token (e.g., 1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // 4. Save token and expiration date in the DB
    const updateResult = await pool.query(
      'UPDATE groups SET link_token = $1, link_token_expires_at = $2 WHERE id = $3',
      [linkToken, expiresAt, groupId]
    );

    if (updateResult.rowCount === 0) {
        // Should not happen if groupCheck was successful, but as a safety net
        return res.status(500).json({ message: 'Error saving link token.' });
    }

    console.log(`[LinkToken] Token ${linkToken} for group ${groupName} (ID: ${groupId}) generated, valid until ${expiresAt.toISOString()}`);

    // 5. Send back token and bot number
    res.json({
      message: 'Link token generated successfully.',
      linkToken: linkToken,
      botNumber: process.env.BOT_NUMBER,
      groupName: groupName,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error(`[POST /:groupId/link-token] Error generating link token for group ${groupId}:`, error);
    res.status(500).json({ message: 'Internal server error generating link token.' });
  }
});

// Standard CRUD routes for groups

// Create group
router.post('/', async (req, res) => {
  const { group_name, description } = req.body;
  const userId = req.user.id;
  if (!group_name) {
    return res.status(400).json({ message: 'Group name is required.' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO groups (user_id, group_name, description) VALUES ($1, $2, $3) RETURNING id, user_id, group_name, description, signal_group_id, link_token, link_token_expires_at, bot_linked_at, created_at',
      [userId, group_name, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[POST /api/groups] Error creating group:', error);
    res.status(500).json({ message: 'Error creating group.' });
  }
});

// Update group (only name and description)
router.put('/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const { group_name, description } = req.body; // Only take these fields from the body
  const userId = req.user.id;

  if (!group_name) {
    return res.status(400).json({ message: 'Group name is required.' });
  }

  try {
    const result = await pool.query(
      'UPDATE groups SET group_name = $1, description = $2 WHERE id = $3 AND user_id = $4 RETURNING id, user_id, group_name, description, signal_group_id, link_token, link_token_expires_at, bot_linked_at, created_at',
      [group_name, description || null, groupId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found or access denied.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`[PUT /api/groups/${groupId}] Error updating group:`, error);
    res.status(500).json({ message: 'Error updating group.' });
  }
});

// Delete group
router.delete('/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  try {
    // First, delete associated webhooks (or DB handles this via CASCADE if configured)
    // Explicitly here for safety:
    await pool.query('DELETE FROM webhooks WHERE group_id = $1', [groupId]);
    
    const result = await pool.query(
      'DELETE FROM groups WHERE id = $1 AND user_id = $2 RETURNING id',
      [groupId, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Group not found or access denied.' });
    }
    res.status(200).json({ message: 'Group and associated webhooks deleted successfully.' });
  } catch (error) {
    console.error(`[DELETE /api/groups/${groupId}] Error deleting group:`, error);
    res.status(500).json({ message: 'Error deleting group.' });
  }
});

router.get('/:groupId/webhooks', async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id; 
  console.log(`[DEBUG] GET /api/groups/${groupId}/webhooks called. UserId: ${userId}`);
  try {
    const groupCheck = await pool.query('SELECT id FROM groups WHERE id = $1 AND user_id = $2', [groupId, userId]);
    if (groupCheck.rows.length === 0) {
      console.log(`[DEBUG] Group ${groupId} not found or no access for user ${userId}`);
      return res.status(404).json({ message: 'Group not found or access denied.' });
    }
    console.log(`[DEBUG] Searching webhooks for group ${groupId}`);
    const webhooksResult = await pool.query(
      'SELECT id, group_id, webhook_token, description, is_active, created_at FROM webhooks WHERE group_id = $1 ORDER BY created_at DESC',
      [groupId]
    );
    console.log(`[DEBUG] Webhooks found:`, webhooksResult.rows);
    res.json(webhooksResult.rows);
  } catch (error) {
    console.error(`[GET /api/groups/${groupId}/webhooks] Error fetching webhooks:`, error);
    res.status(500).json({ message: 'Error fetching webhooks for the group.' });
  }
});

// Create webhook for a group
router.post('/:groupId/webhooks', async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id; // This userId must go into the DB
  const { description } = req.body;

  if (!process.env.BASE_URL) {
    console.error('[POST /:groupId/webhooks] BASE_URL is not defined in .env.');
    return res.status(500).json({ message: 'Server configuration error: Base URL not set up.' });
  }

  try {
    // 1. Check if the group belongs to the user (remains important)
    const groupCheck = await pool.query('SELECT id FROM groups WHERE id = $1 AND user_id = $2', [groupId, userId]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found or access denied.' });
    }

    // 2. Generate webhook token
    const webhookToken = crypto.randomBytes(24).toString('hex');

    // 3. Save webhook to DB - NOW WITH user_id
    const newWebhookResult = await pool.query(
      'INSERT INTO webhooks (group_id, user_id, webhook_token, description, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, webhook_token, description, is_active, created_at',
      [groupId, userId, webhookToken, description || null, true] // userId added here
    );

    const newWebhook = newWebhookResult.rows[0];

    // 4. Assemble complete webhook URL
    const baseUrl = process.env.BASE_URL.endsWith('/') ? process.env.BASE_URL : `${process.env.BASE_URL}/`;
    const webhookUrl = `${baseUrl}webhook/${newWebhook.webhook_token}`;

    console.log(`[Webhook created] New webhook for group ${groupId}, user ${userId} with token ${newWebhook.webhook_token}`);

    // 5. Send back new webhook (incl. URL)
    res.status(201).json({
      ...newWebhook,
      webhook_url: webhookUrl
    });

  } catch (error) {
    console.error(`[POST /api/groups/${groupId}/webhooks] Error creating webhook:`, error);
    res.status(500).json({ message: 'Internal server error creating webhook.' });
  }
});

module.exports = router; 