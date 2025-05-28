const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const pool = require("../config/db");
const { authenticateToken } = require("../middleware/authMiddleware"); // Applied to the entire router instance in server.js

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Group management for authenticated users
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The auto-generated id of the group.
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: The id of the user who owns the group.
 *         group_name:
 *           type: string
 *           description: Name of the group.
 *         description:
 *           type: string
 *           nullable: true
 *           description: Optional description for the group.
 *         signal_group_id:
 *           type: string
 *           nullable: true
 *           description: Internal ID of the linked Signal group (if any).
 *         link_token:
 *           type: string
 *           nullable: true
 *           description: Token used for linking with a Signal group.
 *         link_token_expires_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Expiration timestamp for the link_token.
 *         bot_linked_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when the bot was successfully linked.
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp of group creation.
 *       example:
 *         id: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *         user_id: "b2c3d4e5-f6a7-8901-2345-678901bcdef0"
 *         group_name: "My Test Group"
 *         description: "This is a group for testing purposes."
 *         signal_group_id: "signalgroupid=="
 *         link_token: null
 *         link_token_expires_at: null
 *         bot_linked_at: "2023-05-15T10:30:00Z"
 *         created_at: "2023-05-15T09:00:00Z"
 *     Webhook:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the webhook.
 *         group_id:
 *           type: string
 *           format: uuid
 *           description: The id of the group this webhook belongs to.
 *         webhook_token:
 *           type: string
 *           description: The unique token for this webhook.
 *         description:
 *           type: string
 *           nullable: true
 *           description: Optional description for the webhook.
 *         is_active:
 *           type: boolean
 *           description: Whether the webhook is currently active.
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp of webhook creation.
 *         webhook_url:
 *           type: string
 *           format: url
 *           description: The full URL to call this webhook (returned on creation).
 *       example:
 *         id: 1
 *         group_id: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *         webhook_token: "f4df29f92879798a8e20470e5051555ac65dbee667af0a5f"
 *         description: "Order notifications webhook"
 *         is_active: true
 *         created_at: "2023-05-16T11:00:00Z"
 *         webhook_url: "http://localhost:3002/webhook/f4df29f92879798a8e20470e5051555ac65dbee667af0a5f"
 *     NewGroup:
 *       type: object
 *       required:
 *         - group_name
 *       properties:
 *         group_name:
 *           type: string
 *           description: Name for the new group.
 *           example: "Marketing Team"
 *         description:
 *           type: string
 *           nullable: true
 *           description: Optional description for the new group.
 *           example: "Group for all marketing related communications"
 *     NewWebhook:
 *       type: object
 *       properties:
 *         description:
 *           type: string
 *           nullable: true
 *           description: Optional description for the new webhook.
 *           example: "Notify on new leads"
 */

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Lists all groups for the authenticated user
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of groups.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Group'
 *       401:
 *         description: Unauthorized (token missing or invalid)
 *       500:
 *         description: Error fetching groups
 */

// List all groups of the authenticated user
router.get("/", async (req, res) => {
  const userId = req.user.id; // Set by authenticateToken middleware in server.js
  try {
    const result = await pool.query(
      "SELECT id, user_id, group_name, description, signal_group_id, link_token, link_token_expires_at, bot_linked_at, created_at FROM groups WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    res.json(result.rows);
  } catch (err) {
    if (err instanceof Error) {
      console.error("[GET /api/groups] Error fetching groups:", err.message);
    } else if (typeof err === 'string') {
      console.error("[GET /api/groups] Error fetching groups:", err);
    } else {
      console.error("[GET /api/groups] Error fetching groups: An unexpected error occurred");
    }
    res.status(500).json({ message: "Error fetching groups." });
  }
});

/**
 * @swagger
 * /api/groups/{groupId}:
 *   get:
 *     summary: Get a specific group by ID
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: The ID of the group to retrieve.
 *     responses:
 *       200:
 *         description: Details of the group.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found or access denied.
 *       500:
 *         description: Error fetching group.
 */

// Get a specific group of the authenticated user
router.get("/:groupId", async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id; // Set by authenticateToken middleware in server.js
  try {
    const result = await pool.query(
      "SELECT id, user_id, group_name, description, signal_group_id, link_token, link_token_expires_at, bot_linked_at, created_at FROM groups WHERE id = $1 AND user_id = $2",
      [groupId, userId],
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Group not found or access denied." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof Error) {
      console.error(`[GET /api/groups/${groupId}] Error fetching group:`, err.message);
    } else if (typeof err === 'string') {
      console.error(`[GET /api/groups/${groupId}] Error fetching group:`, err);
    } else {
      console.error(`[GET /api/groups/${groupId}] Error fetching group: An unexpected error occurred`);
    }
    res.status(500).json({ message: "Error fetching group." });
  }
});

/**
 * @swagger
 * /api/groups/{groupId}/link-token:
 *   post:
 *     summary: Generate a new link token for a group to connect with Signal.
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: The ID of the group for which to generate a link token.
 *     responses:
 *       200:
 *         description: Link token generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Link token generated successfully.
 *                 linkToken:
 *                   type: string
 *                   example: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
 *                 botNumber:
 *                   type: string
 *                   example: "+12345678900"
 *                 groupName:
 *                   type: string
 *                   example: "My Test Group"
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found or access denied.
 *       500:
 *         description: Server configuration error or internal server error generating link token.
 */

// Route to generate a link token for a group
router.post("/:groupId/link-token", async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id; // Set by authenticateToken middleware in server.js

  if (!process.env.BOT_NUMBER) {
    console.error(
      "[POST /:groupId/link-token] BOT_NUMBER is not defined in .env.",
    );
    return res
      .status(500)
      .json({ message: "Server configuration error: Bot number not set up." });
  }

  try {
    // 1. Check if the group belongs to the user and get the group name
    const groupCheck = await pool.query(
      "SELECT id, group_name FROM groups WHERE id = $1 AND user_id = $2",
      [groupId, userId],
    );
    if (groupCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Group not found or access denied." });
    }
    const groupName = groupCheck.rows[0].group_name;

    // 2. Generate token
    const linkToken = crypto.randomBytes(16).toString("hex");

    // 3. Set expiration date for the token (e.g., 1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // 4. Save token and expiration date in the DB
    const updateResult = await pool.query(
      "UPDATE groups SET link_token = $1, link_token_expires_at = $2 WHERE id = $3",
      [linkToken, expiresAt, groupId],
    );

    if (updateResult.rowCount === 0) {
      // Should not happen if groupCheck was successful, but as a safety net
      return res.status(500).json({ message: "Error saving link token." });
    }

    console.log(
      `[LinkToken] Token ${linkToken} for group ${groupName} (ID: ${groupId}) generated, valid until ${expiresAt.toISOString()}`,
    );

    // 5. Send back token and bot number
    res.json({
      message: "Link token generated successfully.",
      linkToken: linkToken,
      botNumber: process.env.BOT_NUMBER,
      groupName: groupName,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof Error) {
      console.error(
        `[POST /:groupId/link-token] Error generating link token for group ${groupId}:`,
        err.message,
      );
    } else if (typeof err === 'string') {
      console.error(
        `[POST /:groupId/link-token] Error generating link token for group ${groupId}:`,
        err,
      );
    } else {
      console.error(
        `[POST /:groupId/link-token] Error generating link token for group ${groupId}: An unexpected error occurred`,
      );
    }
    res
      .status(500)
      .json({ message: "Internal server error generating link token." });
  }
});

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewGroup'
 *     responses:
 *       201:
 *         description: Group created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       400:
 *         description: Group name is required.
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Error creating group.
 */

// Standard CRUD routes for groups

// Create group
router.post("/", async (req, res) => {
  const { group_name, description } = req.body;
  const userId = req.user.id;
  if (!group_name) {
    return res.status(400).json({ message: "Group name is required." });
  }
  try {
    const result = await pool.query(
      "INSERT INTO groups (user_id, group_name, description) VALUES ($1, $2, $3) RETURNING id, user_id, group_name, description, signal_group_id, link_token, link_token_expires_at, bot_linked_at, created_at",
      [userId, group_name, description || null],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof Error) {
      console.error("[POST /api/groups] Error creating group:", err.message);
    } else if (typeof err === 'string') {
      console.error("[POST /api/groups] Error creating group:", err);
    } else {
      console.error("[POST /api/groups] Error creating group: An unexpected error occurred");
    }
    res.status(500).json({ message: "Error creating group." });
  }
});

/**
 * @swagger
 * /api/groups/{groupId}:
 *   put:
 *     summary: Update an existing group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: The ID of the group to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewGroup' # Can reuse NewGroup if fields are the same for update
 *     responses:
 *       200:
 *         description: Group updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       400:
 *         description: Group name is required.
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found or access denied.
 *       500:
 *         description: Error updating group.
 */

// Update group (only name and description)
router.put("/:groupId", async (req, res) => {
  const { groupId } = req.params;
  const { group_name, description } = req.body; // Only take these fields from the body
  const userId = req.user.id;

  if (!group_name) {
    return res.status(400).json({ message: "Group name is required." });
  }

  try {
    const result = await pool.query(
      "UPDATE groups SET group_name = $1, description = $2 WHERE id = $3 AND user_id = $4 RETURNING id, user_id, group_name, description, signal_group_id, link_token, link_token_expires_at, bot_linked_at, created_at",
      [group_name, description || null, groupId, userId],
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Group not found or access denied." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof Error) {
      console.error(`[PUT /api/groups/${groupId}] Error updating group:`, err.message);
    } else if (typeof err === 'string') {
      console.error(`[PUT /api/groups/${groupId}] Error updating group:`, err);
    } else {
      console.error(`[PUT /api/groups/${groupId}] Error updating group: An unexpected error occurred`);
    }
    res.status(500).json({ message: "Error updating group." });
  }
});

/**
 * @swagger
 * /api/groups/{groupId}:
 *   delete:
 *     summary: Delete a group and its associated webhooks
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: The ID of the group to delete.
 *     responses:
 *       200:
 *         description: Group and associated webhooks deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Group and associated webhooks deleted successfully.
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found or access denied.
 *       500:
 *         description: An unexpected error occurred while deleting the group.
 */

// Delete group
router.delete("/:groupId", async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  try {
    // First, delete associated webhooks (or DB handles this via CASCADE if configured)
    // Explicitly here for safety:
    await pool.query("DELETE FROM webhooks WHERE group_id = $1", [groupId]);

    const result = await pool.query(
      "DELETE FROM groups WHERE id = $1 AND user_id = $2 RETURNING id",
      [groupId, userId],
    );
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Group not found or access denied." });
    }
    res
      .status(200)
      .json({ message: "Group and associated webhooks deleted successfully." });
  } catch (err) {
    let errorMessage = 'An unexpected error occurred while deleting the group.';
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === 'string') {
      errorMessage = err;
    }
    res.status(500).json({ message: errorMessage });
  }
});

/**
 * @swagger
 * /api/groups/{groupId}/webhooks:
 *   get:
 *     summary: List all webhooks for a specific group
 *     tags: [Groups, Webhooks] # Added Webhooks tag as well
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: The ID of the group whose webhooks to retrieve.
 *     responses:
 *       200:
 *         description: A list of webhooks for the group.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Webhook' 
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found or access denied.
 *       500:
 *         description: Error fetching webhooks for the group.
 */

router.get("/:groupId/webhooks", async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  console.log(
    `[DEBUG] GET /api/groups/${groupId}/webhooks called. UserId: ${userId}`,
  );
  try {
    const groupCheck = await pool.query(
      "SELECT id FROM groups WHERE id = $1 AND user_id = $2",
      [groupId, userId],
    );
    if (groupCheck.rows.length === 0) {
      console.log(
        `[DEBUG] Group ${groupId} not found or no access for user ${userId}`,
      );
      return res
        .status(404)
        .json({ message: "Group not found or access denied." });
    }
    console.log(`[DEBUG] Searching webhooks for group ${groupId}`);
    const webhooksResult = await pool.query(
      "SELECT id, group_id, webhook_token, description, is_active, created_at FROM webhooks WHERE group_id = $1 ORDER BY created_at DESC",
      [groupId],
    );
    console.log(`[DEBUG] Webhooks found:`, webhooksResult.rows);
    res.json(webhooksResult.rows);
  } catch (err) {
    if (err instanceof Error) {
      console.error(
        `[GET /api/groups/${groupId}/webhooks] Error fetching webhooks:`,
        err.message,
      );
    } else if (typeof err === 'string') {
      console.error(
        `[GET /api/groups/${groupId}/webhooks] Error fetching webhooks:`,
        err,
      );
    } else {
      console.error(
        `[GET /api/groups/${groupId}/webhooks] Error fetching webhooks: An unexpected error occurred`,
      );
    }
    res.status(500).json({ message: "Error fetching webhooks for the group." });
  }
});

/**
 * @swagger
 * /api/groups/{groupId}/webhooks:
 *   post:
 *     summary: Create a new webhook for a specific group
 *     tags: [Groups, Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: The ID of the group for which to create a webhook.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewWebhook'
 *     responses:
 *       201:
 *         description: Webhook created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Webhook' # Returns the full webhook object including URL
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found or access denied.
 *       500:
 *         description: Server configuration error or internal server error creating webhook.
 */

// Create webhook for a group
router.post("/:groupId/webhooks", async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id; // Used to verify group ownership
  const { description } = req.body;

  if (!process.env.BASE_URL) {
    console.error("[POST /:groupId/webhooks] BASE_URL is not defined in .env.");
    return res
      .status(500)
      .json({ message: "Server configuration error: Base URL not set up." });
  }

  try {
    // 1. Check if the group belongs to the user (remains important)
    const groupCheck = await pool.query(
      "SELECT id FROM groups WHERE id = $1 AND user_id = $2",
      [groupId, userId],
    );
    if (groupCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Group not found or access denied." });
    }

    // 2. Generate webhook token
    const webhookToken = crypto.randomBytes(24).toString("hex");

    // 3. Save webhook to DB with user_id
    const newWebhookResult = await pool.query(
      "INSERT INTO webhooks (group_id, webhook_token, description, is_active) VALUES ($1, $2, $3, $4) RETURNING id, webhook_token, description, is_active, created_at",
      [groupId, webhookToken, description || null, true],
    );

    const newWebhook = newWebhookResult.rows[0];

    // 4. Assemble complete webhook URL
    const baseUrl = process.env.BASE_URL.endsWith("/")
      ? process.env.BASE_URL
      : `${process.env.BASE_URL}/`;
    const webhookUrl = `${baseUrl}webhook/${newWebhook.webhook_token}`;

    console.log(
      `[Webhook created] New webhook for group ${groupId}, user ${userId} with token ${newWebhook.webhook_token}`,
    );

    // 5. Send back new webhook (incl. URL)
    res.status(201).json({
      ...newWebhook,
      webhook_url: webhookUrl,
    });
  } catch (err) {
    if (err instanceof Error) {
      console.error(
        `[POST /api/groups/${groupId}/webhooks] Error creating webhook:`,
        err.message,
      );
    } else if (typeof err === 'string') {
      console.error(
        `[POST /api/groups/${groupId}/webhooks] Error creating webhook:`,
        err,
      );
    } else {
      console.error(
        `[POST /api/groups/${groupId}/webhooks] Error creating webhook: An unexpected error occurred`,
      );
    }
    res
      .status(500)
      .json({ message: "Internal server error creating webhook." });
  }
});

module.exports = router;
