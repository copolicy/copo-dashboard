"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { plainText } from "@/components/LinkedText";
import type { Contractor, MilestoneKind, Project } from "@/lib/types";

interface CalendarItem {
  project: Project;
  milestoneId: string;
  title: string;
  kind: MilestoneKind;
  completed: boolean;
}

function toIso(d: Date) {
  return format(d, "yyyy-MM-dd");
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarView({
  projects,
  contractors,
  onAddMilestone,
  onSelectProject,
  onSelectContractors,
  calendarConnected,
}: {
  projects: Project[];
  contractors: Contractor[];
  onSelectContractors: () => void;
  onAddMilestone: (
    projectId: string,
    title: string,
    date: string,
    kind: MilestoneKind
  ) => void;
  onSelectProject: (section: string, projectId: string) => void;
  calendarConnected: boolean;
}) {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [addForDate, setAddForDate] = useState<string | null>(null);
  const [formProjectId, setFormProjectId] = useState(projects[0]?.id ?? "");
  const [formTitle, setFormTitle] = useState("");
  const [formKind, setFormKind] = useState<MilestoneKind>("milestone");

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const project of projects) {
      for (const m of project.timeline_milestones) {
        const list = map.get(m.date) ?? [];
        list.push({
          project,
          milestoneId: m.id,
          title: m.title,
          kind: m.kind,
          completed: m.completed,
        });
        map.set(m.date, list);
      }
    }
    return map;
  }, [projects]);

  const contractorEndsByDate = useMemo(() => {
    const map = new Map<string, Contractor[]>();
    for (const c of contractors) {
      if (c.full_time || !c.end_date) continue;
      const list = map.get(c.end_date) ?? [];
      list.push(c);
      map.set(c.end_date, list);
    }
    return map;
  }, [contractors]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(monthAnchor)),
    end: endOfWeek(endOfMonth(monthAnchor)),
  });

  function openAddForm(dateIso: string) {
    setAddForDate(dateIso);
    setFormProjectId(projects[0]?.id ?? "");
    setFormTitle("");
    setFormKind("milestone");
  }

  function submitAdd() {
    const trimmed = formTitle.trim();
    if (!trimmed || !formProjectId || !addForDate) return;
    onAddMilestone(formProjectId, trimmed, addForDate, formKind);
    setAddForDate(null);
  }

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <div className="week-label">All clients</div>
          <div className="week-title">{format(monthAnchor, "MMMM yyyy")}</div>
        </div>
        <div className="header-actions">
          {calendarConnected ? (
            <span className="badge badge-active">Google Calendar connected</span>
          ) : (
            <a className="btn" href="/api/auth/google/start">
              Connect Google Calendar
            </a>
          )}
          <button className="btn" onClick={() => setMonthAnchor((m) => subMonths(m, 1))}>
            ‹
          </button>
          <button className="btn" onClick={() => setMonthAnchor(startOfMonth(new Date()))}>
            Today
          </button>
          <button className="btn" onClick={() => setMonthAnchor((m) => addMonths(m, 1))}>
            ›
          </button>
        </div>
      </div>

      <div className="calendar-grid calendar-weekdays">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="calendar-weekday">
            {d}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((day) => {
          const iso = toIso(day);
          const items = itemsByDate.get(iso) ?? [];
          const contractEnds = contractorEndsByDate.get(iso) ?? [];
          const inMonth = isSameMonth(day, monthAnchor);
          return (
            <div
              key={iso}
              className={`calendar-cell ${inMonth ? "" : "outside"} ${
                isToday(day) ? "today" : ""
              }`}
            >
              <div className="calendar-cell-head">
                <span className="calendar-daynum">{format(day, "d")}</span>
                <button
                  className="calendar-add-btn"
                  onClick={() => openAddForm(iso)}
                  aria-label="Add milestone"
                >
                  +
                </button>
              </div>
              <div className="calendar-cell-items">
                {items.map((item) => (
                  <button
                    key={item.milestoneId}
                    className={`calendar-chip ${
                      item.kind === "invoice" ? "chip-invoice" : ""
                    } ${item.completed ? "chip-completed" : ""}`}
                    onClick={() => onSelectProject(item.project.section, item.project.id)}
                    title={`${item.project.name}: ${plainText(item.title)}`}
                  >
                    {item.kind === "invoice" ? "💰 " : ""}
                    {item.project.name}: {plainText(item.title)}
                  </button>
                ))}
                {contractEnds.map((c) => (
                  <button
                    key={c.id}
                    className="calendar-chip chip-contract"
                    onClick={onSelectContractors}
                    title={`${c.name}${c.role ? ` (${c.role})` : ""}: contract ends`}
                  >
                    {c.name}: contract ends
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {addForDate && (
        <div
          className="modal-overlay open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddForDate(null);
          }}
        >
          <div className="modal">
            <div className="modal-title">
              Add to {format(new Date(addForDate + "T00:00:00"), "MMM d, yyyy")}
            </div>
            <div className="modal-field">
              <div className="modal-label">Client</div>
              <select
                className="modal-select"
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-field">
              <div className="modal-label">Title</div>
              <input
                className="modal-input"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitAdd();
                }}
              />
            </div>
            <div className="modal-field">
              <div className="modal-label">Type</div>
              <select
                className="modal-select"
                value={formKind}
                onChange={(e) => setFormKind(e.target.value as MilestoneKind)}
              >
                <option value="milestone">Milestone</option>
                <option value="invoice">Invoice</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setAddForDate(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submitAdd}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
