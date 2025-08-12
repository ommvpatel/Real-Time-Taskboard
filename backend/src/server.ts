import Fastify from "fastify";
import websocket from "@fastify/websocket";

const app = Fastify({ logger: true });
await app.register(websocket);

/** ---- Types & in-memory state (swap to Postgres later) ---- */
type Task = { id: string; title: string; description?: string; done?: boolean };
type BoardState = { clients: Set<any>; tasks: Map<string, Task> };
const boards = new Map<string, BoardState>();

function ensureBoard(id: string): BoardState {
  let b = boards.get(id);
  if (!b) {
    b = { clients: new Set(), tasks: new Map() };
    boards.set(id, b);
  }
  return b;
}
function genId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
function send(ws: any, msg: unknown) {
  try {
    if (ws?.readyState === 1) ws.send(JSON.stringify(msg));
  } catch {}
}
function broadcast(boardId: string, msg: unknown, except?: any) {
  const b = boards.get(boardId);
  if (!b) return;
  for (const c of b.clients) if (c !== except) send(c, msg);
}

/** ---- Health (for sanity checks) ---- */
app.get("/health", async () => ({ ok: true }));

/**
 * WebSocket JSON protocol (client -> server):
 * {type:"join",   boardId}
 * {type:"create", boardId, task:{id?,title,description?,done?}}
 * {type:"update", boardId, task:{id,title?,description?,done?}}
 * {type:"delete", boardId, taskId}
 *
 * Server -> client events: hello, snapshot, created, updated, deleted, error
 */
app.get("/ws", { websocket: true }, (ws /* raw WebSocket */, req) => {
  let boardId: string | undefined;

  // greet + basic protocol hint
  send(ws, {
    type: "hello",
    ok: true,
    protocol: ["join", "create", "update", "delete"],
  });

  ws.on("message", (buf: Buffer) => {
    let msg: any;
    try {
      msg = JSON.parse(buf.toString());
    } catch {
      return send(ws, { type: "error", error: "invalid_json" });
    }

    switch (msg?.type) {
      case "join": {
        const id = String(msg.boardId ?? "");
        if (!id) return send(ws, { type: "error", error: "boardId_required" });
        boardId = id;
        const b = ensureBoard(id);
        b.clients.add(ws);
        // send current snapshot
        send(ws, {
          type: "snapshot",
          boardId: id,
          tasks: [...b.tasks.values()],
        });
        return;
      }

      case "create": {
        if (!boardId) return send(ws, { type: "error", error: "join_first" });
        const b = ensureBoard(boardId);
        const t = msg.task ?? {};
        const id = t.id ?? genId();
        const title = (t.title ?? "").toString().trim();
        if (!title) return send(ws, { type: "error", error: "title_required" });
        const task: Task = {
          id,
          title,
          description: t.description,
          done: !!t.done,
        };
        b.tasks.set(id, task);
        const payload = { type: "created", boardId, task };
        send(ws, payload);
        broadcast(boardId, payload, ws);
        return;
      }

      case "update": {
        if (!boardId) return send(ws, { type: "error", error: "join_first" });
        const b = ensureBoard(boardId);
        const t = msg.task ?? {};
        const id = String(t.id ?? "");
        if (!id) return send(ws, { type: "error", error: "id_required" });
        const existing = b.tasks.get(id);
        if (!existing) return send(ws, { type: "error", error: "not_found" });
        const updated: Task = {
          ...existing,
          ...(t.title !== undefined ? { title: String(t.title) } : {}),
          ...(t.description !== undefined
            ? { description: String(t.description) }
            : {}),
          ...(t.done !== undefined ? { done: !!t.done } : {}),
        };
        b.tasks.set(id, updated);
        const payload = { type: "updated", boardId, task: updated };
        send(ws, payload);
        broadcast(boardId, payload, ws);
        return;
      }

      case "delete": {
        if (!boardId) return send(ws, { type: "error", error: "join_first" });
        const b = ensureBoard(boardId);
        const id = String(msg.taskId ?? "");
        if (!id) return send(ws, { type: "error", error: "id_required" });
        if (!b.tasks.has(id))
          return send(ws, { type: "error", error: "not_found" });
        b.tasks.delete(id);
        const payload = { type: "deleted", boardId, taskId: id };
        send(ws, payload);
        broadcast(boardId, payload, ws);
        return;
      }

      default:
        return send(ws, { type: "error", error: "unknown_type" });
    }
  });

  ws.on("close", () => {
    if (!boardId) return;
    const b = boards.get(boardId);
    b?.clients.delete(ws);
  });

  ws.on("error", (err) => app.log.error({ err }, "ws error"));
});

/** ---- Heartbeat: kill dead sockets so broadcasts don’t hang ---- */
const HEARTBEAT_MS = 30000;
setInterval(() => {
  for (const [, { clients }] of boards) {
    for (const ws of clients) {
      try {
        ws.ping?.();
      } catch {}
    }
  }
}, HEARTBEAT_MS);

/** ---- Start ---- */
await app.listen({ host: "127.0.0.1", port: 3002 });
app.log.info("Real-time taskboard WS ready on ws://127.0.0.1:3002/ws");
