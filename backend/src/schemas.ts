import { z } from "zod";

export const joinSchema = z.object({
  type: z.literal("join"),
  boardId: z.string().min(1, "boardId required"),
});

const id = z.string().min(1, "id required");
const title = z.string().trim().min(1, "title required");
const description = z.string().max(10_000).optional();
const done = z.boolean().optional();

export const createSchema = z.object({
  type: z.literal("create"),
  boardId: z.string().min(1),
  task: z.object({
    id: id.optional(), // client may omit; we’ll generate
    title,
    description,
    done,
  }),
});

export const updateSchema = z.object({
  type: z.literal("update"),
  boardId: z.string().min(1),
  task: z.object({
    id, // required
    title: z.string().trim().min(1).optional(),
    description,
    done,
  }),
});

export const deleteSchema = z.object({
  type: z.literal("delete"),
  boardId: z.string().min(1),
  taskId: id,
});

export type JoinMsg = z.infer<typeof joinSchema>;
export type CreateMsg = z.infer<typeof createSchema>;
export type UpdateMsg = z.infer<typeof updateSchema>;
export type DeleteMsg = z.infer<typeof deleteSchema>;
