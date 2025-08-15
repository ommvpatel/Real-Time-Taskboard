import dotenv from "dotenv";
dotenv.config();
import { Pool } from "pg";
import type { Task, DbTaskRow } from "./types.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Run once on boot. No migrations yet; just make the table if it doesn't exist.
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_board ON tasks(board_id);
  `);
}

export async function selectTasks(boardId: string): Promise<Task[]> {
  const { rows } = await pool.query<DbTaskRow>(
    `SELECT id, title, description, done
       FROM tasks
      WHERE board_id = $1
      ORDER BY created_at ASC`,
    [boardId]
  );
  return rows.map((r: DbTaskRow) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    done: r.done,
  }));
}

export async function insertTask(boardId: string, task: Task): Promise<Task> {
  const { rows } = await pool.query<DbTaskRow>(
    `INSERT INTO tasks (id, board_id, title, description, done)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, title, description, done`,
    [task.id, boardId, task.title, task.description ?? null, !!task.done]
  );
  const r: DbTaskRow = rows[0];
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    done: r.done,
  };
}

export async function updateTask(
  boardId: string,
  partial: Partial<Task> & { id: string }
): Promise<Task | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;

  if (partial.title !== undefined) {
    sets.push(`title = $${i++}`);
    vals.push(String(partial.title));
  }
  if (partial.description !== undefined) {
    sets.push(`description = $${i++}`);
    vals.push(partial.description ?? null);
  }
  if (partial.done !== undefined) {
    sets.push(`done = $${i++}`);
    vals.push(!!partial.done);
  }

  // nothing to update → return current row if exists
  if (sets.length === 0) {
    const { rows } = await pool.query<DbTaskRow>(
      `SELECT id, title, description, done FROM tasks WHERE id=$1 AND board_id=$2`,
      [partial.id, boardId]
    );
    const r: DbTaskRow | undefined = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      title: r.title,
      description: r.description ?? undefined,
      done: r.done,
    };
  }

  sets.push(`updated_at = NOW()`);
  const query = `
    UPDATE tasks
       SET ${sets.join(", ")}
     WHERE id = $${i} AND board_id = $${i + 1}
     RETURNING id, title, description, done
  `;
  vals.push(partial.id, boardId);

  const { rows } = await pool.query<DbTaskRow>(query, vals);
  const r: DbTaskRow | undefined = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    done: r.done,
  };
}

export async function deleteTask(
  boardId: string,
  id: string
): Promise<boolean> {
  const res = await pool.query(
    `DELETE FROM tasks WHERE id=$1 AND board_id=$2`,
    [id, boardId]
  );
  return (res.rowCount ?? 0) > 0; // <- handle possible null
}
