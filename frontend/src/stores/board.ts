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
  }),

  actions: {
    connect(boardId?: string) {
      if (boardId) this.boardId = boardId;
      this.disconnect();

      const ws = new WebSocket("ws://127.0.0.1:3002/ws");
      this.ws = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "join", boardId: this.boardId }));
      };

      ws.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data);
          if (evt.type === "snapshot") this.tasks = evt.tasks;
          if (evt.type === "created") this.tasks = [...this.tasks, evt.task];
          if (evt.type === "updated")
            this.tasks = this.tasks.map((t) =>
              t.id === evt.task.id ? evt.task : t
            );
          if (evt.type === "deleted")
            this.tasks = this.tasks.filter((t) => t.id !== evt.taskId);
        } catch {
          /* ignore */
        }
      };
    },

    disconnect() {
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
          task: { title, description },
        })
      );
    },

    toggleTask(id: string, done: boolean) {
      if (!this.ws || this.ws.readyState !== 1) return;
      this.ws.send(
        JSON.stringify({
          type: "update",
          boardId: this.boardId,
          task: { id, done },
        })
      );
    },

    deleteTask(id: string) {
      if (!this.ws || this.ws.readyState !== 1) return;
      this.ws.send(
        JSON.stringify({ type: "delete", boardId: this.boardId, taskId: id })
      );
    },
  },
});
