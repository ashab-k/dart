/**
 * sseManager.js — DART Backend
 *
 * Manages a module-level array of SSE (Server-Sent Events) client
 * controllers. The /api/alerts/stream route adds controllers on connect
 * and removes them on close.
 *
 * broadcastAlert(alert) writes a JSON event to all connected clients.
 */

// Module-level array of ReadableStreamDefaultController instances
const sseClients = [];

/**
 * Register a new SSE client controller.
 */
function addClient(controller) {
  sseClients.push(controller);
  console.log(`[SSE] Client connected. Total clients: ${sseClients.length}`);
}

/**
 * Remove a disconnected SSE client controller.
 */
function removeClient(controller) {
  const index = sseClients.indexOf(controller);
  if (index !== -1) {
    sseClients.splice(index, 1);
  }
  console.log(`[SSE] Client disconnected. Total clients: ${sseClients.length}`);
}

/**
 * Broadcast a StandardAlert to all connected SSE clients.
 * Each event is formatted as "data: {json}\n\n" per the SSE spec.
 */
function broadcastAlert(alert) {
  const payload = `data: ${JSON.stringify(alert)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(payload);

  for (const controller of sseClients) {
    try {
      controller.enqueue(encoded);
    } catch (err) {
      // Client may have disconnected — remove silently
      console.error("[SSE] Failed to send to client:", err.message);
      removeClient(controller);
    }
  }
}

module.exports = { addClient, removeClient, broadcastAlert };
