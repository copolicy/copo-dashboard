"use client";

import type {
  MilestoneKind,
  PipelineStage,
  Project,
  ProjectPhase,
  Week,
} from "@/lib/types";
import { useState } from "react";
import ProjectCard from "./ProjectCard";

export default function ProjectCardList({
  title,
  projects,
  expandedIds,
  focusedId,
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
  onMoveSection,
  sections,
  onChangePhase,
  onChangeWorkspace,
  onAddMilestone,
  onToggleMilestoneCompleted,
  onDeleteMilestone,
  onReorder,
  scrollOnExpand = true,
}: {
  title?: string;
  // Off on a client page, so the panels above the card stay in view.
  scrollOnExpand?: boolean;
  projects: Project[];
  expandedIds: Set<string>;
  focusedId: string | null;
  onToggleExpand: (id: string) => void;
  onToggleTask: (projectId: string, taskId: string, done: boolean) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
  onAddTask: (
    projectId: string,
    week: Week,
    title: string,
    dueDate: string | null
  ) => void;
  onEditTask: (projectId: string, taskId: string, title: string) => void;
  onChangeTaskDue: (projectId: string, taskId: string, dueDate: string | null) => void;
  onMoveTaskWeek: (projectId: string, taskId: string, week: Week) => void;
  onBlockerTextChange: (
    projectId: string,
    blockerId: string,
    text: string
  ) => void;
  onResolveBlocker: (projectId: string, blockerId: string) => void;
  onChangeStage: (projectId: string, stage: PipelineStage) => void;
  onMoveToActive: (projectId: string) => void;
  onMoveSection: (projectId: string, section: string) => void;
  sections: string[];
  onChangePhase: (projectId: string, phase: ProjectPhase | null) => void;
  onChangeWorkspace: (projectId: string, url: string | null) => void;
  onAddMilestone: (
    projectId: string,
    title: string,
    date: string,
    kind: MilestoneKind
  ) => void;
  onToggleMilestoneCompleted: (
    projectId: string,
    milestoneId: string,
    completed: boolean
  ) => void;
  onDeleteMilestone: (projectId: string, milestoneId: string) => void;
  onReorder?: (section: string, orderedIds: string[]) => void;
}) {
  // Drag a card by its grip to change the order. The order is shared with
  // the sidebar (projects.sort_order), so both stay in step.
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ id: string; after: boolean } | null>(null);
  const section = projects[0]?.section;
  const canReorder =
    !!onReorder &&
    projects.length > 1 &&
    section !== "Archived" &&
    projects.every((p) => p.section === section);

  function handleDrop() {
    if (!onReorder || !section || !dragId || !dropAt || dragId === dropAt.id) return;
    const ids = projects.map((p) => p.id).filter((id) => id !== dragId);
    let at = ids.indexOf(dropAt.id);
    if (at < 0) return;
    if (dropAt.after) at += 1;
    ids.splice(at, 0, dragId);
    onReorder(section, ids);
  }

  function clearDrag() {
    setDragId(null);
    setDropAt(null);
  }

  if (projects.length === 0) {
    return (
      <div>
        {title && <div className="section-title">{title}</div>}
        <div className="empty-state">Nothing here yet.</div>
      </div>
    );
  }

  return (
    <div>
      {title && <div className="section-title">{title}</div>}
      {projects.map((project) => (
        <div
          key={project.id}
          className={`pc-drag-wrap ${canReorder ? "can-reorder" : ""} ${
            dragId === project.id ? "dragging" : ""
          } ${
            dropAt?.id === project.id && dragId && dragId !== project.id
              ? dropAt.after
                ? "drop-below"
                : "drop-above"
              : ""
          }`}
          onDragOver={(e) => {
            if (!canReorder || !dragId) return;
            e.preventDefault();
            const box = e.currentTarget.getBoundingClientRect();
            setDropAt({ id: project.id, after: e.clientY > box.top + box.height / 2 });
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop();
            clearDrag();
          }}
        >
          {canReorder && (
            <span
              className="pc-grip"
              draggable
              title="Drag to reorder"
              aria-label={`Drag to reorder ${project.name}`}
              onDragStart={(e) => {
                setDragId(project.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", project.id);
                const card = e.currentTarget.parentElement;
                if (card) e.dataTransfer.setDragImage(card, 24, 24);
              }}
              onDragEnd={clearDrag}
            >
              <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
                {[2, 8, 14].map((y) =>
                  [2, 8].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />)
                )}
              </svg>
            </span>
          )}
        <ProjectCard
          project={project}
          expanded={expandedIds.has(project.id) || focusedId === project.id}
          scrollOnExpand={scrollOnExpand}
          onToggleExpand={() => onToggleExpand(project.id)}
          onToggleTask={(taskId, done) => onToggleTask(project.id, taskId, done)}
          onDeleteTask={(taskId) => onDeleteTask(project.id, taskId)}
          onAddTask={(week, title, due) => onAddTask(project.id, week, title, due)}
          onEditTask={(taskId, title) => onEditTask(project.id, taskId, title)}
          onChangeTaskDue={(taskId, due) => onChangeTaskDue(project.id, taskId, due)}
          onMoveTaskWeek={(taskId, week) =>
            onMoveTaskWeek(project.id, taskId, week)
          }
          onBlockerTextChange={(blockerId, text) =>
            onBlockerTextChange(project.id, blockerId, text)
          }
          onResolveBlocker={(blockerId) =>
            onResolveBlocker(project.id, blockerId)
          }
          onChangeStage={(stage) => onChangeStage(project.id, stage)}
          onMoveToActive={() => onMoveToActive(project.id)}
          onMoveSection={(section) => onMoveSection(project.id, section)}
          sections={sections}
          onChangePhase={(phase) => onChangePhase(project.id, phase)}
          onChangeWorkspace={(url) => onChangeWorkspace(project.id, url)}
          onAddMilestone={(title, date, kind) =>
            onAddMilestone(project.id, title, date, kind)
          }
          onToggleMilestoneCompleted={(milestoneId, completed) =>
            onToggleMilestoneCompleted(project.id, milestoneId, completed)
          }
          onDeleteMilestone={(milestoneId) =>
            onDeleteMilestone(project.id, milestoneId)
          }
        />
        </div>
      ))}
    </div>
  );
}
