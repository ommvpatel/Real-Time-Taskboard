export type Task = {
  id: string;
  title: string;
  description?: string;
  done?: boolean;
};

export function connectToBoard(boardId: string, onEvent: (evt: any) => void) {
  const ws = new WebSocket("ws://127.0.0.1:3002/ws");

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join", boardId }));
  };

  ws.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data));
    } catch {
      /* ignore parse errors */
    }
  };

  return {
    create(title: string, description?: string) {
      ws.send(
        JSON.stringify({
          type: "create",
          boardId,
          task: { title, description },
        })
      );
    },
    update(task: Partial<Task> & { id: string }) {
      ws.send(JSON.stringify({ type: "update", boardId, task }));
    },
    remove(taskId: string) {
      ws.send(JSON.stringify({ type: "delete", boardId, taskId }));
    },
    close() {
      try {
        ws.close();
      } catch {}
    },
  };
}
