"use client";

import { useState } from "react";
import type { Contractor, Project, Status } from "@/lib/types";
import { PEOPLE, taskOwner } from "@/components/PersonView";

export type View =
  | { type: "overview" }
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
}: {
  projects: Project[];
  contractors: Contractor[];
  view: View;
  onSelectView: (v: View) => void;
  onSelectProject: (section: string, projectId: string) => void;
  onAddClient: (section: string) => void;
  onAddSection: () => void;
}) {
  const sections = sectionsInOrder(projects);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const endingSoonCount = contractors.filter(contractEndingSoon).length;

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
                  (t) => !t.done && !t.hidden && taskOwner(t.title) === person
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
                }`}
                key={p.id}
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
