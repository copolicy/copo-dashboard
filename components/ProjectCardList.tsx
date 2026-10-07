"use client";

import type {
  MilestoneKind,
  PipelineStage,
  Project,
  ProjectPhase,
  Week,
} from "@/lib/types";
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
}: {
  title?: string;
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
}) {
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
        <ProjectCard
          key={project.id}
          project={project}
          expanded={expandedIds.has(project.id) || focusedId === project.id}
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
      ))}
    </div>
  );
}
