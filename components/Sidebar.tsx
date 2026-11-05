"use client";

import { useState } from "react";
import type { Contractor, Project, Status } from "@/lib/types";
import { PEOPLE, bucketFor, ownerOf } from "@/components/PersonView";

export type View =
  | { type: "overview" }
  | { type: "upcoming" }
  | { type: "intel" }
  | { type: "contractors" }
  | { type: "calendar" }
  | { type: "section"; section: string }
  | { type: "client"; projectId: string }
  | { type: "person"; person: string };

const CONTRACT_FLAG_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function contractEndingSoon(contractor: Contractor) {
  if (contractor.full_time || !contractor.end_date) return false;
  const target = new Date(contractor.end_date + "T00:00:00").getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysOut = (target - today.getTime()) / DAY_MS;
  return daysOut >= 0 && daysOut <= CONTRACT_FLAG_DAYS;
}

const FIXED_SECTION_ORDER = ["Active clients", "Internal", "Wrapping", "Pipeline"];
export const ARCHIVED_SECTION = "Archived";

function dotClass(status: Status) {
  if (status === "retainer") return "dot-retainer";
  if (status === "wrapping") return "dot-wrap";
  if (status === "pipeline") return "dot-pip";
  return "dot-active";
}

export function sectionsInOrder(projects: Project[]): string[] {
  const present = Array.from(new Set(projects.map((p) => p.section)));
  // The four core sections always show, even when empty, so there is
  // always somewhere to add a client. Archived always sorts last.
  const extra = present
    .filter((s) => !FIXED_SECTION_ORDER.includes(s) && s !== ARCHIVED_SECTION)
    .sort();
  const archived = present.includes(ARCHIVED_SECTION) ? [ARCHIVED_SECTION] : [];
  return [...FIXED_SECTION_ORDER, ...extra, ...archived];
}

export default function Sidebar({
  projects,
  contractors,
  view,
  onSelectView,
  onSelectProject,
  onAddClient,
  onAddSection,
  onReorder,
}: {
  projects: Project[];
  contractors: Contractor[];
  view: View;
  onSelectView: (v: View) => void;
  onSelectProject: (section: string, projectId: string) => void;
  onAddClient: (section: string) => void;
  onAddSection: () => void;
  onReorder: (section: string, orderedIds: string[]) => void;
}) {
  const sections = sectionsInOrder(projects);
  const [archivedOpen, setArchivedOpen] = useState(false);
  // Drag a client up or down within its section to reorder it.
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ id: string; after: boolean } | null>(null);

  function handleDrop(section: string, sectionProjects: Project[]) {
    if (!dragId || !dropAt || dragId === dropAt.id) return;
    const ids = sectionProjects.map((p) => p.id).filter((id) => id !== dragId);
    if (sectionProjects.every((p) => p.id !== dragId)) return;
    let at = ids.indexOf(dropAt.id);
    if (at < 0) return;
    if (dropAt.after) at += 1;
    ids.splice(at, 0, dragId);
    onReorder(section, ids);
  }
  const endingSoonCount = contractors.filter(contractEndingSoon).length;
  const overdueCount = projects
    .filter((p) => p.section !== ARCHIVED_SECTION)
    .reduce(
      (n, p) =>
        n + p.tasks.filter((t) => !t.done && !t.hidden && bucketFor(t) === "overdue").length,
      0
    );

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-text">Company Policy</div>
        <div className="logo-sub">State of Affairs</div>
      </div>

      <div className="nav-group">
        <div
          className={`nav-item ${view.type === "overview" ? "active" : ""}`}
          onClick={() => onSelectView({ type: "overview" })}
        >
          <div className="nav-item-left">Overview</div>
        </div>
        <div
          className={`nav-item ${view.type === "upcoming" ? "active" : ""}`}
          onClick={() => onSelectView({ type: "upcoming" })}
        >
          <div className="nav-item-left">Upcoming work</div>
          {overdueCount > 0 && <span className="nav-count">{overdueCount}</span>}
        </div>
        <div
          className={`nav-item ${view.type === "intel" ? "active" : ""}`}
          onClick={() => onSelectView({ type: "intel" })}
        >
          <div className="nav-item-left">Key intel</div>
        </div>
        <div
          className={`nav-item ${view.type === "contractors" ? "active" : ""}`}
          onClick={() => onSelectView({ type: "contractors" })}
        >
          <div className="nav-item-left">Contractors</div>
          {endingSoonCount > 0 && (
            <span className="nav-count">{endingSoonCount}</span>
          )}
        </div>
        <div
          className={`nav-item ${view.type === "calendar" ? "active" : ""}`}
          onClick={() => onSelectView({ type: "calendar" })}
        >
          <div className="nav-item-left">Calendar</div>
        </div>
        {PEOPLE.map((person) => {
          const openCount = projects
            .filter((p) => p.section !== ARCHIVED_SECTION)
            .reduce(
              (n, p) =>
                n +
                p.tasks.filter(
                  (t) => !t.done && !t.hidden && ownerOf(t.title) === person
                ).length,
              0
            );
          return (
            <div
              key={person}
              className={`nav-item ${
                view.type === "person" && view.person === person ? "active" : ""
              }`}
              onClick={() => onSelectView({ type: "person", person })}
            >
              <div className="nav-item-left">{person}</div>
              {openCount > 0 && <span className="nav-count nav-count-quiet">{openCount}</span>}
            </div>
          );
        })}
      </div>

      {sections.map((section) => {
        const sectionProjects = projects.filter((p) => p.section === section);
        const isArchived = section === ARCHIVED_SECTION;
        if (isArchived && !archivedOpen) {
          return (
            <div className="nav-group" key={section}>
              <button
                className="nav-label nav-label-toggle"
                onClick={() => setArchivedOpen(true)}
              >
                <span>
                  {section} · {sectionProjects.length}
                </span>
                <span className="nav-caret">▸</span>
              </button>
            </div>
          );
        }
        return (
          <div className="nav-group" key={section}>
            {isArchived ? (
              <button
                className="nav-label nav-label-toggle"
                onClick={() => setArchivedOpen(false)}
              >
                <span>
                  {section} · {sectionProjects.length}
                </span>
                <span className="nav-caret">▾</span>
              </button>
            ) : (
              <button
                className="nav-label nav-label-link"
                onClick={() => onSelectView({ type: "section", section })}
                title={`See all ${section}`}
              >
                {section}
              </button>
            )}
            {sectionProjects.map((p) => (
              <div
                className={`nav-item ${
                  view.type === "client" && view.projectId === p.id ? "active" : ""
                } ${dragId === p.id ? "dragging" : ""} ${
                  dropAt?.id === p.id && dragId && dragId !== p.id
                    ? dropAt.after
                      ? "drop-below"
                      : "drop-above"
                    : ""
                }`}
                key={p.id}
                draggable={!isArchived}
                title={isArchived ? undefined : "Drag to reorder"}
                onDragStart={(e) => {
                  setDragId(p.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (!dragId || !sectionProjects.some((x) => x.id === dragId)) return;
                  e.preventDefault();
                  const box = e.currentTarget.getBoundingClientRect();
                  setDropAt({ id: p.id, after: e.clientY > box.top + box.height / 2 });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(section, sectionProjects);
                  setDragId(null);
                  setDropAt(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDropAt(null);
                }}
                onClick={() => onSelectProject(section, p.id)}
              >
                <div className="nav-item-left">
                  <div className={`nav-dot ${dotClass(p.status)}`} />
                  {p.name}
                </div>
              </div>
            ))}
            {!isArchived && (
              <button
                className="nav-add"
                onClick={() => onAddClient(section)}
              >
                {section === "Active clients" ? "+ New project intake" : "+ Add client"}
              </button>
            )}
          </div>
        );
      })}

      <div className="sidebar-bottom">
        <button className="add-section-btn" onClick={onAddSection}>
          + Add section
        </button>
      </div>
    </aside>
  );
}
