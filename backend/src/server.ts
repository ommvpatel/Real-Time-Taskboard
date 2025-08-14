import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { initDb, selectTasks, insertTask, updateTask, deleteTask } from "./db";
import express from "express";
import cors from "cors";
import { selectTasks } from "./db";
import type { Task } from "./types";
import {
  joinSchema,
  createSchema,
  updateSchema,
  deleteSchema,
} from "./schemas";

const app = Fastify({ logger: true });
await app.register(websocket);

// Keep only client lists in memory (for broadcasting). Data lives in Postgres.
const clientsByBoard = new Map<string, Set<any>>();

function genId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
function send(ws: any, msg: unknown) {
  try {
    if (ws?.readyState === 1) ws.send(JSON.stringify(msg));
  } catch {}
}
function broadcast(boardId: string, msg: unknown, except?: any) {
  const set = clientsByBoard.get(boardId);
  if (!set) return;
  for (const c of set) if (c !== except) send(c, msg);
}

app.get("/health", async () => ({ ok: true }));

app.get("/ws", { websocket: true }, (ws /* raw socket */) => {
  let boardId: string | undefined;

  send(ws, { type: "hello", ok: true });

  ws.on("message", async (buf: Buffer) => {
    let msg: any;
    try {
      msg = JSON.parse(buf.toString());
    } catch {
      return send(ws, { type: "error", error: "invalid_json" });
    }

    // validate & handle
    if (msg?.type === "join") {
      const parsed = joinSchema.safeParse(msg);
      if (!parsed.success) return send(ws, zodError(parsed.error));
      const { boardId: id } = parsed.data;

      boardId = id;
      if (!clientsByBoard.has(id)) clientsByBoard.set(id, new Set());
      clientsByBoard.get(id)!.add(ws);

      try {
        const tasks = await selectTasks(id);
        send(ws, { type: "snapshot", boardId: id, tasks });
      } catch (e) {
        app.log.error(e);
        send(ws, { type: "error", error: "db_select_failed" });
      }
      return;
    }

    if (msg?.type === "create") {
      const parsed = createSchema.safeParse(msg);
      if (!parsed.success) return send(ws, zodError(parsed.error));
      if (!boardId || boardId !== parsed.data.boardId)
        return send(ws, { type: "error", error: "join_first" });

      const t = parsed.data.task;
      const task: Task = {
        id: t.id ?? genId(),
        title: t.title,
        description: t.description,
        done: !!t.done,
      };

      try {
        const saved = await insertTask(boardId, task);
        const payload = { type: "created", boardId, task: saved };
        send(ws, payload);
        broadcast(boardId, payload, ws);
      } catch (e) {
        app.log.error(e);
        send(ws, { type: "error", error: "db_insert_failed" });
      }
      return;
    }

    if (msg?.type === "update") {
      const parsed = updateSchema.safeParse(msg);
      if (!parsed.success) return send(ws, zodError(parsed.error));
      if (!boardId || boardId !== parsed.data.boardId)
        return send(ws, { type: "error", error: "join_first" });

      const t = parsed.data.task;
      try {
        const updated = await updateTask(boardId, {
          id: t.id,
          title: t.title,
          description: t.description,
          done: t.done,
        });
        if (!updated) return send(ws, { type: "error", error: "not_found" });

        const payload = { type: "updated", boardId, task: updated };
        send(ws, payload);
        broadcast(boardId, payload, ws);
      } catch (e) {
        app.log.error(e);
        send(ws, { type: "error", error: "db_update_failed" });
      }
      return;
    }

    if (msg?.type === "delete") {
      const parsed = deleteSchema.safeParse(msg);
      if (!parsed.success) return send(ws, zodError(parsed.error));
      if (!boardId || boardId !== parsed.data.boardId)
        return send(ws, { type: "error", error: "join_first" });

      const id = parsed.data.taskId;
      try {
        const ok = await deleteTask(boardId, id);
        if (!ok) return send(ws, { type: "error", error: "not_found" });

        const payload = { type: "deleted", boardId, taskId: id };
        send(ws, payload);
        broadcast(boardId, payload, ws);
      } catch (e) {
        app.log.error(e);
        send(ws, { type: "error", error: "db_delete_failed" });
      }
      return;
    }

    // unknown type
    return send(ws, { type: "error", error: "unknown_type" });
  });

  ws.on("close", () => {
    if (!boardId) return;
    const set = clientsByBoard.get(boardId);
    if (set) set.delete(ws);
  });

  ws.on("error", (err) => app.log.error({ err }, "ws error"));
});

function zodError(err: any) {
  // compact error payload that’s still useful in the client
  const issues =
    err?.issues?.map((i: any) => ({ path: i.path, message: i.message })) ?? [];
  return { type: "error", error: "validation_error", issues };
}

// 1) Ensure DB tables, 2) start server
await initDb();
const PORT = Number(process.env.PORT || 3002);
// Fetch tasks for a given boardId
app.get("/tasks", async (req, reply) => {
  const boardId = (req.query as any).boardId;
  if (!boardId) {
    return reply.status(400).send({ error: "boardId required" });
  }
  const tasks = await selectTasks(boardId);
  return tasks;
});

await app.listen({ host: "127.0.0.1", port: PORT });
app.log.info(`RT Taskboard + Postgres on ws://127.0.0.1:${PORT}/ws`);
