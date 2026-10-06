"use client";

import { useRef, useState } from "react";
import { normalizeUrl } from "@/components/WorkspaceLink";
import type {
  IntakeDraft,
  MilestoneKind,
  ProjectPhase,
  Status,
  Week,
} from "@/lib/types";

const PHASES: ProjectPhase[] = ["discovery", "strategy", "design", "production", "delivery"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function emptyDraft(): IntakeDraft {
  return {
    name: "",
    status: "active",
    project_phase: null,
    team: [],
    workspace_url: "",
    milestones: [],
    tasks: [],
    blockers: [],
  };
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// The parse route returns whatever the model produced; coerce it into a
// well-formed draft so the form never has to deal with missing fields.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw: any): IntakeDraft {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    name: str(raw?.name),
    status: raw?.status === "retainer" ? "retainer" : "active",
    project_phase: PHASES.includes(raw?.project_phase) ? raw.project_phase : null,
    team: arr(raw?.team).map(str).filter(Boolean),
    workspace_url: "",
    milestones: arr(raw?.milestones)
      .map((m) => ({
        title: str(m?.title),
        date: ISO_DATE.test(str(m?.date)) ? str(m?.date) : "",
        kind: (m?.kind === "invoice" ? "invoice" : "milestone") as MilestoneKind,
      }))
      .filter((m) => m.title)
      .sort((a, b) => (a.date || "9").localeCompare(b.date || "9")),
    tasks: arr(raw?.tasks)
      .map((t) => ({
        title: str(t?.title),
        week: (t?.week === "next" ? "next" : "this") as Week,
      }))
      .filter((t) => t.title),
    blockers: arr(raw?.blockers).map(str).filter(Boolean),
  };
}

export default function IntakeModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: IntakeDraft) => Promise<void>;
}) {
  const [step, setStep] = useState<"start" | "review">("start");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<IntakeDraft>(emptyDraft);
  const [teamText, setTeamText] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function pickFile(f: File | undefined | null) {
    setError(null);
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("That isn't a PDF. Drop in a PDF, or paste the details below.");
      return;
    }
    setFile(f);
  }

  async function readTimeline() {
    setReading(true);
    setError(null);
    try {
      const body = new FormData();
      if (file) body.append("file", file);
      body.append("notes", notes);
      body.append("today", todayIso());
      const res = await fetch("/api/intake/parse", { method: "POST", body });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.draft) {
        throw new Error(result.error || "Couldn't read that. You can fill in the form by hand.");
      }
      const next = normalize(result.draft);
      setDraft(next);
      setTeamText(next.team.join(", "));
      setStep("review");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(false);
    }
  }

  function startManual() {
    setDraft(emptyDraft());
    setTeamText("");
    setError(null);
    setStep("review");
  }

  function update<K extends keyof IntakeDraft>(key: K, value: IntakeDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    const cleaned: IntakeDraft = {
      ...draft,
      name: draft.name.trim(),
      workspace_url: normalizeUrl(draft.workspace_url),
      team: teamText.split(",").map((t) => t.trim()).filter(Boolean),
      milestones: draft.milestones
        .map((m) => ({ ...m, title: m.title.trim() }))
        .filter((m) => m.title && m.date),
      tasks: draft.tasks.map((t) => ({ ...t, title: t.title.trim() })).filter((t) => t.title),
      blockers: draft.blockers.map((b) => b.trim()).filter(Boolean),
    };
    if (!cleaned.name) {
      setError("Give the project a name.");
      return;
    }
    const undated = draft.milestones.filter((m) => m.title.trim() && !m.date).length;
    if (undated > 0) {
      setError(`${undated} timeline item${undated > 1 ? "s need" : " needs"} a date (or remove ${undated > 1 ? "them" : "it"}).`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(cleaned);
    } catch (e) {
      setError((e as Error).message || "Couldn't save. Try again.");
      setSaving(false);
    }
  }

  const canRead = !!file || notes.trim().length > 0;

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget && !reading && !saving) onClose();
      }}
    >
      <div className="modal intake-modal">
        <div className="intake-head">
          <div>
            <div className="week-label">Active clients</div>
            <div className="modal-title intake-title">New project intake</div>
          </div>
          <button className="intake-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {step === "start" ? (
          <div className="intake-body">
            <div
              className={`intake-drop ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0]);
              }}
            >
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf"
                hidden
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              {file ? (
                <>
                  <div className="intake-drop-main">{file.name}</div>
                  <div className="intake-drop-sub">
                    {(file.size / 1024 / 1024).toFixed(1)} MB ·{" "}
                    <button
                      className="intake-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="intake-drop-main">Drop the timeline PDF here</div>
                  <div className="intake-drop-sub">or click to choose a file</div>
                </>
              )}
            </div>

            <div className="modal-field">
              <div className="modal-label">Or paste details (scope, dates, team, anything useful)</div>
              <textarea
                className="modal-input intake-textarea"
                placeholder="e.g. Brand refresh for Acme. Kickoff Oct 14, strategy presentation Oct 28, design round 1 Nov 11, final files Dec 5. 50% invoice at kickoff, 50% on delivery. Team: Nicole, Adam."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && <div className="intake-error">{error}</div>}

            <div className="modal-actions intake-actions">
              <button className="btn" onClick={startManual} disabled={reading}>
                Fill in by hand
              </button>
              <button
                className="btn btn-primary"
                onClick={readTimeline}
                disabled={!canRead || reading}
              >
                {reading ? "Reading timeline…" : "Read and fill in"}
              </button>
            </div>
          </div>
        ) : (
          <div className="intake-body">
            <div className="intake-grid">
              <div className="modal-field intake-span">
                <div className="modal-label">Project name</div>
                <input
                  className="modal-input"
                  value={draft.name}
                  placeholder="Client or project name"
                  onChange={(e) => update("name", e.target.value)}
                  autoFocus={!draft.name}
                />
              </div>
              <div className="modal-field">
                <div className="modal-label">Type</div>
                <select
                  className="modal-select"
                  value={draft.status}
                  onChange={(e) => update("status", e.target.value as Status)}
                >
                  <option value="active">Project</option>
                  <option value="retainer">Retainer</option>
                </select>
              </div>
              <div className="modal-field">
                <div className="modal-label">Current phase</div>
                <select
                  className="modal-select"
                  value={draft.project_phase ?? ""}
                  onChange={(e) =>
                    update("project_phase", (e.target.value || null) as ProjectPhase | null)
                  }
                >
                  <option value="">Not set</option>
                  {PHASES.map((p) => (
                    <option key={p} value={p}>
                      {p[0].toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-field intake-span">
                <div className="modal-label">Workspace link (optional)</div>
                <input
                  className="modal-input"
                  value={draft.workspace_url}
                  placeholder="Figma, Drive folder, Notion page…"
                  onChange={(e) => update("workspace_url", e.target.value)}
                />
              </div>
              <div className="modal-field intake-span">
                <div className="modal-label">Team (comma separated)</div>
                <input
                  className="modal-input"
                  value={teamText}
                  placeholder="e.g. Nicole, Adam"
                  onChange={(e) => setTeamText(e.target.value)}
                />
              </div>
            </div>

            <IntakeList
              title="Timeline"
              empty="No dates yet."
              addLabel="+ Add date"
              onAdd={() =>
                update("milestones", [...draft.milestones, { title: "", date: "", kind: "milestone" }])
              }
            >
              {draft.milestones.map((m, i) => (
                <div className="intake-row" key={i}>
                  <input
                    type="date"
                    className={`modal-input intake-date ${m.date ? "" : "missing"}`}
                    value={m.date}
                    onChange={(e) =>
                      update(
                        "milestones",
                        draft.milestones.map((x, j) => (j === i ? { ...x, date: e.target.value } : x))
                      )
                    }
                  />
                  <input
                    className="modal-input"
                    value={m.title}
                    placeholder="What's due"
                    onChange={(e) =>
                      update(
                        "milestones",
                        draft.milestones.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                      )
                    }
                  />
                  <select
                    className="modal-select intake-kind"
                    value={m.kind}
                    onChange={(e) =>
                      update(
                        "milestones",
                        draft.milestones.map((x, j) =>
                          j === i ? { ...x, kind: e.target.value as MilestoneKind } : x
                        )
                      )
                    }
                  >
                    <option value="milestone">Milestone</option>
                    <option value="invoice">Invoice</option>
                  </select>
                  <RemoveButton
                    onClick={() => update("milestones", draft.milestones.filter((_, j) => j !== i))}
                  />
                </div>
              ))}
            </IntakeList>

            <IntakeList
              title="Tasks"
              empty="No tasks yet."
              addLabel="+ Add task"
              onAdd={() => update("tasks", [...draft.tasks, { title: "", week: "this" }])}
            >
              {draft.tasks.map((t, i) => (
                <div className="intake-row" key={i}>
                  <input
                    className="modal-input"
                    value={t.title}
                    placeholder="Task"
                    onChange={(e) =>
                      update(
                        "tasks",
                        draft.tasks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                      )
                    }
                  />
                  <select
                    className="modal-select intake-kind"
                    value={t.week}
                    onChange={(e) =>
                      update(
                        "tasks",
                        draft.tasks.map((x, j) => (j === i ? { ...x, week: e.target.value as Week } : x))
                      )
                    }
                  >
                    <option value="this">This week</option>
                    <option value="next">Next week</option>
                  </select>
                  <RemoveButton onClick={() => update("tasks", draft.tasks.filter((_, j) => j !== i))} />
                </div>
              ))}
            </IntakeList>

            <IntakeList
              title="Blockers"
              empty="No blockers."
              addLabel="+ Add blocker"
              onAdd={() => update("blockers", [...draft.blockers, ""])}
            >
              {draft.blockers.map((b, i) => (
                <div className="intake-row" key={i}>
                  <input
                    className="modal-input"
                    value={b}
                    placeholder="What's holding things up"
                    onChange={(e) =>
                      update(
                        "blockers",
                        draft.blockers.map((x, j) => (j === i ? e.target.value : x))
                      )
                    }
                  />
                  <RemoveButton
                    onClick={() => update("blockers", draft.blockers.filter((_, j) => j !== i))}
                  />
                </div>
              ))}
            </IntakeList>

            {error && <div className="intake-error">{error}</div>}

            <div className="modal-actions intake-actions">
              <button
                className="btn"
                onClick={() => {
                  setError(null);
                  setStep("start");
                }}
                disabled={saving}
              >
                Back
              </button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? "Adding…" : "Add to Active clients"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IntakeList({
  title,
  empty,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  empty: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode[];
}) {
  return (
    <div className="intake-list">
      <div className="intake-list-title">{title}</div>
      {children.length === 0 && <div className="intake-empty">{empty}</div>}
      {children}
      <button className="nav-add intake-add" onClick={onAdd}>
        {addLabel}
      </button>
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="intake-remove" onClick={onClick} aria-label="Remove">
      ×
    </button>
  );
}
