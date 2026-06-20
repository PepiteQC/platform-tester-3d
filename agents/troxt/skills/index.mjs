// index.mjs
import { WebSocketServer } from "ws";
import { handleIntent } from "./intent-engine.mjs";
import { listActions, listSkills, skills } from "./skills.mjs";

const PORT = Number(process.env.PORT ?? 9090);

const wss = new WebSocketServer({
  port: PORT,
});

const clients = new Map();

console.log(`[TroxT] Server running on ws://localhost:${PORT}`);

// -----------------------------------------------------
// Utils
// -----------------------------------------------------

function createClientId() {
  return `client_${crypto.randomUUID()}`;
}

function now() {
  return Date.now();
}

function send(ws, message) {
  if (ws.readyState !== ws.OPEN) return;

  ws.send(JSON.stringify({
    ...message,
    timestamp: now(),
  }));
}

function sendResult(ws, id, result) {
  send(ws, {
    type: "result",
    id,
    payload: {
      ok: true,
      result,
    },
  });
}

function sendError(ws, id, code, message, details = null) {
  send(ws, {
    type: "error",
    id,
    payload: {
      ok: false,
      code,
      message,
      details,
    },
  });
}

function broadcast(message, exceptWs = null) {
  for (const ws of clients.keys()) {
    if (ws === exceptWs) continue;
    send(ws, message);
  }
}

function parseMessage(raw) {
  try {
    return {
      ok: true,
      data: JSON.parse(raw.toString()),
    };
  } catch {
    return {
      ok: false,
      error: "Invalid JSON",
    };
  }
}

// -----------------------------------------------------
// Server
// -----------------------------------------------------

wss.on("connection", ws => {
  const clientId = createClientId();

  clients.set(ws, {
    id: clientId,
    connectedAt: now(),
  });

  console.log(`[TroxT] Connected: ${clientId}`);

  send(ws, {
    type: "connected",
    id: null,
    payload: {
      ok: true,
      clientId,
      server: "TroxT",
      skills: listSkills(),
    },
  });

  broadcast({
    type: "client_joined",
    id: null,
    payload: {
      clientId,
    },
  }, ws);

  ws.on("message", async raw => {
    const parsed = parseMessage(raw);

    if (!parsed.ok) {
      return sendError(ws, null, "INVALID_JSON", parsed.error);
    }

    const data = parsed.data;
    const id = data.id ?? null;

    if (!data.type) {
      return sendError(ws, id, "MISSING_TYPE", "Message must include a type");
    }

    const context = {
      ws,
      wss,
      clients,
      clientId,
      skills,
      broadcast,
      send: message => send(ws, message),
    };

    try {
      switch (data.type) {
        case "ping": {
          return send(ws, {
            type: "pong",
            id,
            payload: {
              ok: true,
              serverTime: now(),
            },
          });
        }

        case "list_skills": {
          return sendResult(ws, id, {
            skills: listSkills(),
          });
        }

        case "list_actions": {
          const { domain, skill } = data.payload ?? {};

          if (!domain || !skill) {
            return sendError(
              ws,
              id,
              "INVALID_PAYLOAD",
              "list_actions requires payload.domain and payload.skill"
            );
          }

          return sendResult(ws, id, {
            domain,
            skill,
            actions: listActions(domain, skill),
          });
        }

        case "intent": {
          const result = await handleIntent(data.payload, context);
          return sendResult(ws, id, result);
        }

        default: {
          return sendError(
            ws,
            id,
            "UNKNOWN_MESSAGE_TYPE",
            `Unknown message type: ${data.type}`
          );
        }
      }
    } catch (error) {
      console.error("[TroxT] Handler error:", error);

      return sendError(
        ws,
        id,
        "HANDLER_ERROR",
        error.message ?? "Internal server error"
      );
    }
  });

  ws.on("close", () => {
    clients.delete(ws);

    console.log(`[TroxT] Disconnected: ${clientId}`);

    broadcast({
      type: "client_left",
      id: null,
      payload: {
        clientId,
      },
    });
  });

  ws.on("error", error => {
    console.error(`[TroxT] WebSocket error from ${clientId}:`, error);
  });
});

wss.on("error", error => {
  console.error("[TroxT] Server error:", error);
});

// -----------------------------------------------------
// Graceful shutdown
// -----------------------------------------------------

function shutdown() {
  console.log("[TroxT] Shutting down...");

  for (const ws of clients.keys()) {
    send(ws, {
      type: "server_shutdown",
      id: null,
      payload: {
        ok: true,
        message: "Server is shutting down",
      },
    });

    ws.close();
  }

  wss.close(() => {
    console.log("[TroxT] Server closed");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);