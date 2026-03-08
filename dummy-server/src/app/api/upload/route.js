/**
 * POST /api/upload — Dummy Server
 *
 * Accepts multipart/form-data file uploads.
 * Computes SHA256 and fires an alert to DART for every file
 * so that DART can run a real VirusTotal file-hash lookup.
 * EICAR detection is still included as a fast pre-check flag.
 */

import { createHash } from "crypto";
import { state, addLog, addUploadRecord } from "@/lib/state";
import { fireUploadAlert } from "@/lib/uploadAlertFirer";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const sourceIP =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json(
        { error: "no file provided" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileContent = buffer.toString();
    const fileName = file.name || "unknown";
    const fileSize = buffer.length;

    // Compute SHA256 hash
    const sha256 = createHash("sha256")
      .update(buffer)
      .digest("hex");

    addLog("INFO",
      `File upload received from ${sourceIP}: ${fileName} (${fileSize} bytes) sha256=${sha256}`
    );

    // Check for EICAR string as a fast local pre-check
    const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}" +
      "$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
    const containsEICAR = fileContent.includes(EICAR);

    if (containsEICAR) {
      addLog("WARN",
        `EICAR test string detected in upload from ${sourceIP}: ${fileName}`
      );
    }

    // Build upload record
    const uploadRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source_ip: sourceIP,
      file_name: fileName,
      file_size: fileSize,
      sha256,
      eicar_detected: containsEICAR,
      status: "scanning",
      virustotal_result: null,
    };

    addUploadRecord(uploadRecord);

    // Fire alert to DART for EVERY file — DART will do the
    // real VirusTotal SHA256 lookup and decide whether to
    // quarantine or just log.
    addLog("INFO",
      `Sending file to DART for VirusTotal analysis: ${fileName}`
    );
    fireUploadAlert(sourceIP, uploadRecord);

    return Response.json({
      message: "file received — scanning via VirusTotal",
      sha256,
      file_name: fileName,
      eicar_detected: containsEICAR,
      status: "scanning",
    }, { status: 200 });

  } catch (err) {
    addLog("ERROR", `Upload handler error: ${err.message}`);
    return Response.json(
      { error: "upload failed" },
      { status: 500 }
    );
  }
}

