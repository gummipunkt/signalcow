const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Our central DB pool
const { protect } = require('../middleware/authMiddleware'); // Our auth middleware
const { v4: uuidv4 } = require('uuid'); // For generating webhook tokens

// All endpoints here are protected and require a valid JWT
router.use(protect);

// GROUP ENDPOINTS

// POST /api/groups - Create a new group
router.post('/', async (req, res) => {
  const { group_name, description, signal_group_id, bot_phone_number } = req.body;
  const userId = req.user.id; // Comes from the protect middleware

  if (!group_name) {
    return res.status(400).json({ message: 'A group name is required.' });
  }

  try {
    // Optional: Check if a group with the same signal_group_id already exists (if signal_group_id was provided)
    if (signal_group_id) {
      const existingGroup = await pool.query('SELECT id FROM groups WHERE signal_group_id = $1 AND user_id != $2', [signal_group_id, userId]);
      if (existingGroup.rows.length > 0) {
        return res.status(409).json({ message: 'This Signal group ID is already in use by another user.' });
      }
    }

    const newGroup = await pool.query(
      'INSERT INTO groups (user_id, group_name, description, signal_group_id, bot_phone_number) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, group_name, description || null, signal_group_id || null, bot_phone_number || null]
    );

    res.status(201).json(newGroup.rows[0]);
  } catch (error) {
    console.error('Error creating group:', error);
    // Specific error for unique constraint violation on signal_group_id (if it should be globally unique)
    if (error.code === '23505' && error.constraint === 'groups_signal_group_id_key') {
        return res.status(409).json({ message: 'A group with this Signal group ID already exists globally.' });
    }
    res.status(500).json({ message: 'Internal server error creating group.' });
  }
});

// GET /api/groups - Get all groups of the logged-in user
router.get('/', async (req, res) => {
  const userId = req.user.id;

  try {
    const userGroups = await pool.query('SELECT * FROM groups WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(userGroups.rows);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Internal server error fetching groups.' });
  }
});

// GET /api/groups/:groupId - Get a single group of the logged-in user
router.get('/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    const groupResult = await pool.query('SELECT * FROM groups WHERE id = $1 AND user_id = $2', [groupId, userId]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found or does not belong to the user.' });
    }
    res.json(groupResult.rows[0]);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ message: 'Internal server error fetching group.' });
  }
});

// PUT /api/groups/:groupId - Update an existing group
router.put('/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  const { group_name, description, signal_group_id, bot_phone_number } = req.body;

  // Build the update statement dynamically to only update provided fields
  let updateFields = [];
  let queryParams = [];
  let paramIndex = 1;

  if (group_name !== undefined) {
    updateFields.push(`group_name = $${paramIndex++}`);
    queryParams.push(group_name);
  }
  if (description !== undefined) {
    updateFields.push(`description = $${paramIndex++}`);
    queryParams.push(description === '' ? null : description);
  }
  if (signal_group_id !== undefined) {
    updateFields.push(`signal_group_id = $${paramIndex++}`);
    queryParams.push(signal_group_id);
  }
  if (bot_phone_number !== undefined) {
    updateFields.push(`bot_phone_number = $${paramIndex++}`);
    queryParams.push(bot_phone_number);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ message: 'No fields provided for update.' });
  }

  updateFields.push(`updated_at = current_timestamp`); // Always update updated_at

  queryParams.push(groupId); // for WHERE id = $X
  queryParams.push(userId);  // for WHERE user_id = $Y

  const updateQuery = `UPDATE groups SET ${updateFields.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} RETURNING *`;

  try {
    // Additional check if the new signal_group_id is already used by ANOTHER user
    if (signal_group_id) {
        const existingGroup = await pool.query(
            'SELECT id FROM groups WHERE signal_group_id = $1 AND user_id != $2 AND id != $3',
            [signal_group_id, userId, groupId]
        );
        if (existingGroup.rows.length > 0) {
            return res.status(409).json({ message: 'This Signal group ID is already in use by another user.' });
        }
    }

    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found or does not belong to the user.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating group:', error);
    if (error.code === '23505' && error.constraint === 'groups_signal_group_id_key') {
        return res.status(409).json({ message: 'A group with this (new) Signal group ID already exists globally.' });
    }
    res.status(500).json({ message: 'Internal server error updating group.' });
  }
});

// DELETE /api/groups/:groupId - Delete a group
router.delete('/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    // First, check if the group belongs to the user
    const groupCheck = await pool.query('SELECT id FROM groups WHERE id = $1 AND user_id = $2', [groupId, userId]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found or does not belong to the user.' });
    }

    // If webhooks are linked to the group, they must be deleted first or the link removed,
    // depending on how database constraints (ON DELETE CASCADE etc.) are set.
    // For this example, we delete dependent webhooks first.
    await pool.query('DELETE FROM webhooks WHERE group_id = $1 AND user_id = $2', [groupId, userId]);

    // Then delete the group
    await pool.query('DELETE FROM groups WHERE id = $1 AND user_id = $2', [groupId, userId]);

    res.json({ message: 'Group and associated webhooks deleted successfully.' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ message: 'Internal server error deleting group.' });
  }
});

// WEBHOOK ENDPOINTS (related to a group)

// POST /api/groups/:groupId/webhooks - Create a new webhook for a group
router.post('/:groupId/webhooks', async (req, res) => {
  const { groupId } = req.params;
  const { description } = req.body;
  const userId = req.user.id;

  try {
    // Check if the group belongs to the user
    const groupCheck = await pool.query('SELECT id FROM groups WHERE id = $1 AND user_id = $2', [groupId, userId]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found or does not belong to the user.' });
    }

    const webhookToken = uuidv4();

    const newWebhook = await pool.query(
      'INSERT INTO webhooks (group_id, user_id, webhook_token, description) VALUES ($1, $2, $3, $4) RETURNING id, webhook_token, is_active, description, created_at',
      [groupId, userId, webhookToken, description || null]
    );

    // Assemble the full webhook URL (example)
    const fullWebhookUrl = `${req.protocol}://${req.get('host')}/webhook/${webhookToken}`;

    res.status(201).json({ 
      ...newWebhook.rows[0],
      webhook_url: fullWebhookUrl // Inform the client of the constructed URL
    });

  } catch (error) {
    console.error('Error creating webhook:', error);
    // Specific error for unique constraint violation on webhook_token (extremely unlikely with UUIDv4, but for safety)
    if (error.code === '23505' && error.constraint === 'webhooks_webhook_token_key') {
        return res.status(500).json({ message: 'Error creating webhook token. Please try again.' });
    }
    res.status(500).json({ message: 'Internal server error creating webhook.' });
  }
});

// GET /api/groups/:groupId/webhooks - Get all webhooks for a specific group of the user
router.get('/:groupId/webhooks', async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    // Check if the group belongs to the user
    const groupCheck = await pool.query('SELECT id FROM groups WHERE id = $1 AND user_id = $2', [groupId, userId]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found or does not belong to the user.' });
    }

    const groupWebhooks = await pool.query(
      'SELECT id, webhook_token, is_active, description, created_at FROM webhooks WHERE group_id = $1 AND user_id = $2 ORDER BY created_at DESC',
      [groupId, userId]
    );
    res.json(groupWebhooks.rows);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ message: 'Internal server error fetching webhooks.' });
  }
});

// DELETE /api/groups/:groupId/webhooks/:webhookId - Delete a webhook
// Alternatively: DELETE /api/webhooks/:webhookId (if webhookId is globally unique enough and we don't need the groupId)
// We use here the more specific path
router.delete('/:groupId/webhooks/:webhookId', async (req, res) => {
    const { groupId, webhookId } = req.params;
    const userId = req.user.id;

    try {
        // Check if the webhook belongs to the group and to the user
        const webhookCheck = await pool.query(
            'SELECT id FROM webhooks WHERE id = $1 AND group_id = $2 AND user_id = $3',
            [webhookId, groupId, userId]
        );

        if (webhookCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Webhook not found or does not belong to the user/group.' });
        }

        await pool.query('DELETE FROM webhooks WHERE id = $1', [webhookId]);

        res.json({ message: 'Webhook deleted successfully.' });
    } catch (error) {
        console.error('Error deleting webhook:', error);
        res.status(500).json({ message: 'Internal server error deleting webhook.' });
    }
});

module.exports = router; 