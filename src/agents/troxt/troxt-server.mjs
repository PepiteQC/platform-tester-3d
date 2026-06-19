import { WebSocketServer } from "ws";
import { handleIntent } from "./intent-engine.mjs";

const PORT = 9090;

const wss = new WebSocketServer({ port: PORT });

console.log(`[TroxT] WebSocket server running on ws://localhost:${PORT}`);

function send(ws, type, payload) {
  if (ws.readyState !== ws.OPEN) return;

  ws.send(JSON.stringify({
    type,
    payload
  }));
}

wss.on("connection", ws => {
  console.log("[TroxT] Connected");

  send(ws, "connected", {
    message: "Connected to TroxT server"
  });

  ws.on("message", async raw => {
    let data;

    try {
      data = JSON.parse(raw.toString());
    } catch {
      return send(ws, "error", {
        message: "Invalid JSON"
      });
    }

    try {
      if (data.type === "intent") {
        const result = await handleIntent(data.payload);

        return send(ws, "intent_result", {
          ok: true,
          result
        });
      }

      return send(ws, "error", {
        message: `Unknown message type: ${data.type}`
      });
    } catch (error) {
      console.error("[TroxT] Intent error:", error);

      return send(ws, "intent_result", {
        ok: false,
        error: error.message ?? "Intent failed"
      });
    }
  });

  ws.on("close", () => {
    console.log("[TroxT] Disconnected");
  });

  ws.on("error", error => {
    console.error("[TroxT] WebSocket error:", error);
  });
});