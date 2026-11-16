import type { Task } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

export function mondayOf(d: Date) {
  const m = new Date(d);
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return m;
}

export type Bucket = "overdue" | "this" | "next" | "later";

export function bucketFor(task: Task): Bucket {
  if (task.due_date) {
    const due = parseIso(task.due_date);
    const today = startOfToday();
    if (due < today) return "overdue";
    const diff = Math.round((due.getTime() - mondayOf(today).getTime()) / DAY_MS);
    if (diff < 7) return "this";
    if (diff < 14) return "next";
    return "later";
  }
  if (task.week !== "next") return "this";
  // "Next week" was relative to when it was set. Once that week has
  // arrived, the task belongs to this week.
  const setAt = task.week_set_at ?? task.created_at;
  if (setAt && new Date(setAt) < mondayOf(startOfToday())) return "this";
  return "next";
}

// True when a task is ticked off here but Asana still has it open.
export function asanaMismatch(task: Task): boolean {
  return !!task.asana_gid && task.done && task.asana_completed === false;
}

