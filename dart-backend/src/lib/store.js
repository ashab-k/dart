/**
 * store.js — DART Backend
 *
 * File-based alert storage using /app/src/data/alerts.json.
 * Uses an absolute path to ensure compatibility with Next.js
 * standalone mode and Docker volume mounts.
 *
 * Provides appendAlert(alert) and getAlerts() functions.
 * Uses a simple async mutex flag to handle concurrency safely.
 */

const fs = require("fs/promises");
const path = require("path");

// Use an absolute path that matches the Docker volume mount.
// In Docker: /app/src/data/alerts.json
// Locally: {cwd}/src/data/alerts.json
const DATA_DIR = path.resolve(process.cwd(), "src", "data");
const ALERTS_FILE = path.join(DATA_DIR, "alerts.json");

// Log the resolved path on first load for debugging
console.log(`[store] Alerts file path: ${ALERTS_FILE}`);

// Simple async mutex to avoid concurrent read/write corruption
let locked = false;

async function acquireLock() {
  while (locked) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  locked = true;
}

function releaseLock() {
  locked = false;
}

/**
 * Ensure the data directory and alerts.json file exist.
 */
async function ensureFile() {
  try {
    await fs.access(ALERTS_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(ALERTS_FILE, "[]", "utf-8");
  }
}

/**
 * Read and return all stored alerts as a parsed array.
 * Always reads fresh from disk (no caching).
 */
async function getAlerts() {
  await ensureFile();
  try {
    const raw = await fs.readFile(ALERTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error(`[store] Error reading alerts: ${err.message}`);
    return [];
  }
}

/**
 * Append a new alert object to the alerts.json file.
 */
async function appendAlert(alert) {
  await acquireLock();
  try {
    await ensureFile();
    const raw = await fs.readFile(ALERTS_FILE, "utf-8");
    const alerts = JSON.parse(raw);
    alerts.push(alert);
    await fs.writeFile(ALERTS_FILE, JSON.stringify(alerts, null, 2), "utf-8");
    console.log(`[store] Alert ${alert.id} saved. Total: ${alerts.length}`);
  } catch (err) {
    console.error(`[store] Error writing alert: ${err.message}`);
  } finally {
    releaseLock();
  }
}

module.exports = { getAlerts, appendAlert };
