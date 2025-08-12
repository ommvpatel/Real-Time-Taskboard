import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ host: "127.0.0.1", port: 3010 });
console.log("WS server on ws://127.0.0.1:3002");

wss.on("connection", (ws) => {
  ws.send("hello");
  ws.on("message", (msg) => ws.send(`echo:${msg.toString()}`));
  ws.on("close", () => console.log("closed"));
  ws.on("error", (e) => console.error("ws error", e));
});
