"use client";

import { useMemo, useState } from "react";
import LinkedText from "@/components/LinkedText";
import {
  BUCKETS,
  DEFAULT_OWNER,
  bucketFor,
  formatDue,
  mondayOf,
  ownerOf,
  parseIso,
  startOfToday,
  type Bucket,
} from "@/components/PersonView";
import type { Milestone, Project, Task } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

type Item =
  | { kind: "task"; task: Task; project: Project; owner: string; date: string | null }
  | { kind: "milestone"; milestone: Milestone; project: Project; date: string };

// Milestones only show from today on: past ones are history, not upcoming work.
function milestoneBucket(iso: string): Bucket | null {
  const day = parseIso(iso);
  const today = startOfToday();
  if (day < today) return null;
  const diff = Math.round((day.getTime() - mondayOf(today).getTime()) / DAY_MS);
  if (diff < 7) return "this";
  if (diff < 14) return "next";
  return "later";
}

function bucketOf(item: Item): Bucket | null {
  return item.kind === "task" ? bucketFor(item.task) : milestoneBucket(item.date);
}

export default function UpcomingView({
  projects,
  onToggleTask,
  onSelectProject,
}: {
  projects: Project[];
  onToggleTask: (projectId: string, taskId: string, done: boolean) => void;
  onSelectProject: (section: string, projectId: string) => void;
}) {
  const [owner, setOwner] = useState<string>("all");
  const [clientId, setClientId] = useState<string>("all");
  const [showMilestones, setShowMilestones] = useState(true);

  const live = useMemo(
    () => projects.filter((p) => p.section !== "Archived"),
    [projects]
  );

  const items: Item[] = useMemo(
    () =>
      live.flatMap((project) => [
        ...project.tasks
          .filter((t) => !t.done && !t.hidden)
          .map(
            (task): Item => ({
              kind: "task",
              task,
              project,
              owner: ownerOf(task.title),
              date: task.due_date,
            })
          ),
        ...project.timeline_milestones
          .filter((m) => !m.completed)
          .map(
            (milestone): Item => ({
              kind: "milestone",
              milestone,
              project,
              date: milestone.date,
            })
          ),
      ]),
    [live]
  );

  // Everyone with at least one open task, the dashboard owner first.
  const owners = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of items) {
      if (i.kind === "task") counts.set(i.owner, (counts.get(i.owner) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, z) =>
      a[0] === DEFAULT_OWNER ? -1 : z[0] === DEFAULT_OWNER ? 1 : z[1] - a[1]
    );
  }, [items]);

  const filtered = items.filter((i) => {
    if (clientId !== "all" && i.project.id !== clientId) return false;
    if (i.kind === "milestone") return showMilestones && owner === "all";
    return owner === "all" || i.owner === owner;
  });

  const byBucket = (b: Bucket) =>
    filtered
      .filter((i) => bucketOf(i) === b)
      .sort((a, z) => {
        const d = (a.date ?? "9999").localeCompare(z.date ?? "9999");
        return d !== 0 ? d : a.project.name.localeCompare(z.project.name);
      });

  const openTasks = filtered.filter((i) => i.kind === "task");
  const overdue = byBucket("overdue").length;
  const thisWeek = byBucket("this").filter((i) => i.kind === "task").length;
  const nextWeek = byBucket("next").filter((i) => i.kind === "task").length;
  const milestonesAhead = filtered.filter(
    (i) => i.kind === "milestone" && bucketOf(i) !== null
  ).length;

  function renderItem(item: Item) {
    const { project } = item;
    const clientChip = (
      <button
        className="person-client"
        onClick={() => onSelectProject(project.section, project.id)}
      >
        {project.name}
      </button>
    );

    if (item.kind === "milestone") {
      const m = item.milestone;
      return (
        <div className="person-task upcoming-milestone" key={`m-${m.id}`}>
          <span className={`upcoming-diamond ${m.kind === "invoice" ? "invoice" : ""}`} />
          <div className="person-task-body">
            <div className="person-task-title">
              <LinkedText text={m.title} />
            </div>
            <div className="person-task-meta">
              {clientChip}
              <span className="upcoming-kind">
                {m.kind === "invoice" ? "Invoice" : "Milestone"}
              </span>
              <span className="person-due">{formatDue(m.date)}</span>
            </div>
          </div>
        </div>
      );
    }

    const { task } = item;
    const isOverdue = bucketFor(task) === "overdue";
    return (
      <div className="person-task" key={task.id}>
        <button
          className="task-check"
          onClick={() => onToggleTask(project.id, task.id, true)}
          aria-label="Mark done"
        />
        <div className="person-task-body">
          <div className="person-task-title">
            <LinkedText text={task.title} />
          </div>
          <div className="person-task-meta">
            {clientChip}
            <span className="upcoming-owner">{item.owner}</span>
            {task.due_date ? (
              <span className={`person-due ${isOverdue ? "overdue" : ""}`}>
                Due {formatDue(task.due_date)}
              </span>
            ) : (
              <span className="person-due">No date</span>
            )}
            {task.carried_over && <span className="carried-tag">Carried over</span>}
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
          <div className="week-label">State of Affairs</div>
          <div className="week-title">Upcoming work</div>
          <div className="client-team">
            Every open task and upcoming milestone, across all clients and people.
          </div>
        </div>
      </div>

      <div className="stats person-stats">
        <div className={`stat ${overdue > 0 ? "stat-alert" : ""}`}>
          <div className="stat-n">{overdue}</div>
          <div className="stat-l">Overdue</div>
        </div>
        <div className="stat">
          <div className="stat-n">{thisWeek}</div>
          <div className="stat-l">This week</div>
        </div>
        <div className="stat">
          <div className="stat-n">{nextWeek}</div>
          <div className="stat-l">Next week</div>
        </div>
        <div className="stat">
          <div className="stat-n">{milestonesAhead}</div>
          <div className="stat-l">Milestones ahead</div>
        </div>
      </div>

      <div className="upcoming-filters">
        <div className="upcoming-pills">
          <button
            className={`upcoming-pill ${owner === "all" ? "active" : ""}`}
            onClick={() => setOwner("all")}
          >
            Everyone
          </button>
          {owners.map(([name, n]) => (
            <button
              key={name}
              className={`upcoming-pill ${owner === name ? "active" : ""}`}
              onClick={() => setOwner(name)}
            >
              {name} <span className="person-count">{n}</span>
            </button>
          ))}
        </div>
        <div className="upcoming-controls">
          <select
            className="upcoming-select"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            aria-label="Filter by client"
          >
            <option value="all">All clients</option>
            {live
              .slice()
              .sort((a, z) => a.name.localeCompare(z.name))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <label className="upcoming-toggle">
            <input
              type="checkbox"
              checked={showMilestones}
              onChange={(e) => setShowMilestones(e.target.checked)}
            />
            Milestones
          </label>
        </div>
      </div>

      <section className="client-panel">
        {openTasks.length === 0 && milestonesAhead === 0 && (
          <div className="empty-state">Nothing upcoming for this filter.</div>
        )}
        {BUCKETS.map(({ key, label }) => {
          const list = byBucket(key);
          if (list.length === 0) return null;
          return (
            <div className={`person-group person-group-${key}`} key={key}>
              <div className="intel-title">
                {label} <span className="person-count">{list.length}</span>
              </div>
              {list.map(renderItem)}
            </div>
          );
        })}
      </section>
    </div>
  );
}
