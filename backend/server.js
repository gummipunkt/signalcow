const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const pool = require('./config/db'); // Imports the DB pool
const signalService = require('./services/signalService'); // Imports our Signal Service
const { authenticateToken } = require('./middleware/authMiddleware');
const groupRoutes = require('./routes/groupRoutes'); // Temporarily commented out
const webhookRoutes = require('./routes/webhookRoutes'); // Temporarily commented out

// Swagger / OpenAPI
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();

const port = process.env.PORT || 3001;

// Middleware for parsing JSON bodies (global for the app)
app.use(express.json());
// Middleware for parsing plain text bodies (will be used specifically or globally if needed)
app.use(express.text()); // Potentially apply this more selectively if it causes issues elsewhere

// Swagger/OpenAPI Configuration
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0', // Specification (optional, defaults to swagger: '2.0')
    info: {
      title: 'Signalcow Backend API',
      version: '1.0.0',
      description: 'API documentation for the Signalcow backend services',
    },
    servers: [ // Optional: Define your server URL
      {
        url: `http://localhost:${port}`, // Adjust if your server runs elsewhere or on HTTPS
        description: 'Development server'
      }
    ],
    // Optional: Add components like securitySchemes for JWT
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [{ // Optional: Apply security globally
      bearerAuth: []
    }]
  },
  // Path to the API docs
  // Note: glob pattern might need adjustment based on your project structure
  apis: ['./routes/*.js'], // Glob pattern to find API docs in JSDoc format
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Test database connection (optional)
async function testDbConnection() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL database!');
    const res = await client.query('SELECT NOW()');
    console.log('Current time from DB:', res.rows[0].now);
    client.release(); 
  } catch (err) {
    console.error('Error connecting to PostgreSQL database:', err.stack);
  }
}
// testDbConnection(); // Commented out for now to keep startup logs clean

// API Routes
const authRoutes = require('./routes/auth'); // Temporarily commented out
// const adminRoutes = require('./routes/admin'); // Old admin routes (HTML serving)
const adminApiRoutes = require('./routes/adminApiRoutes'); // New JSON API admin routes

app.use('/api/auth', authRoutes); // Temporarily commented out
// app.use('/admin', adminRoutes); // Mount old admin routes - REMOVED
app.use('/api/admin', adminApiRoutes); // Mount new JSON API admin routes

app.use('/api/groups', authenticateToken, groupRoutes); // Temporarily commented out
app.use('/api/webhooks', authenticateToken, webhookRoutes); // Temporarily commented out

// Webhook execution endpoint
app.post('/webhook/:webhookToken', async (req, res) => {
  const { webhookToken } = req.params;
  
  // Temporäres Logging:
  console.log(`Webhook ${webhookToken} called.`);
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Raw Request Body Type:', typeof req.body);
  console.log('Raw Request Body:', JSON.stringify(req.body, null, 2));

  let textToSend = null;

  // Check if body is a string (from express.text())
  if (typeof req.body === 'string' && req.body.trim() !== '') {
    textToSend = req.body.trim();
    console.log('[Webhook] Received text/plain body:', textToSend);
  } 
  // Check if body is an object (from express.json()) and has text/message property
  else if (typeof req.body === 'object' && req.body !== null) {
    if (req.body.text && typeof req.body.text === 'string' && req.body.text.trim() !== '') {
      textToSend = req.body.text.trim();
      console.log('[Webhook] Received JSON body with text field:', textToSend);
    } else if (req.body.message && typeof req.body.message === 'string' && req.body.message.trim() !== '') {
      textToSend = req.body.message.trim();
      console.log('[Webhook] Received JSON body with message field:', textToSend);
    }
  }

  if (!textToSend) {
    console.log(`Webhook ${webhookToken} called without usable text in body (checked for plain text and JSON with text/message field).`);
    return res.status(400).json({ message: 'No message text found in request body (expected plain text or JSON with text/message field).' });
  }

  try {
    const webhookResult = await pool.query(
      'SELECT w.id, w.is_active, w.group_id, g.signal_group_id, g.bot_phone_number ' +
      'FROM webhooks w JOIN groups g ON w.group_id = g.id ' +
      'WHERE w.webhook_token = $1',
      [webhookToken]
    );

    if (webhookResult.rows.length === 0) {
      return res.status(404).json({ message: 'Webhook not found.' });
    }

    const webhook = webhookResult.rows[0];

    if (!webhook.is_active) {
      return res.status(403).json({ message: 'Webhook is inactive.' });
    }

    if (!webhook.signal_group_id) {
      console.error(`Webhook ${webhookToken} has no signal_group_id in the DB.`);
      return res.status(400).json({ message: 'No Signal group ID configured for this webhook.' });
    }
    
    // Send message via signalService
    // The bot_phone_number from the DB is not used directly here, as signalService
    // uses the configured BOT_NUMBER. This could be adjusted if different bot numbers
    // per group/webhook should be possible and passed to signalService.
    await signalService.sendMessage(webhook.signal_group_id, textToSend);
    
    res.status(200).json({ 
      message: 'Webhook received successfully and message sent to Signal.',
      details: {
        webhookToken: webhookToken,
        signalGroupId: webhook.signal_group_id,
        messageSent: textToSend
      }
    });

  } catch (error) {
    console.error(`Error during webhook execution (${webhookToken}):`, error.message);
    // More detailed error message to the client if it was a signal-cli error
    if (error.message && error.message.startsWith('signal-cli error')) { // Assuming 'signal-cli error' is a specific prefix you use
        return res.status(502).json({ message: 'Error communicating with the Signal service.', details: error.message });
    }
    res.status(500).json({ message: 'Internal server error during webhook execution.' });
  }
});

// Route to fetch Signal groups
app.get('/api/signal/groups', authenticateToken, async (req, res) => {
  try {
    const groups = await signalService.listSignalGroups();
    res.json(groups);
  } catch (error) {
    console.error('[GET /api/signal/groups] Error fetching Signal groups:', error.message);
    res.status(500).json({ message: 'Error fetching Signal groups from signal-cli.', details: error.message });
  }
});

// Global Error Handler (example)
app.use((err, req, res, next) => {
  console.error("[Global Error Handler]",err.stack);
  res.status(500).send('Something broke!');
});

app.get('/', (req, res) => {
  res.send('Hello from Signalcow Backend!');
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
  
  signalService.startListeningForMessages(async (message) => {
    // console.log('[SignalMsgHandler] Raw message from signal-cli:', JSON.stringify(message, null, 2));

    try {
      if (message && message.method === 'receive' && message.params && message.params.envelope) {
        const envelope = message.params.envelope;
        
        // Is it a data message with text and group info?
        if (envelope.dataMessage && envelope.dataMessage.message && envelope.dataMessage.groupInfo && envelope.dataMessage.groupInfo.groupId) {
          const receivedText = envelope.dataMessage.message.trim();
          const signalGroupId = envelope.dataMessage.groupInfo.groupId;
          const sourceNumber = envelope.sourceNumber; // Sender's number of the !link message

          if (receivedText.startsWith('!link ')) {
            const linkToken = receivedText.substring(6).trim(); // Extract token
            console.log(`[LinkHandler] Received link attempt: Token '${linkToken}' from group ${signalGroupId} by ${sourceNumber}`);

            if (!linkToken) {
              console.log('[LinkHandler] Empty token received.');
              // Optional: Message to group that the token is missing.
              return;
            }

            // Search for token in DB
            const tokenSearch = await pool.query(
              'SELECT id, user_id, group_name, link_token_expires_at FROM groups WHERE link_token = $1',
              [linkToken]
            );

            if (tokenSearch.rows.length > 0) {
              const groupToLink = tokenSearch.rows[0];
              const now = new Date();
              const expiresAt = new Date(groupToLink.link_token_expires_at);

              if (expiresAt > now) {
                // Token is valid and not expired
                await pool.query(
                  'UPDATE groups SET signal_group_id = $1, link_token = NULL, link_token_expires_at = NULL, bot_linked_at = NOW() WHERE link_token = $2',
                  [signalGroupId, linkToken]
                );
                console.log(`[LinkHandler] Group '${groupToLink.group_name}' (ID: ${groupToLink.id}) successfully linked with Signal group ${signalGroupId}.`);
                
                // Send confirmation message to the Signal group
                try {
                  await signalService.sendMessage(signalGroupId, `The bot group '${groupToLink.group_name}' has been successfully linked with this Signal chat.`);
                } catch (sendError) {
                  console.error('[LinkHandler] Error sending confirmation message:', sendError.message);
                }
              } else {
                // Token expired
                console.log(`[LinkHandler] Expired token '${linkToken}' received for group '${groupToLink.group_name}'.`);
                try {
                  await signalService.sendMessage(signalGroupId, `The link token '${linkToken}' has expired. Please generate a new token in the web application.`);
                } catch (sendError) {
                  console.error('[LinkHandler] Error sending message about expired token:', sendError.message);
                }
                // Optional: Remove the expired token from the DB if not already removed by the UPDATE above
                // await pool.query('UPDATE groups SET link_token = NULL, link_token_expires_at = NULL WHERE link_token = $1', [linkToken]); 
              }
            } else {
              // Token not found in DB
              console.log(`[LinkHandler] Invalid or unknown link token '${linkToken}' received from group ${signalGroupId}.`);
              // Optional: Message to group that token is invalid. But be careful about spamming on incorrect entries.
            }
          }
        }
      }
    } catch (error) {
      console.error('[SignalMsgHandler] Error processing an incoming message:', error);
    }
  });
}); 
