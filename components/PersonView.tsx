"use client";

import { useEffect, useMemo, useState } from "react";
import LinkedText from "@/components/LinkedText";
import OwnerPicker from "@/components/OwnerPicker";
import { PencilIcon } from "@/components/ProjectCard";
import { fetchRecentMeetings } from "@/lib/data";
import type { ClientMeeting, Project, Task } from "@/lib/types";
import { AdamAgendaPanel } from "@/components/DiscussionPoints";

// Team members who get their own to-do page in the sidebar.
export const PEOPLE = ["Nicole", "Adam"];

// Tasks with no named owner belong to the dashboard's owner.
export const DEFAULT_OWNER = "Nicole";

const MEETING_LOOKBACK_DAYS = 21;
const MENTIONS_SHOWN = 8;

// Who a task belongs to, from how it's written: "Adam: send deck" or
// "Adam to message Sheila". Returns null for tasks with no named owner.
export function taskOwner(title: string): string | null {
  const m = title.trim().match(/^([A-Z][a-z]+)(?::|\s+to\s)/);
  return m ? m[1] : null;
}

// Who a task is for, counting unowned tasks as the default owner's.
export function ownerOf(title: string): string {
  return taskOwner(title) ?? DEFAULT_OWNER;
}

// Rewrites a title so it belongs to someone else. "Lydia to work on X"
// handed to Sharona becomes "Sharona: work on X"; handed to the default
// owner it loses its prefix ("Work on X").
export function retitleForOwner(title: string, person: string): string {
  const current = taskOwner(title);
  let rest = title.trim();
  if (current) {
    rest = rest.replace(new RegExp(`^${current}(?::\\s*|\\s+to\\s+)`), "").trim();
  }
  if (person === DEFAULT_OWNER) return rest.charAt(0).toUpperCase() + rest.slice(1);
  return `${person}: ${rest}`;
}

// Everyone a task can be handed to: the sidebar people, then anyone
// else who already has tasks or is on the contractors list.
export function assignablePeople(projects: Project[], extra: string[] = []): string[] {
  const names = new Set<string>(PEOPLE);
  for (const p of projects) {
    if (p.section === "Archived") continue;
    for (const t of p.tasks) {
      const o = taskOwner(t.title);
      if (o) names.add(o);
    }
  }
  for (const e of extra) {
    const first = e.trim().split(/\s+/)[0];
    if (first) names.add(first.charAt(0).toUpperCase() + first.slice(1));
  }
  const rest = Array.from(names)
    .filter((n) => !PEOPLE.includes(n))
    .sort();
  return [...PEOPLE, ...rest];
}

// Drops the "Adam: " prefix when showing a task on Adam's own page.
function withoutOwner(title: string, person: string) {
  const rest = title.replace(new RegExp(`^${person}:\\s*`), "");
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

export {
  parseIso,
  startOfToday,
  mondayOf,
  bucketFor,
  asanaMismatch,
  type Bucket,
} from "@/lib/weeks";
import { asanaMismatch, bucketFor, parseIso, type Bucket } from "@/lib/weeks";

export const BUCKETS: { key: Bucket; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "this", label: "This week" },
  { key: "next", label: "Next week" },
  { key: "later", label: "Later" },
];

export function formatDue(iso: string) {
  return parseIso(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type Row = { task: Task; project: Project };

// One task on a person's page. Double-click the text, or use the pencil
// button, to edit it. The "Adam: " owner prefix is hidden while editing
// and put back on save, so the task stays on the right person's page.
function PersonTask({
  task,
  project,
  person,
  people,
  onToggle,
  onEdit,
  onSelectProject,
}: {
  task: Task;
  project: Project;
  person: string;
  people: string[];
  onToggle: () => void;
  onEdit: (title: string) => void;
  onSelectProject: () => void;
}) {
  const prefix = new RegExp(`^${person}:\\s*`).test(task.title) ? `${person}: ` : "";
  const shown = withoutOwner(task.title, person);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(shown);
  const overdue = !task.done && bucketFor(task) === "overdue";

  function startEdit() {
    setValue(shown);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    const trimmed = value.trim();
    if (!trimmed || trimmed === shown) return;
    onEdit(prefix + trimmed);
  }

  return (
    <div className="person-task">
      <button
        className={`task-check ${task.done ? "checked" : ""}`}
        onClick={onToggle}
        aria-label={task.done ? "Mark not done" : "Mark done"}
      />
      <div className={`person-task-body ${task.done ? "checked" : ""}`}>
        {editing ? (
          <input
            className="task-edit-input person-task-input"
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <div
            className="person-task-title"
            onDoubleClick={startEdit}
            title="Double-click to edit"
          >
            <LinkedText text={shown} />
          </div>
        )}
        <div className="person-task-meta">
          <button className="person-client" onClick={onSelectProject}>
            {project.name}
          </button>
          <OwnerPicker
            owner={person}
            people={people}
            onChange={(next) => onEdit(retitleForOwner(task.title, next))}
          />
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
          {asanaMismatch(task) && (
            <span className="asana-open-tag" title="Ticked off here, still open in Asana">
              Still open in Asana
            </span>
          )}
        </div>
      </div>
      {!editing && (
        <button
          className="task-edit"
          onClick={startEdit}
          title="Edit task"
          aria-label="Edit task"
        >
          <PencilIcon />
        </button>
      )}
    </div>
  );
}

export default function PersonView({
  person,
  projects,
  onToggleTask,
  onEditTask,
  onSelectProject,
  people,
}: {
  person: string;
  projects: Project[];
  people: string[];
  onToggleTask: (projectId: string, taskId: string, done: boolean) => void;
  onEditTask: (projectId: string, taskId: string, title: string) => void;
  onSelectProject: (section: string, projectId: string) => void;
}) {
  const [meetings, setMeetings] = useState<ClientMeeting[] | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [showAllMentions, setShowAllMentions] = useState(false);

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
            .filter((t) => !t.hidden && ownerOf(t.title) === person)
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
    return (
      <PersonTask
        key={task.id}
        task={task}
        project={project}
        person={person}
        people={people}
        onToggle={() => onToggleTask(project.id, task.id, !task.done)}
        onEdit={(title) => onEditTask(project.id, task.id, title)}
        onSelectProject={() => onSelectProject(project.section, project.id)}
      />
    );
  }

  return (
    <div className="person-page">
      <div className="page-header">
        <div className="header-left">
          <div className="week-label">Team</div>
          <div className="week-title">{person}&apos;s to-dos</div>
          {person === DEFAULT_OWNER && (
            <div className="client-team">
              Includes every task without someone else&apos;s name in front.
            </div>
          )}
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
          {person === "Adam" && (
            <AdamAgendaPanel projects={projects} onSelectProject={onSelectProject} />
          )}
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
              (showAllMentions ? mentions : mentions.slice(0, MENTIONS_SHOWN)).map(({ meeting, step, project }, i) => (
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
            {mentions.length > MENTIONS_SHOWN && (
              <button
                className="completed-toggle"
                onClick={() => setShowAllMentions((v) => !v)}
              >
                {showAllMentions ? "Show fewer" : `Show ${mentions.length - MENTIONS_SHOWN} more`}
              </button>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
