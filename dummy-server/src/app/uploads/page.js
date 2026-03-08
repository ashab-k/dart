"use client";

/**
 * Dummy Server — /uploads page
 *
 * Two-step upload flow:
 *   1. Select a file (drag-drop or browse) — shows file info
 *   2. Click "Upload & Scan" to send to DART / VirusTotal
 *   3. Button becomes a link to the VT Reports dashboard
 */

import { useState } from "react";
import Link from "next/link";

const DART_FRONTEND_URL =
  process.env.NEXT_PUBLIC_DART_FRONTEND_URL || "http://localhost:3000";

export default function UploadsPage() {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null); // null | { success, sha256, ... } | { error }
  const [history, setHistory] = useState([]);

  function selectFile(file) {
    if (!file) return;
    setSelectedFile(file);
    setUploadResult(null);
  }

  function clearSelection() {
    setSelectedFile(null);
    setUploadResult(null);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const result = {
        success: true,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        sha256: data.sha256,
        eicar_detected: data.eicar_detected,
        message: data.message,
      };
      setUploadResult(result);
      setHistory((prev) => [result, ...prev].slice(0, 20));
    } catch (err) {
      setUploadResult({ success: false, error: err.message });
    }
    setUploading(false);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) selectFile(file);
  }

  function onFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
    e.target.value = "";
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <main
      style={{
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        color: "#f1f5f9",
        minHeight: "100vh",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 2rem",
          borderBottom: "1px solid #334155",
          background: "rgba(15,23,42,0.8)",
          backdropFilter: "blur(10px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.5rem" }}>🌐</span>
          <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>Acme Corp</span>
        </div>
        <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.9rem", color: "#94a3b8" }}>
          <Link href="/" style={{ color: "#94a3b8", textDecoration: "none" }}>Home</Link>
          <Link href="/uploads" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>
            📁 Upload Scanner
          </Link>
        </div>
      </nav>

      {/* Page Header */}
      <section style={{ maxWidth: "700px", margin: "0 auto", padding: "2.5rem 2rem 0", textAlign: "center" }}>
        <h1 style={{
          fontSize: "2rem",
          fontWeight: 800,
          marginBottom: "0.5rem",
          background: "linear-gradient(135deg, #f1f5f9, #38bdf8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          📁 File Upload Scanner
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.95rem", marginBottom: "0.5rem" }}>
          Upload any file to scan it through VirusTotal.
        </p>
        <span style={{
          fontSize: "0.75rem",
          color: "#38bdf8",
          background: "rgba(56,189,248,0.1)",
          border: "1px solid rgba(56,189,248,0.3)",
          borderRadius: "999px",
          padding: "0.2rem 0.75rem",
        }}>
          Protected by DART · SHA256 + VirusTotal
        </span>
      </section>

      {/* Upload Area */}
      <section style={{ maxWidth: "700px", margin: "2rem auto 0", padding: "0 2rem" }}>

        {/* Step 1: File selection zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${dragOver ? "#38bdf8" : selectedFile ? "#22c55e" : "#334155"}`,
            borderRadius: "16px",
            padding: selectedFile ? "1.5rem 2rem" : "3rem 2rem",
            textAlign: "center",
            background: dragOver
              ? "rgba(56,189,248,0.05)"
              : selectedFile
              ? "rgba(34,197,94,0.03)"
              : "rgba(15,23,42,0.6)",
            transition: "all 0.2s ease",
            cursor: selectedFile ? "default" : "pointer",
            marginBottom: "1rem",
          }}
          onClick={() => {
            if (!selectedFile) document.getElementById("file-input-hidden").click();
          }}
        >
          <input
            type="file"
            id="file-input-hidden"
            onChange={onFileSelect}
            style={{ display: "none" }}
          />

          {selectedFile ? (
            /* File selected — show info */
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: 0 }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(56,189,248,0.1)",
                  border: "1px solid rgba(56,189,248,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  flexShrink: 0,
                }}>
                  📄
                </div>
                <div style={{ textAlign: "left", minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: "1rem",
                    color: "#f1f5f9",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.15rem" }}>
                    {formatSize(selectedFile.size)} · {selectedFile.type || "unknown type"}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                style={{
                  background: "none",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#94a3b8",
                  fontSize: "0.8rem",
                  padding: "0.3rem 0.75rem",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                ✕ Remove
              </button>
            </div>
          ) : (
            /* No file — show drop zone prompt */
            <div>
              <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.6 }}>
                {dragOver ? "📥" : "📄"}
              </div>
              <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: "1.1rem", marginBottom: "0.35rem" }}>
                {dragOver ? "Drop file here" : "Drag & drop a file here"}
              </div>
              <div style={{ fontSize: "0.9rem", color: "#64748b" }}>
                or <span style={{ color: "#38bdf8", textDecoration: "underline" }}>click to browse</span>
              </div>
              <div style={{
                fontSize: "0.8rem",
                color: "#475569",
                marginTop: "1rem",
                lineHeight: 1.6,
                maxWidth: "500px",
                margin: "1rem auto 0",
              }}>
                Files are hashed (SHA256) and scanned via VirusTotal.
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Upload button / VT link */}
        {selectedFile && !uploadResult && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.6rem",
              width: "100%",
              padding: "0.9rem 2rem",
              background: uploading
                ? "rgba(56,189,248,0.2)"
                : "linear-gradient(135deg, #38bdf8, #818cf8)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1rem",
              borderRadius: "12px",
              border: "none",
              cursor: uploading ? "wait" : "pointer",
              boxShadow: uploading ? "none" : "0 0 20px rgba(56,189,248,0.3)",
              transition: "all 0.2s ease",
              marginBottom: "1.5rem",
            }}
          >
            {uploading ? (
              <>
                <span style={{ animation: "pulse-dot 1s infinite" }}>⏳</span>
                Uploading & scanning via VirusTotal...
              </>
            ) : (
              <>
                🚀 Upload & Scan
              </>
            )}
          </button>
        )}

        {/* Step 3: Upload complete — link to VT dashboard */}
        {uploadResult && uploadResult.success && (
          <div style={{
            background: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "12px",
            padding: "1.25rem 1.5rem",
            marginBottom: "1.5rem",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}>
              <span style={{ fontSize: "1.25rem" }}>✅</span>
              <span style={{ fontWeight: 700, color: "#22c55e", fontSize: "1rem" }}>
                File uploaded successfully
              </span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.5rem" }}>
              SHA256: <code style={{
                fontFamily: "monospace",
                color: "#38bdf8",
                background: "rgba(15,23,42,0.6)",
                padding: "0.15rem 0.4rem",
                borderRadius: "4px",
                fontSize: "0.75rem",
              }}>{uploadResult.sha256}</code>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "1rem" }}>
              The file has been sent to DART for VirusTotal analysis. View the full scan results on the dashboard.
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <a
                href={`${DART_FRONTEND_URL}/virustotal`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.7rem 1.5rem",
                  background: "linear-gradient(135deg, #38bdf8, #818cf8)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  borderRadius: "10px",
                  textDecoration: "none",
                  boxShadow: "0 0 20px rgba(56,189,248,0.3)",
                }}
              >
                🔍 View VirusTotal Report
              </a>
              <button
                onClick={clearSelection}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.7rem 1.5rem",
                  background: "rgba(30,41,59,0.6)",
                  color: "#94a3b8",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  borderRadius: "10px",
                  border: "1px solid #334155",
                  cursor: "pointer",
                }}
              >
                📁 Upload Another
              </button>
            </div>
          </div>
        )}

        {/* Error state */}
        {uploadResult && !uploadResult.success && (
          <div style={{
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "12px",
            padding: "1rem 1.5rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div>
              <span style={{ color: "#ef4444", fontWeight: 700 }}>❌ Upload failed</span>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                {uploadResult.error}
              </div>
            </div>
            <button
              onClick={() => { setUploadResult(null); }}
              style={{
                background: "none",
                border: "1px solid #ef4444",
                borderRadius: "8px",
                color: "#ef4444",
                fontSize: "0.8rem",
                padding: "0.3rem 0.75rem",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Upload History */}
        {history.length > 0 && (
          <div style={{
            background: "rgba(2,6,23,0.8)",
            borderRadius: "12px",
            border: "1px solid #1e293b",
            overflow: "hidden",
            marginBottom: "2rem",
          }}>
            <div style={{
              padding: "0.5rem 1rem",
              background: "rgba(30,41,59,0.5)",
              borderBottom: "1px solid #1e293b",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#94a3b8",
            }}>
              Upload History ({history.length})
            </div>
            <div style={{ maxHeight: "250px", overflowY: "auto" }}>
              {history.map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: "0.6rem 1rem",
                    borderBottom: "1px solid #1e293b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      color: "#f1f5f9",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {r.fileName}
                      <span style={{ fontWeight: 400, color: "#64748b", marginLeft: "0.5rem", fontSize: "0.7rem" }}>
                        ({formatSize(r.fileSize)})
                      </span>
                    </div>
                    {r.sha256 && (
                      <div style={{
                        fontFamily: "monospace",
                        fontSize: "0.65rem",
                        color: "#475569",
                        marginTop: "0.15rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {r.sha256}
                      </div>
                    )}
                  </div>
                  <a
                    href={`${DART_FRONTEND_URL}/virustotal`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: "#38bdf8",
                      whiteSpace: "nowrap",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "6px",
                      background: "rgba(56,189,248,0.1)",
                      border: "1px solid rgba(56,189,248,0.3)",
                      textDecoration: "none",
                    }}
                  >
                    View Report →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: "center",
        padding: "2rem",
        borderTop: "1px solid #334155",
        color: "#64748b",
        fontSize: "0.85rem",
      }}>
        © 2026 Acme Corp — Simulated Server for DART Demo
      </footer>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </main>
  );
}
