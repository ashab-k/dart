#!/usr/bin/env node

/**
 * upload-attack.js — Malicious File Upload Simulator
 *
 * Uploads files containing the EICAR test string to the dummy
 * server with spoofed X-Forwarded-For headers. The EICAR string
 * is completely harmless — just a text string — but every AV
 * engine on VirusTotal flags it as malicious.
 *
 * Usage: node scripts/upload-attack.js
 */

// ----- Configuration -----
const TARGET_URL =
  process.env.TARGET_URL || "http://localhost:3002/api/upload";
const UPLOADS_PER_ROUND = 3;
const ROUND_INTERVAL_MS = 5000;
const TOTAL_ROUNDS = 10;

const SPOOF_IPS = [
  "185.220.101.34",
  "45.142.212.100",
  "89.248.167.131",
  "198.235.24.130",
  "80.82.77.139",
];

// EICAR test string — harmless, flagged by every AV engine
const EICAR_PAYLOAD =
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}" +
  "$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

// Mix of EICAR files and clean files for realism
const PAYLOADS = [
  {
    name: "invoice.pdf.exe",
    content: EICAR_PAYLOAD,
    type: "application/octet-stream",
  },
  {
    name: "update.zip",
    content: EICAR_PAYLOAD,
    type: "application/zip",
  },
  {
    name: "readme.txt",
    content: "this is a clean file",
    type: "text/plain",
  },
  {
    name: "setup.exe",
    content: EICAR_PAYLOAD,
    type: "application/octet-stream",
  },
  {
    name: "report.docx",
    content: "clean document content",
    type: "application/vnd.openxmlformats",
  },
];

function randomSpoofIP() {
  return SPOOF_IPS[Math.floor(Math.random() * SPOOF_IPS.length)];
}

// ----- Stats -----
let totalUploads = 0;
let totalFlagged = 0;
let totalClean = 0;
let totalBlocked = 0;
let totalErrors = 0;
let roundNumber = 0;
let firstBlockLogged = false;
let payloadIdx = 0;

console.log("═".repeat(60));
console.log("  DART Malicious Upload Simulator");
console.log("═".repeat(60));
console.log(`  Target:     ${TARGET_URL}`);
console.log(`  Rounds:     ${TOTAL_ROUNDS} (${UPLOADS_PER_ROUND} uploads each)`);
console.log(`  Interval:   ${ROUND_INTERVAL_MS / 1000}s between rounds`);
console.log(`  Spoof IPs:  ${SPOOF_IPS.join(", ")}`);
console.log("═".repeat(60));
console.log("");

async function uploadFile(fileSpec) {
  const ip = randomSpoofIP();
  try {
    const formData = new FormData();
    const blob = new Blob([fileSpec.content], { type: fileSpec.type });
    formData.append("file", blob, fileSpec.name);

    const res = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "X-Forwarded-For": ip,
        "X-Real-IP": ip,
      },
      body: formData,
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 403) {
      return {
        success: true,
        status: 403,
        ip,
        file: fileSpec.name,
        flagged: false,
        blocked: true,
        sha256: null,
      };
    }

    const json = await res.json();
    return {
      success: true,
      status: res.status,
      ip,
      file: fileSpec.name,
      flagged: json.eicar_detected || false,
      blocked: false,
      sha256: json.sha256 || null,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      ip,
      file: fileSpec.name,
      flagged: false,
      blocked: false,
      sha256: null,
    };
  }
}

async function main() {
  console.log("  Upload attack started!\n");

  const startTime = Date.now();

  const interval = setInterval(async () => {
    roundNumber++;

    if (roundNumber > TOTAL_ROUNDS) {
      clearInterval(interval);
      printSummary();
      return;
    }

    // Pick UPLOADS_PER_ROUND files, cycling through payloads
    const uploads = [];
    for (let i = 0; i < UPLOADS_PER_ROUND; i++) {
      uploads.push(PAYLOADS[payloadIdx % PAYLOADS.length]);
      payloadIdx++;
    }

    // Upload in parallel
    const results = await Promise.all(uploads.map(uploadFile));

    let roundFlagged = 0;
    let roundClean = 0;
    let roundBlocked = 0;

    for (const r of results) {
      totalUploads++;

      if (!r.success) {
        totalErrors++;
        console.log(
          `  [UPLOAD] ${r.file} from ${r.ip} → ERROR: ${r.error}`
        );
        continue;
      }

      if (r.blocked) {
        totalBlocked++;
        roundBlocked++;
        if (!firstBlockLogged) {
          firstBlockLogged = true;
          console.log(
            "\n  [UPLOAD] ✓ IP blocked — DART file-quarantine playbook succeeded\n"
          );
        }
        console.log(
          `  [UPLOAD] ${r.file} from ${r.ip} → 403 BLOCKED`
        );
        continue;
      }

      if (r.flagged) {
        totalFlagged++;
        roundFlagged++;
        console.log(
          `  [UPLOAD] ⚠ Malicious file detected: ${r.file} from ${r.ip} — sha256=${r.sha256?.substring(0, 16)}...`
        );
      } else {
        totalClean++;
        roundClean++;
        console.log(
          `  [UPLOAD] ${r.file} from ${r.ip} → clean`
        );
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(
      `\n  [UPLOAD] Round ${roundNumber}/${TOTAL_ROUNDS} | t=${elapsed}s | ` +
        `flagged=${roundFlagged} | clean=${roundClean} | blocked=${roundBlocked}\n`
    );
  }, ROUND_INTERVAL_MS);
}

function printSummary() {
  console.log("");
  console.log("═".repeat(60));
  console.log("  UPLOAD ATTACK COMPLETE");
  console.log("═".repeat(60));
  console.log(`  Rounds:          ${TOTAL_ROUNDS}`);
  console.log(`  Total uploads:   ${totalUploads}`);
  console.log(`  Malicious files: ${totalFlagged}`);
  console.log(`  Clean files:     ${totalClean}`);
  console.log(`  Blocked (403):   ${totalBlocked}`);
  console.log(`  Errors:          ${totalErrors}`);
  console.log("═".repeat(60));
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
