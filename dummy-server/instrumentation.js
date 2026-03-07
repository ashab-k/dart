/**
 * instrumentation.js — Dummy Server
 *
 * Next.js 14 server startup hook. Runs exactly once when the
 * server process starts. Used to initialize the anomaly detection
 * background job.
 */

export async function register() {
  // Only run on the server side (not during build or client-side)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDetector } = require("./src/lib/anomalyDetector");
    startDetector();
    console.log("[instrumentation] Anomaly detector started.");
  }
}
