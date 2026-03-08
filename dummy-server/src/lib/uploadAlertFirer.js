/**
 * uploadAlertFirer.js — Dummy Server
 *
 * Fires a malicious_upload alert to the DART backend
 * when an uploaded file contains malicious content (e.g. EICAR).
 *
 * De-duplicates by SHA256 hash — won't fire the same hash
 * more than once per 5 minutes.
 */

import { state, addLog } from "./state.js";

const firedHashes = new Set();

export async function fireUploadAlert(sourceIP, uploadRecord) {
  if (firedHashes.has(uploadRecord.sha256)) return;
  firedHashes.add(uploadRecord.sha256);

  const DART_BACKEND_URL =
    process.env.DART_BACKEND_URL || "http://localhost:3001";

  const payload = {
    source_ip: sourceIP,
    alert_type: "malicious_upload",
    request_rate: state.requestsPerMinute,
    anomaly_detected: true,
    file_name: uploadRecord.file_name,
    file_size: uploadRecord.file_size,
    sha256: uploadRecord.sha256,
    eicar_detected: uploadRecord.eicar_detected,
    upload_id: uploadRecord.id,
    raw_logs: state.logs.slice(-20),
  };

  try {
    addLog("INFO",
      `Firing malicious upload alert to DART for IP: ${sourceIP} file: ${uploadRecord.file_name}`
    );
    const res = await fetch(
      `${DART_BACKEND_URL}/api/alerts/ingest`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    addLog("INFO", `DART alert response: ${res.status}`);
  } catch (err) {
    addLog("ERROR",
      `Failed to send upload alert to DART: ${err.message}`
    );
  }

  // Allow same hash to re-trigger after 5 minutes
  setTimeout(() => {
    firedHashes.delete(uploadRecord.sha256);
  }, 300000);
}
