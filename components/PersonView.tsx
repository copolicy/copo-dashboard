"use client";

import { useEffect, useMemo, useState } from "react";
import LinkedText from "@/components/LinkedText";
import { fetchRecentMeetings } from "@/lib/data";
import type { ClientMeeting, Project, Task } from "@/lib/types";

// Team members who get their own to-do page in the sidebar.
export const PEOPLE = ["Adam"];

const MEETING_LOOKBACK_DAYS = 21;
const DAY_MS = 24 * 60 * 60 * 1000;

// Who a task belongs to, from how it's written: "Adam: send deck" or
// "Adam to message Sheila". Returns null for tasks with no named owner.
export function taskOwner(title: string): string | null {
  const m = title.trim().match(/^([A-Z][a-z]+)(?::|\s+to\s)/);
  return m ? m[1] : null;
}

// Drops the "Adam: " prefix when showing a task on Adam's own page.
function withoutOwner(title: string, person: string) {
  const rest = title.replace(new RegExp(`^${person}:\\s*`), "");
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function mondayOf(d: Date) {
  const m = new Date(d);
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return m;
}

type Bucket = "overdue" | "this" | "next" | "later";

function bucketFor(task: Task): Bucket {
  if (task.due_date) {
    const due = parseIso(task.due_date);
    const today = startOfToday();
    if (due < today) return "overdue";
    const diff = Math.round((due.getTime() - mondayOf(today).getTime()) / DAY_MS);
    if (diff < 7) return "this";
    if (diff < 14) return "next";
    return "later";
  }
  return task.week === "next" ? "next" : "this";
}

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "this", label: "This week" },
  { key: "next", label: "Next week" },
  { key: "later", label: "Later" },
];

function formatDue(iso: string) {
  return parseIso(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type Row = { task: Task; project: Project };

export default function PersonView({
  person,
  projects,
  onToggleTask,
  onSelectProject,
}: {
  person: string;
  projects: Project[];
  onToggleTask: (projectId: string, taskId: string, done: boolean) => void;
  onSelectProject: (section: string, projectId: string) => void;
}) {
  const [meetings, setMeetings] = useState<ClientMeeting[] | null>(null);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    fetchRecentMeetings(MEETING_LOOKBACK_DAYS)
      .then(setMeetings)
      .catch(() => setMeetings([]));
  }, []);

  const rows: Row[] = useMemo(
    () =>
      projects
        .filter((p) => p.section !== "Archived")
        .flatMap((project) =>
          project.tasks
            .filter((t) => !t.hidden && taskOwner(t.title) === person)
            .map((task) => ({ task, project }))
        ),
    [projects, person]
  );

  const open = rows.filter((r) => !r.task.done);
  const done = rows.filter((r) => r.task.done);
  const byBucket = (b: Bucket) =>
    open
      .filter((r) => bucketFor(r.task) === b)
      .sort((a, z) =>
        (a.task.due_date ?? "9999").localeCompare(z.task.due_date ?? "9999")
      );

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const mentions = (meetings ?? []).flatMap((m) =>
    m.next_steps
      .filter((s) => taskOwner(s) === person)
      .map((s) => ({ meeting: m, step: s, project: projectById.get(m.project_id) }))
      .filter((x) => x.project && x.project.section !== "Archived")
  );

  const overdueCount = byBucket("overdue").length;
  const thisWeekCount = byBucket("this").length;

  function renderTask({ task, project }: Row) {
    const overdue = !task.done && bucketFor(task) === "overdue";
    return (
      <div className="person-task" key={task.id}>
        <button
          className={`task-check ${task.done ? "checked" : ""}`}
          onClick={() => onToggleTask(project.id, task.id, !task.done)}
          aria-label={task.done ? "Mark not done" : "Mark done"}
        />
        <div className={`person-task-body ${task.done ? "checked" : ""}`}>
          <div className="person-task-title">
            <LinkedText text={withoutOwner(task.title, person)} />
          </div>
          <div className="person-task-meta">
            <button
              className="person-client"
              onClick={() => onSelectProject(project.section, project.id)}
            >
              {project.name}
            </button>
            {task.due_date && (
              <span className={`person-due ${overdue ? "overdue" : ""}`}>
                Due {formatDue(task.due_date)}
              </span>
            )}
            {task.carried_over && !task.done && (
              <span className="carried-tag">Carried over</span>
            )}
            {task.asana_gid && (
              <a
                className="asana-link"
                href={`https://app.asana.com/0/0/${task.asana_gid}/f`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Asana ↗
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="person-page">
      <div className="page-header">
        <div className="header-left">
          <div className="week-label">Team</div>
          <div className="week-title">{person}&apos;s to-dos</div>
        </div>
      </div>

      <div className="stats person-stats">
        <div className="stat">
          <div className="stat-n">{open.length}</div>
          <div className="stat-l">Open</div>
        </div>
        <div className={`stat ${overdueCount > 0 ? "stat-alert" : ""}`}>
          <div className="stat-n">{overdueCount}</div>
          <div className="stat-l">Overdue</div>
        </div>
        <div className="stat">
          <div className="stat-n">{thisWeekCount}</div>
          <div className="stat-l">Due this week</div>
        </div>
        <div className="stat">
          <div className="stat-n">{mentions.length}</div>
          <div className="stat-l">From meetings</div>
        </div>
      </div>

      <div className="client-grid">
        <div className="client-main">
          <section className="client-panel">
            {open.length === 0 && (
              <div className="empty-state">
                Nothing open for {person}. Tasks show up here when they start with &quot;
                {person}:&quot; or &quot;{person} to&quot;, on any client.
              </div>
            )}
            {BUCKETS.map(({ key, label }) => {
              const list = byBucket(key);
              if (list.length === 0) return null;
              return (
                <div className={`person-group person-group-${key}`} key={key}>
                  <div className="intel-title">
                    {label} <span className="person-count">{list.length}</span>
                  </div>
                  {list.map((r) => (
                    renderTask(r)
                  ))}
                </div>
              );
            })}
            {done.length > 0 && (
              <div className="person-group">
                <button
                  className="completed-toggle"
                  onClick={() => setShowDone((v) => !v)}
                >
                  {showDone ? "▾" : "▸"} Completed ({done.length})
                </button>
                {showDone && done.map((r) => renderTask(r))}
              </div>
            )}
          </section>
        </div>

        <aside className="client-side">
          <section className="client-panel">
            <div className="intel-title">From meetings</div>
            <div className="person-hint">
              Next steps for {person} in the last {MEETING_LOOKBACK_DAYS} days of Granola notes.
            </div>
            {meetings === null ? (
              <div className="empty-state">Loading…</div>
            ) : mentions.length === 0 ? (
              <div className="empty-state">None recently.</div>
            ) : (
              mentions.map(({ meeting, step, project }, i) => (
                <div className="person-mention" key={`${meeting.id}-${i}`}>
                  <div className="person-mention-text">
                    <LinkedText text={withoutOwner(step, person)} />
                  </div>
                  <div className="person-task-meta">
                    <button
                      className="person-client"
                      onClick={() => onSelectProject(project!.section, project!.id)}
                    >
                      {project!.name}
                    </button>
                    <span className="person-mention-src">
                      {new Date(meeting.met_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      · {meeting.title}
                    </span>
                    {meeting.url && (
                      <a
                        className="asana-link"
                        href={meeting.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Granola ↗
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
