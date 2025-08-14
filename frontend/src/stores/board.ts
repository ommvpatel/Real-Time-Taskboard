import { defineStore } from "pinia";

export type Task = {
  id: string;
  title: string;
  description?: string;
  done?: boolean;
};

export const useBoardStore = defineStore("board", {
  state: () => ({
    boardId: "alpha" as string,
    tasks: [] as Task[],
    ws: null as WebSocket | null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 8,
    reconnectTimer: 0 as any,
  }),

  actions: {
    async connect(boardId?: string) {
      if (boardId) this.boardId = boardId.trim();
      this.disconnect(); // stop old connection

      // 1. Fetch existing tasks immediately
      try {
        const res = await fetch(
          `http://127.0.0.1:3002/tasks?boardId=${this.boardId}`
        );
        if (res.ok) {
          this.tasks = await res.json();
        } else {
          console.warn("Failed to fetch tasks for board:", this.boardId);
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
      }

      // 2. Open WebSocket for live updates
      this._clearReconnect();
      this._openSocket();
    },

    _openSocket() {
      try {
        this.ws?.close();
      } catch {}
      const ws = new WebSocket("ws://127.0.0.1:3002/ws");
      this.ws = ws;

      ws.onopen = () => {
        this.reconnectAttempts = 0;
        ws.send(JSON.stringify({ type: "join", boardId: this.boardId }));
      };

      ws.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data);
          switch (evt.type) {
            case "snapshot":
              this.tasks = evt.tasks;
              break;
            case "created":
              this.tasks = [...this.tasks, evt.task];
              break;
            case "updated":
              this.tasks = this.tasks.map((t) =>
                t.id === evt.task.id ? evt.task : t
              );
              break;
            case "deleted":
              this.tasks = this.tasks.filter((t) => t.id !== evt.taskId);
              break;
            case "error":
              console.warn("WS error:", evt.error);
              break;
          }
        } catch {}
      };

      ws.onclose = () => {
        this._scheduleReconnect();
      };
    },

    _scheduleReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
      this.reconnectAttempts++;
      const delay = Math.min(
        8000,
        500 * Math.pow(2, this.reconnectAttempts - 1)
      );
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this._openSocket(), delay);
    },

    _clearReconnect() {
      this.reconnectAttempts = 0;
      clearTimeout(this.reconnectTimer);
    },

    disconnect() {
      this._clearReconnect();
      try {
        this.ws?.close();
      } catch {}
      this.ws = null;
    },

    createTask(title: string, description?: string) {
      if (!this.ws || this.ws.readyState !== 1) return;
      this.ws.send(
        JSON.stringify({
          type: "create",
          boardId: this.boardId,
          task: { title, description: description || "" },
        })
      );
    },

    toggleTask(id: string, done: boolean) {
      if (!this.ws || this.ws.readyState !== 1) return;
      const existing = this.tasks.find((t) => t.id === id);
      if (!existing) return;
      this.ws.send(
        JSON.stringify({
          type: "update",
          boardId: this.boardId,
          task: {
            id,
            title: existing.title,
            description: existing.description || "",
            done,
          },
        })
      );
    },

    deleteTask(id: string) {
      if (!this.ws || this.ws.readyState !== 1) return;
      this.ws.send(
        JSON.stringify({
          type: "delete",
          boardId: this.boardId,
          taskId: id,
        })
      );
    },

    editTask(id: string, title: string, description?: string) {
      if (!this.ws || this.ws.readyState !== 1) return;
      this.ws.send(
        JSON.stringify({
          type: "update",
          boardId: this.boardId,
          task: { id, title, description: description || "" },
        })
      );
    },
  },
});
