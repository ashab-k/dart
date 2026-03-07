/**
 * GET /api/alerts/stream — DART Backend
 *
 * SSE (Server-Sent Events) endpoint for real-time alert streaming.
 *
 * Client connects via EventSource and receives alert events as they
 * are ingested. Each event is a JSON-stringified StandardAlert.
 *
 * Uses ReadableStream with the sseManager to add/remove client
 * controllers on connect/disconnect.
 */

import { addClient, removeClient } from "@/lib/sseManager";

export const dynamic = "force-dynamic";

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // Register this client
      addClient(controller);

      // Send an initial comment to confirm connection
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(": connected\n\n"));
    },
    cancel(controller) {
      // Client disconnected — clean up
      removeClient(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
