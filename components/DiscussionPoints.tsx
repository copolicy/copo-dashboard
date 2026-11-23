"use client";

import { useEffect, useMemo, useState } from "react";
import LinkedText from "@/components/LinkedText";
import {
  addDiscussionPoint,
  deleteDiscussionPoint,
  fetchDiscussionPoints,
  setDiscussionPointDone,
  updateDiscussionPointText,
} from "@/lib/data";
import type { DiscussionPoint, Project } from "@/lib/types";

// "To cover with Adam": a running list per client of things Nicole wants to
// raise with Adam that are not tasks yet. Ticking one off marks it covered.
// "Make task" turns it into a task on the client and marks it covered.

function PointRow({
  point,
  clientLabel,
  onToggle,
  onEdit,
  onDelete,
  onMakeTask,
  onSelectClient,
}: {
  point: DiscussionPoint;
  clientLabel?: string;
  onToggle: () => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onMakeTask?: () => void;
  onSelectClient?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(point.text);

  function commit() {
    const v = value.trim();
    setEditing(false);
    if (v && v !== point.text) onEdit(v);
    else setValue(point.text);
  }

  return (
    <div className="task-row discussion-row">
      <button
        className={`task-check ${point.done ? "checked" : ""}`}
        onClick={onToggle}
        aria-label={point.done ? "Mark as not covered" : "Mark as covered"}
        title={point.done ? "Mark as not covered" : "Covered"}
      />
      {editing ? (
        <input
          className="task-edit-input"
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setValue(point.text);
              setEditing(false);
            }
          }}
        />
      ) : (
        <div
          className={`task-label ${point.done ? "checked" : ""}`}
          onDoubleClick={() => setEditing(true)}
          title="Double-click to edit"
        >
          {clientLabel && (
            <button className="discussion-client" onClick={onSelectClient}>
              {clientLabel}
            </button>
          )}
          <LinkedText text={point.text} />
        </div>
      )}
      {onMakeTask && !point.done && !editing && (
        <button className="discussion-make-task" onClick={onMakeTask} title="Add this as a task">
          Make task
        </button>
      )}
      <button
        className="task-delete"
        onClick={onDelete}
        title="Remove"
        aria-label="Remove"
      >
        ×
      </button>
    </div>
  );
}

function usePointActions(setPoints: (fn: (prev: DiscussionPoint[]) => DiscussionPoint[]) => void) {
  const [error, setError] = useState<string | null>(null);
  const fail = (e: unknown) => setError(String((e as Error).message ?? e));

  return {
    error,
    toggle(p: DiscussionPoint, done = !p.done) {
      setPoints((prev) =>
        prev.map((x) =>
          x.id === p.id ? { ...x, done, done_at: done ? new Date().toISOString() : null } : x
        )
      );
      setDiscussionPointDone(p.id, done).catch(fail);
    },
    edit(p: DiscussionPoint, text: string) {
      setPoints((prev) => prev.map((x) => (x.id === p.id ? { ...x, text } : x)));
      updateDiscussionPointText(p.id, text).catch(fail);
    },
    remove(p: DiscussionPoint) {
      setPoints((prev) => prev.filter((x) => x.id !== p.id));
      deleteDiscussionPoint(p.id).catch(fail);
    },
    setError,
  };
}

// On a client page.
export function ClientDiscussionPanel({
  projectId,
  onMakeTask,
}: {
  projectId: string;
  onMakeTask: (title: string) => void;
}) {
  const [points, setPoints] = useState<DiscussionPoint[] | null>(null);
  const [draft, setDraft] = useState("");
  const [showCovered, setShowCovered] = useState(false);
  const actions = usePointActions((fn) => setPoints((prev) => fn(prev ?? [])));

  useEffect(() => {
    fetchDiscussionPoints(projectId)
      .then(setPoints)
      .catch((e) => {
        setPoints([]);
        actions.setError(String(e.message ?? e));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function add() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    try {
      const p = await addDiscussionPoint(projectId, text);
      setPoints((prev) => [...(prev ?? []), p]);
    } catch (e) {
      setDraft(text);
      actions.setError(String((e as Error).message ?? e));
    }
  }

  const open = (points ?? []).filter((p) => !p.done);
  const covered = (points ?? [])
    .filter((p) => p.done)
    .sort((a, z) => (z.done_at ?? "").localeCompare(a.done_at ?? ""));

  return (
    <section className="client-panel discussion-panel">
      <div className="client-panel-head">
        <div className="intel-title">To cover with Adam</div>
        {open.length > 0 && <div className="client-synced">{open.length} open</div>}
      </div>
      {points === null ? (
        <div className="empty-state">Loading…</div>
      ) : (
        <>
          {open.length === 0 && (
            <div className="empty-state">
              Nothing to raise yet. Jot down anything to talk through with Adam that isn&apos;t a
              task yet.
            </div>
          )}
          <div className="task-list">
            {open.map((p) => (
              <PointRow
                key={p.id}
                point={p}
                onToggle={() => actions.toggle(p)}
                onEdit={(t) => actions.edit(p, t)}
                onDelete={() => actions.remove(p)}
                onMakeTask={() => {
                  onMakeTask(p.text);
                  actions.toggle(p, true);
                }}
              />
            ))}
          </div>
        </>
      )}
      <div className="add-task-row">
        <input
          className="add-task-input"
          placeholder="Add something to cover…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="add-task-btn" onClick={add}>
          Add
        </button>
      </div>
      {covered.length > 0 && (
        <>
          <button className="completed-toggle" onClick={() => setShowCovered((v) => !v)}>
            {showCovered ? "Hide covered" : `Show ${covered.length} covered`}
          </button>
          {showCovered && (
            <div className="task-list">
              {covered.map((p) => (
                <PointRow
                  key={p.id}
                  point={p}
                  onToggle={() => actions.toggle(p)}
                  onEdit={(t) => actions.edit(p, t)}
                  onDelete={() => actions.remove(p)}
                />
              ))}
            </div>
          )}
        </>
      )}
      {actions.error && <div className="intake-error">{actions.error}</div>}
    </section>
  );
}

// On Adam's page: every open point across clients, grouped by client.
export function AdamAgendaPanel({
  projects,
  onSelectProject,
}: {
  projects: Project[];
  onSelectProject: (section: string, projectId: string) => void;
}) {
  const [points, setPoints] = useState<DiscussionPoint[] | null>(null);
  const actions = usePointActions((fn) => setPoints((prev) => fn(prev ?? [])));

  useEffect(() => {
    fetchDiscussionPoints()
      .then(setPoints)
      .catch((e) => {
        setPoints([]);
        actions.setError(String(e.message ?? e));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    const byId = new Map(projects.map((p) => [p.id, p]));
    const map = new Map<string, { project: Project; points: DiscussionPoint[] }>();
    for (const pt of points ?? []) {
      // Keep ones ticked off during this visit visible, so a mis-click is easy to undo.
      const project = byId.get(pt.project_id);
      if (!project || project.section === "Archived") continue;
      const g = map.get(project.id) ?? { project, points: [] };
      g.points.push(pt);
      map.set(project.id, g);
    }
    return Array.from(map.values());
  }, [points, projects]);

  const [startedOpen] = useState(() => new Set<string>());
  useEffect(() => {
    for (const p of points ?? []) if (!p.done) startedOpen.add(p.id);
  }, [points, startedOpen]);

  const visibleGroups = groups
    .map((g) => ({ ...g, points: g.points.filter((p) => !p.done || startedOpen.has(p.id)) }))
    .filter((g) => g.points.length > 0);
  const openCount = (points ?? []).filter((p) => !p.done).length;

  return (
    <section className="client-panel discussion-panel">
      <div className="client-panel-head">
        <div className="intel-title">To cover with Adam</div>
        {openCount > 0 && <div className="client-synced">{openCount} open</div>}
      </div>
      {points === null ? (
        <div className="empty-state">Loading…</div>
      ) : visibleGroups.length === 0 ? (
        <div className="empty-state">
          Nothing to cover. Add points from any client page under &quot;To cover with Adam&quot;.
        </div>
      ) : (
        visibleGroups.map((g) => (
          <div className="discussion-group" key={g.project.id}>
            <button
              className="discussion-group-head"
              onClick={() => onSelectProject(g.project.section, g.project.id)}
            >
              {g.project.name}
            </button>
            <div className="task-list">
              {g.points.map((p) => (
                <PointRow
                  key={p.id}
                  point={p}
                  onToggle={() => actions.toggle(p)}
                  onEdit={(t) => actions.edit(p, t)}
                  onDelete={() => actions.remove(p)}
                />
              ))}
            </div>
          </div>
        ))
      )}
      {actions.error && <div className="intake-error">{actions.error}</div>}
    </section>
  );
}
