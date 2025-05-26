const net = require('net');
require('dotenv').config({ path: '../.env' }); // Ensures .env is loaded from the backend root

const SIGNAL_CLI_HOST = process.env.SIGNAL_CLI_HOST || 'localhost';
const SIGNAL_CLI_PORT = parseInt(process.env.SIGNAL_CLI_PORT || '7446', 10);
const BOT_NUMBER = process.env.BOT_NUMBER; // Your Signalcow phone number, e.g., +4915678470953

let requestIdCounter = 1;
let messageListenerClient = null;
let messageHandlerCallback = null;
let reconnectTimeoutId = null;
const RECONNECT_DELAY = 5000; // 5 seconds until reconnection attempt

/**
 * Sends a JSON-RPC request to the signal-cli socket.
 * @param {object} requestObject The JSON-RPC request object.
 * @returns {Promise<object>} The parsed JSON-RPC response object.
 */
function sendRpcRequest(requestObject) {
  return new Promise((resolve, reject) => {
    let responseData = ''; // Explicitly initialized here at the beginning of the Promise callback
    const client = new net.Socket();

    // console.log(`[sendRpcRequest] Initialized responseData: '${responseData}'`);

    client.connect(SIGNAL_CLI_PORT, SIGNAL_CLI_HOST, () => {
      const requestString = JSON.stringify(requestObject) + '\n';
      client.write(requestString);
    });

    client.on('data', (data) => {
      // console.log(`[sendRpcRequest] client.on('data'): current responseData before append: '${responseData}'`);
      try {
        responseData += data.toString(); // The error occurred here
      } catch (e) {
        console.error('[sendRpcRequest] Error during responseData concatenation:', e);
        reject(e); // Abort on error here
        client.end();
        return;
      }
      // console.log(`[sendRpcRequest] client.on('data'): responseData after append: '${responseData}'`);

      if (responseData.includes('\n')) {
        try {
          const singleResponse = responseData.substring(0, responseData.indexOf('\n') + 1).trim();
          if (singleResponse) {
            const parsedResponse = JSON.parse(singleResponse);
            resolve(parsedResponse);
            client.end();
          }
        } catch (error) {
          if (responseData.includes('\n')) {
            reject(new Error('Invalid JSON response from signal-cli: ' + responseData));
            client.end();
          }
        }
      }
    });

    client.on('close', () => {
      // No more reject here, as resolve/reject should happen in the 'data' or 'error' handler
    });

    client.on('error', (err) => {
      console.error('Socket error with signal-cli:', err);
      reject(err);
      client.destroy();
    });

    client.setTimeout(15000); // Timeout increased to 15 seconds
    client.on('timeout', () => {
      reject(new Error('Timeout during request to signal-cli'));
      client.end();
    });
  });
}

/**
 * Sends a message via signal-cli.
 * @param {string} recipientGroupId The Signal group ID.
 * @param {string} message The text to send.
 * @returns {Promise<object>} The result of the send operation from signal-cli.
 */
async function sendMessage(recipientGroupId, message) {
  if (!BOT_NUMBER) {
    throw new Error('BOT_NUMBER is not configured in the .env file.');
  }

  let finalSignalGroupId = null;

  if (recipientGroupId && typeof recipientGroupId === 'string' && recipientGroupId.trim() !== '') {
    try {
      const hexGroupId = recipientGroupId.replace(/-/g, '');

      if (/^[0-9a-fA-F]{32}$/.test(hexGroupId)) { // Is it a 32-character hex UUID?
        const groupIdBytes = Buffer.from(hexGroupId, 'hex');
        finalSignalGroupId = groupIdBytes.toString('base64');
        console.log(`[signalService] UUID '${recipientGroupId}' was encoded to Base64 (bytes): ${finalSignalGroupId}`);
      } else if (/^[a-zA-Z0-9+/=]+$/.test(recipientGroupId)) { // Checks if it ONLY contains Base64 characters
        let decodedBuffer;
        try {
          decodedBuffer = Buffer.from(recipientGroupId, 'base64');
        } catch (e) {
          throw new Error(`Error during Base64 decoding of '${recipientGroupId}': ${e.message}`);
        }

        if (decodedBuffer && (decodedBuffer.length === 16 || decodedBuffer.length === 32)) {
          if (decodedBuffer.toString('base64') === recipientGroupId) {
            finalSignalGroupId = recipientGroupId;
            console.log(`[signalService] groupId '${recipientGroupId}' is treated as an already correct Base64 string (${decodedBuffer.length} bytes decoded).`);
          } else {
             throw new Error(`The provided group ID '${recipientGroupId}' appears to be Base64, but round-trip encoding failed. Please check the ID.`);
          }
        } else {
          throw new Error(`The provided group ID '${recipientGroupId}' is Base64, but does not decode to 16 or 32 bytes (length: ${decodedBuffer ? decodedBuffer.length : 'unknown'}).`);
        }
      } else {
        throw new Error(`The provided group ID '${recipientGroupId}' could not be interpreted as a valid Signal group ID (hex UUID or matching Base64 string).`);
      }
    } catch (e) {
      console.error('[signalService] Error processing/encoding groupId:', e.message);
      // Rethrow the already generated error or a new general error
      throw e instanceof Error && e.message.startsWith('The provided group ID') ? e : new Error(`Error processing group ID: ${e.message}`);
    }
  } else if (recipientGroupId && (typeof recipientGroupId !== 'string' || recipientGroupId.trim() === '')) {
    throw new Error('Group ID must be a non-empty string.');
  }

  if (!finalSignalGroupId) {
    console.error('[signalService] Could not derive a valid finalSignalGroupId or recipientGroupId was not provided.');
    throw new Error('No valid Signal group ID available for sending or the ID was empty.');
  }

  const request = {
    jsonrpc: '2.0',
    id: requestIdCounter++,
    method: 'send',
    params: {
      recipient: [],
      groupId: finalSignalGroupId,
      message: message,
      account: BOT_NUMBER,
    },
  };

  console.log(`Sending JSON-RPC to signal-cli: Method 'send', Account '${BOT_NUMBER}', Group '${finalSignalGroupId}', Message: '${message}'`);

  try {
    const response = await sendRpcRequest(request);
    console.log('Response from signal-cli (send):', response);
    if (response.error) {
      throw new Error(`signal-cli error: ${response.error.message} (Code: ${response.error.code})`);
    }
    return response.result;
  } catch (error) {
    console.error('Error in signalService.sendMessage:', error.message);
    throw error;
  }
}

/**
 * Lists all groups the bot is a member of.
 * @returns {Promise<Array<{id: string, name: string, internal_id: string}>>} A list of group objects.
 */
async function listSignalGroups() {
  if (!BOT_NUMBER) {
    throw new Error('BOT_NUMBER is not configured in the .env file.');
  }

  const request = {
    jsonrpc: '2.0',
    id: requestIdCounter++,
    method: 'listGroups',
    params: {
      account: BOT_NUMBER,
    },
  };

  console.log(`Sending JSON-RPC to signal-cli: Method 'listGroups', Account '${BOT_NUMBER}'`);

  try {
    // Important: listGroups can take a while and return a lot of data.
    // sendRpcRequest might need adjustment if it only expects single lines.
    // For listGroups, we expect a single, complete JSON array response.
    const response = await sendRpcRequest(request); // Assumption: sendRpcRequest can handle array responses
    console.log('Response from signal-cli (listGroups):', response);

    if (response.error) {
      throw new Error(`signal-cli error with listGroups: ${response.error.message} (Code: ${response.error.code})`);
    }

    // The response from listGroups is directly an array of group objects.
    // Each object should contain fields like 'id' (the internal ID of the group), 'name' (the display name),
    // and 'groupId' (the Base64 ID for sending).
    // We need to ensure we use the correct ID for sending.
    // Typically, the 'groupId' field in the response is what we need.
    if (response.result && Array.isArray(response.result.groups)) {
      return response.result.groups.map(group => ({
        id: group.groupId, // The Base64 ID for sending
        name: group.name || 'Unnamed Group', // Fallback for groups without a name
        internal_id: group.id // The internal ID, e.g., group.RandomChars==
      }));
    } else {
      console.warn('[signalService] listGroups returned invalid result or was not an array. Response:', response);
      // Try to log the structure of response.result to understand the problem
      if (response.result) {
        console.log('[signalService] Structure of response.result:', JSON.stringify(response.result, null, 2));
        if (Array.isArray(response.result)) { // Sometimes response.result is directly the array
             return response.result.map(group => ({
                id: group.groupId, 
                name: group.name || 'Unnamed Group', 
                internal_id: group.id 
            }));
        }
      }
      return []; // Empty array as fallback
    }
  } catch (error) {
    console.error('Error in signalService.listSignalGroups:', error.message);
    throw error;
  }
}

/**
 * Builds a persistent connection to signal-cli and listens for incoming messages.
 * Calls the messageHandlerCallback for each received message.
 */
function connectAndListen() {
  if (messageListenerClient && messageListenerClient.connecting) {
    console.log('[signalService-listener] Connection is already being established.');
    return;
  }

  if (messageListenerClient && !messageListenerClient.destroyed) {
    console.log('[signalService-listener] Existing connection will be terminated first.');
    messageListenerClient.destroy();
  }

  console.log(`[signalService-listener] Trying to establish connection to signal-cli: ${SIGNAL_CLI_HOST}:${SIGNAL_CLI_PORT}`);
  messageListenerClient = new net.Socket();
  let accumulatedData = '';

  messageListenerClient.connect(SIGNAL_CLI_PORT, SIGNAL_CLI_HOST, () => {
    console.log('[signalService-listener] Successfully connected to signal-cli for incoming messages.');
    // Here we could instruct signal-cli to send messages if needed and supported.
    // e.g., a subscribe command if signal-cli supports it for JSON-RPC.
    // For now, we assume the daemon automatically pushes messages.
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }
  });

  messageListenerClient.on('data', (data) => {
    accumulatedData += data.toString();
    let newlineIndex;
    while ((newlineIndex = accumulatedData.indexOf('\n')) >= 0) {
      const singleMessage = accumulatedData.substring(0, newlineIndex).trim();
      accumulatedData = accumulatedData.substring(newlineIndex + 1);

      if (singleMessage) {
        try {
          const parsedMessage = JSON.parse(singleMessage);
          if (messageHandlerCallback) {
            messageHandlerCallback(parsedMessage);
          }
        } catch (error) {
          console.error('[signalService-listener] Error parsing JSON message from signal-cli:', error, 'Message:', singleMessage);
        }
      }
    }
  });

  messageListenerClient.on('close', (hadError) => {
    console.log('[signalService-listener] Connection to signal-cli closed.', hadError ? 'Due to an error.' : 'Normal.');
    messageListenerClient.destroy(); // Free resources
    messageListenerClient = null;
    if (!reconnectTimeoutId) { // Only reconnect if no timeout is already running
      console.log(`[signalService-listener] Next reconnection attempt in ${RECONNECT_DELAY / 1000}s`);
      reconnectTimeoutId = setTimeout(() => {
        reconnectTimeoutId = null; // Reset timeout-ID before connectAndListen is called
        connectAndListen();
      }, RECONNECT_DELAY);
    }
  });

  messageListenerClient.on('error', (err) => {
    console.error('[signalService-listener] Socket error with signal-cli:', err.message);
    // The 'close' handler is also triggered, which starts the reconnect mechanism.
    // messageListenerClient.destroy(); // Implied by 'close' or the error itself
  });

  messageListenerClient.setTimeout(0); // No timeout for the persistent connection
  messageListenerClient.on('timeout', () => {
    // Should not occur with setTimeout(0), but for safety:
    console.warn('[signalService-listener] Unexpected timeout during persistent connection.');
    messageListenerClient.destroy(); // Triggers 'close' and thus the reconnect.
  });
}

/**
 * Starts the process of listening for incoming Signal messages.
 * @param {function} callback The function to call for each received message.
 */
function startListeningForMessages(callback) {
  if (!BOT_NUMBER) {
    console.error('[signalService-listener] BOT_NUMBER not configured. Message reception not started.');
    return;
  }
  if (typeof callback !== 'function') {
    console.error('[signalService-listener] Invalid callback passed. Message reception not started.');
    return;
  }
  messageHandlerCallback = callback;
  console.log('[signalService] Starting listener for incoming messages...');
  connectAndListen();
}

module.exports = { sendMessage, listSignalGroups, startListeningForMessages }; 