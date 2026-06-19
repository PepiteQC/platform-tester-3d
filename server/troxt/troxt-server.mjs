import WebSocket from "ws";
import { handleIntent } from "./intent-engine.mjs";

const wss = new WebSocket.Server({ port: 9090 });

wss.on("connection", ws => {
  console.log("[TroxT] Connected");

  ws.on("message", async msg => {
    const data = JSON.parse(msg);

    if (data.type === "intent") {
      return await handleIntent(data.payload);
    }
  });
});
