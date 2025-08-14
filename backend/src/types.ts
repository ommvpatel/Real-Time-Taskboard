export type Task = {
  id: string;
  title: string;
  description?: string;
  done?: boolean;
};

//mirrors the DB columns when we select
export type DbTaskRow = {
  id: string;
  board_id: string;
  title: string;
  description: string | null;
  done: boolean;
  created_at: string;
  updated_at: string;
};
