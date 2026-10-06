"use client";

import { useEffect, useRef, useState } from "react";
import LinkedText, { isUrl, withLink } from "@/components/LinkedText";
import WorkspaceLink from "@/components/WorkspaceLink";
import type {
  Milestone,
  MilestoneKind,
  PipelineStage,
  Project,
  ProjectPhase,
  Status,
  Task,
  Week,
} from "@/lib/types";
import DatePicker from "./DatePicker";

const DAY_MS = 24 * 60 * 60 * 1000;

const STAGE_LABELS: Record<PipelineStage, string> = {
  talks: "Talks",
  proposal: "Proposal",
  refinement: "Refinement",
  closed_won: "Closed · Won",
  closed_lost: "Closed · Lost",
  ghost: "Ghosted",
};

const CLOSED_STAGES: PipelineStage[] = ["closed_lost", "ghost"];

const PHASE_LABELS: Record<ProjectPhase, string> = {
  discovery: "Discovery",
  strategy: "Strategy",
  design: "Design",
  production: "Production",
  delivery: "Delivery",
};

function badgeClass(status: Status) {
  if (status === "retainer") return "badge badge-retainer";
  if (status === "wrapping") return "badge badge-wrap";
  if (status === "pipeline") return "badge badge-pipeline";
  return "badge badge-active";
}

function dotClass(status: Status, closed: boolean) {
  if (closed) return "dot-wrap";
  if (status === "retainer") return "dot-retainer";
  if (status === "wrapping") return "dot-wrap";
  if (status === "pipeline") return "dot-pip";
  return "dot-active";
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isFlagged(dateIso: string, windowDays = 7) {
  const target = new Date(dateIso + "T00:00:00").getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysOut = (target - today.getTime()) / DAY_MS;
  return daysOut >= 0 && daysOut <= windowDays;
}

// Which work week (Mon to Sun) a YYYY-MM-DD date falls in, relative to today.
function weekBucket(iso: string): "this" | "next" | null {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const diffDays = Math.round((date.getTime() - monday.getTime()) / DAY_MS);
  if (diffDays >= 0 && diffDays < 7) return "this";
  if (diffDays >= 7 && diffDays < 14) return "next";
  return null;
}

// Where a task shows: by its due date when it has one (overdue counts as
// this week), otherwise by the week it was added to.
function taskWeek(task: Task): Week {
  if (!task.due_date) return task.week;
  const [y, m, d] = task.due_date.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  if (due < monday) return "this";
  return weekBucket(task.due_date) ?? task.week;
}

function isOverdue(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(y, m - 1, d) < today;
}

function formatDue(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// A timeline item shown inside a week column. Ticking it ticks the
// milestone itself, so the timeline and the week stay in sync.
function DueRow({
  milestone,
  onToggle,
}: {
  milestone: Milestone;
  onToggle: () => void;
}) {
  return (
    <div className={`task-row due-row ${milestone.kind === "invoice" ? "due-invoice" : ""}`}>
      <button
        className={`task-check ${milestone.completed ? "checked" : ""}`}
        onClick={onToggle}
        aria-label="Toggle timeline item"
      />
      <div className={`task-label ${milestone.completed ? "checked" : ""}`}>
        <span className="due-tag">
          {milestone.kind === "invoice" ? "Invoice" : "Due"} {formatDue(milestone.date)}
        </span>
        <LinkedText text={milestone.title} />
      </div>
    </div>
  );
}

// Pasting a link over selected words turns those words into the link.
function pasteLinkOverSelection(
  e: React.ClipboardEvent<HTMLInputElement>,
  setValue: (v: string) => void
) {
  const pasted = e.clipboardData.getData("text");
  const input = e.currentTarget;
  const start = input.selectionStart ?? 0;
  const end = input.selectionEnd ?? 0;
  if (!isUrl(pasted) || start === end) return;
  e.preventDefault();
  const v = input.value;
  setValue(v.slice(0, start) + withLink(v.slice(start, end), pasted) + v.slice(end));
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  onEdit,
  onChangeDue,
  onMoveWeek,
  moveDirection,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (title: string) => void;
  onChangeDue: (dueDate: string | null) => void;
  onMoveWeek: () => void;
  moveDirection: "next" | "prev";
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);

  function commit() {
    const trimmed = value.trim();
    setEditing(false);
    if (trimmed && trimmed !== task.title) onEdit(trimmed);
    else setValue(task.title);
  }

  return (
    <div className="task-row">
      <button
        className={`task-check ${task.done ? "checked" : ""}`}
        onClick={onToggle}
        aria-label="Toggle task"
      />
      {editing ? (
        <input
          className="task-edit-input"
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onPaste={(e) => pasteLinkOverSelection(e, setValue)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setValue(task.title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <div
          className={`task-label ${task.done ? "checked" : ""}`}
          onDoubleClick={() => setEditing(true)}
          title="Double-click to edit"
        >
          {task.carried_over && !task.done && (
            <span className="carried-tag" title="Not finished last week">
              Carried over
            </span>
          )}
          <LinkedText text={task.title} />
        </div>
      )}
      <DatePicker
        value={task.due_date ?? ""}
        onChange={(d) => onChangeDue(d)}
        onClear={() => onChangeDue(null)}
        placeholder="+ Due"
        format={(iso) => `Due ${formatDue(iso)}`}
        className={`task-due ${task.due_date ? "has-date" : "empty"} ${
          task.due_date && !task.done && isOverdue(task.due_date) ? "overdue" : ""
        }`}
      />
      {!task.due_date && (
        <button
          className="task-move"
          onClick={onMoveWeek}
          title={moveDirection === "next" ? "Move to next week" : "Move to this week"}
          aria-label="Move to other week"
        >
          {moveDirection === "next" ? "→" : "←"}
        </button>
      )}
      <button className="task-delete" onClick={onDelete}>
        ×
      </button>
    </div>
  );
}

function TaskColumn({
  label,
  tasks,
  due,
  onToggleDue,
  onToggle,
  onDelete,
  onAdd,
  onEdit,
  onChangeDue,
  onMoveWeek,
  moveDirection,
}: {
  label: string;
  tasks: Task[];
  due: Milestone[];
  onToggleDue: (id: string, completed: boolean) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (title: string, dueDate: string | null) => void;
  onEdit: (id: string, title: string) => void;
  onChangeDue: (id: string, dueDate: string | null) => void;
  onMoveWeek: (id: string) => void;
  moveDirection: "next" | "prev";
}) {
  const [value, setValue] = useState("");
  const [dueDraft, setDueDraft] = useState("");
  const [link, setLink] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const activeTasks = tasks.filter((t) => !t.done);
  const completedTasks = tasks.filter((t) => t.done);

  function submit() {
    const title = withLink(value, link);
    if (!title) return;
    onAdd(title, dueDraft || null);
    setValue("");
    setDueDraft("");
    setLink("");
    setLinkOpen(false);
  }

  return (
    <div>
      <div className="col-head">{label}</div>
      <div className="task-list">
        {due.map((m) => (
          <DueRow
            key={m.id}
            milestone={m}
            onToggle={() => onToggleDue(m.id, !m.completed)}
          />
        ))}
        {activeTasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            onToggle={() => onToggle(t.id)}
            onDelete={() => onDelete(t.id)}
            onEdit={(title) => onEdit(t.id, title)}
            onChangeDue={(d) => onChangeDue(t.id, d)}
            onMoveWeek={() => onMoveWeek(t.id)}
            moveDirection={moveDirection}
          />
        ))}
      </div>
      {completedTasks.length > 0 && (
        <div className="completed-section">
          <button
            className="completed-toggle"
            onClick={() => setShowCompleted((v) => !v)}
          >
            {showCompleted ? "▾" : "▸"} Completed ({completedTasks.length})
          </button>
          {showCompleted && (
            <div className="task-list">
              {completedTasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onToggle={() => onToggle(t.id)}
                  onDelete={() => onDelete(t.id)}
                  onEdit={(title) => onEdit(t.id, title)}
                  onChangeDue={(d) => onChangeDue(t.id, d)}
                  onMoveWeek={() => onMoveWeek(t.id)}
                  moveDirection={moveDirection}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="add-task-row">
        <input
          className="add-task-input"
          placeholder="Add task…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPaste={(e) => pasteLinkOverSelection(e, setValue)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <DatePicker
          value={dueDraft}
          onChange={setDueDraft}
          onClear={() => setDueDraft("")}
          placeholder="Due"
          format={formatDue}
          className={`add-task-due ${dueDraft ? "has-date" : ""}`}
        />
        <button
          className={`add-task-btn add-link-btn ${linkOpen || link ? "on" : ""}`}
          onClick={() => setLinkOpen((o) => !o)}
          title="Add a link"
          aria-label="Add a link"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
            <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
          </svg>
        </button>
        <button className="add-task-btn" onClick={submit}>
          +
        </button>
      </div>
      {linkOpen && (
        <div className="add-task-row add-link-row">
          <input
            className="add-task-input"
            placeholder="Paste link (Figma, Drive, anything)"
            value={link}
            autoFocus
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") {
                setLink("");
                setLinkOpen(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

function TimelineSection({
  milestones,
  onAdd,
  onToggleCompleted,
  onDelete,
}: {
  milestones: Milestone[];
  onAdd: (title: string, date: string, kind: MilestoneKind) => void;
  onToggleCompleted: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<MilestoneKind>("milestone");

  function submit() {
    const trimmed = title.trim();
    if (!trimmed || !date) return;
    onAdd(trimmed, date, kind);
    setTitle("");
    setDate("");
    setKind("milestone");
  }

  return (
    <div className="timeline">
      <div className="timeline-head">Timeline</div>
      {milestones.map((m) => (
        <div
          className={`milestone ${m.completed ? "completed" : ""}`}
          key={m.id}
        >
          <button
            className={`task-check ${m.completed ? "checked" : ""}`}
            onClick={() => onToggleCompleted(m.id, !m.completed)}
            aria-label="Toggle completed"
          />
          <div className="milestone-date">{formatDate(m.date)}</div>
          <div className="milestone-label">
            {m.kind === "invoice" && (
              <span className="milestone-kind">💰 Invoice: </span>
            )}
            <LinkedText text={m.title} />
          </div>
          {!m.completed && isFlagged(m.date) && (
            <span className="milestone-flag">
              ⚠ {m.kind === "invoice" ? "Send soon" : "Due soon"}
            </span>
          )}
          <button className="task-delete" onClick={() => onDelete(m.id)}>
            ×
          </button>
        </div>
      ))}
      <div className="add-milestone-row">
        <DatePicker value={date} onChange={setDate} placeholder="Date" />
        <input
          className="add-task-input"
          placeholder="Milestone or invoice…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <select
          className="modal-select milestone-kind-select"
          value={kind}
          onChange={(e) => setKind(e.target.value as MilestoneKind)}
        >
          <option value="milestone">Milestone</option>
          <option value="invoice">Invoice</option>
        </select>
        <button className="add-task-btn" onClick={submit}>
          +
        </button>
      </div>
    </div>
  );
}

export default function ProjectCard({
  project,
  expanded,
  onToggleExpand,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  onEditTask,
  onChangeTaskDue,
  onMoveTaskWeek,
  onBlockerTextChange,
  onResolveBlocker,
  onChangeStage,
  onMoveToActive,
  onChangePhase,
  onChangeWorkspace,
  onAddMilestone,
  onToggleMilestoneCompleted,
  onDeleteMilestone,
}: {
  project: Project;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleTask: (taskId: string, done: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (week: Week, title: string, dueDate: string | null) => void;
  onEditTask: (taskId: string, title: string) => void;
  onChangeTaskDue: (taskId: string, dueDate: string | null) => void;
  onMoveTaskWeek: (taskId: string, week: Week) => void;
  onBlockerTextChange: (blockerId: string, text: string) => void;
  onResolveBlocker: (blockerId: string) => void;
  onChangeStage: (stage: PipelineStage) => void;
  onMoveToActive: () => void;
  onChangePhase: (phase: ProjectPhase | null) => void;
  onChangeWorkspace: (url: string | null) => void;
  onAddMilestone: (title: string, date: string, kind: MilestoneKind) => void;
  onToggleMilestoneCompleted: (id: string, completed: boolean) => void;
  onDeleteMilestone: (id: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded) {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [expanded]);

  const byDue = (a: Task, b: Task) =>
    (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
  const thisWeek = project.tasks.filter((t) => taskWeek(t) === "this").sort(byDue);
  const nextWeek = project.tasks.filter((t) => taskWeek(t) === "next").sort(byDue);
  const milestones = [...project.timeline_milestones].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const activeBlockers = project.blockers.filter((b) => !b.resolved);
  const isPipeline = project.status === "pipeline";
  const stage = project.pipeline_stage ?? "talks";
  const isClosed = isPipeline && CLOSED_STAGES.includes(stage);
  const showPhase = project.status === "active" || project.status === "retainer";

  return (
    <div className={`project-card ${isClosed ? "closed" : ""}`} ref={cardRef}>
      <div className="pc-header" onClick={onToggleExpand}>
        <div className={`pc-dot ${dotClass(project.status, isClosed)}`} />
        <div className="pc-info">
          <div className="pc-name">{project.name}</div>
          {project.team.length > 0 && (
            <div className="pc-team">{project.team.join(" · ")}</div>
          )}
          <div className="pc-badges">
            <span className={badgeClass(project.status)}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
            {isPipeline && (
              <select
                className="stage-select"
                value={stage}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  onChangeStage(e.target.value as PipelineStage);
                }}
              >
                {Object.entries(STAGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
            {isPipeline && (
              <button
                className="btn-move-active"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveToActive();
                }}
              >
                Move to Active →
              </button>
            )}
            {showPhase && (
              <select
                className="phase-select"
                value={project.project_phase ?? ""}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  onChangePhase(
                    e.target.value ? (e.target.value as ProjectPhase) : null
                  );
                }}
              >
                <option value="">No phase set</option>
                {Object.entries(PHASE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
            <WorkspaceLink url={project.workspace_url} onChange={onChangeWorkspace} />
            {activeBlockers.map((blocker) => (
              <span
                key={blocker.id}
                className="badge badge-blocker"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!expanded) onToggleExpand();
                }}
              >
                ⚠ <LinkedText text={blocker.text} />
              </span>
            ))}
          </div>
        </div>
        <div
          className="pc-chevron"
          style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          ▾
        </div>
      </div>

      {expanded && (
        <div className="pc-body">
          <div className="two-col">
            <TaskColumn
              label="This week"
              tasks={thisWeek}
              due={milestones.filter((m) => weekBucket(m.date) === "this")}
              onToggleDue={onToggleMilestoneCompleted}
              onToggle={(id) => {
                const t = project.tasks.find((x) => x.id === id);
                if (t) onToggleTask(id, !t.done);
              }}
              onDelete={onDeleteTask}
              onAdd={(title, due) => onAddTask(due ? (weekBucket(due) ?? "this") : "this", title, due)}
              onEdit={onEditTask}
              onChangeDue={onChangeTaskDue}
              onMoveWeek={(id) => onMoveTaskWeek(id, "next")}
              moveDirection="next"
            />
            <TaskColumn
              label="Next week"
              tasks={nextWeek}
              due={milestones.filter((m) => weekBucket(m.date) === "next")}
              onToggleDue={onToggleMilestoneCompleted}
              onToggle={(id) => {
                const t = project.tasks.find((x) => x.id === id);
                if (t) onToggleTask(id, !t.done);
              }}
              onDelete={onDeleteTask}
              onAdd={(title, due) => onAddTask(due ? (weekBucket(due) ?? "next") : "next", title, due)}
              onEdit={onEditTask}
              onChangeDue={onChangeTaskDue}
              onMoveWeek={(id) => onMoveTaskWeek(id, "this")}
              moveDirection="prev"
            />
          </div>

          <TimelineSection
            milestones={milestones}
            onAdd={onAddMilestone}
            onToggleCompleted={onToggleMilestoneCompleted}
            onDelete={onDeleteMilestone}
          />

          {activeBlockers.map((blocker) => (
            <BlockerArea
              key={blocker.id}
              text={blocker.text}
              onTextChange={(text) => onBlockerTextChange(blocker.id, text)}
              onResolve={() => onResolveBlocker(blocker.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BlockerArea({
  text,
  onTextChange,
  onResolve,
}: {
  text: string;
  onTextChange: (text: string) => void;
  onResolve: () => void;
}) {
  const [value, setValue] = useState(text);

  return (
    <div className="blocker-area">
      <div className="blocker-top">
        <div className="blocker-tag">⚠ Blocker</div>
        <button className="blocker-resolve" onClick={onResolve}>
          Mark resolved
        </button>
      </div>
      <textarea
        className="blocker-input"
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value !== text) onTextChange(value);
        }}
      />
    </div>
  );
}
