/**
 * store.js — DART Backend
 *
 * File-based alert storage using src/data/alerts.json.
 * Provides appendAlert(alert) and getAlerts() functions.
 *
 * Uses a simple async mutex flag to handle concurrency safely.
 * Initializes alerts.json with [] if the file doesn't exist.
 */

const fs = require("fs/promises");
const path = require("path");

// Path to the alerts data file
const DATA_DIR = path.join(process.cwd(), "src", "data");
const ALERTS_FILE = path.join(DATA_DIR, "alerts.json");

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
 * Creates them with an empty array if missing.
 */
async function ensureFile() {
  try {
    await fs.access(ALERTS_FILE);
  } catch {
    // File doesn't exist — create directory and initialize
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(ALERTS_FILE, "[]", "utf-8");
  }
}

/**
 * Read and return all stored alerts as a parsed array.
 */
async function getAlerts() {
  await ensureFile();
  try {
    const raw = await fs.readFile(ALERTS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Append a new alert object to the alerts.json file.
 * Uses mutex to prevent concurrent write corruption.
 */
async function appendAlert(alert) {
  await acquireLock();
  try {
    await ensureFile();
    const alerts = await getAlerts();
    alerts.push(alert);
    await fs.writeFile(ALERTS_FILE, JSON.stringify(alerts, null, 2), "utf-8");
  } finally {
    releaseLock();
  }
}

module.exports = { getAlerts, appendAlert };
