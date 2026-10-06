export type Status = "active" | "retainer" | "wrapping" | "pipeline";
export type Week = "this" | "next";
export type PipelineStage =
  | "talks"
  | "proposal"
  | "refinement"
  | "closed_won"
  | "closed_lost"
  | "ghost";
export type ProjectPhase =
  | "discovery"
  | "strategy"
  | "design"
  | "production"
  | "delivery";
export type MilestoneKind = "milestone" | "invoice";

export interface Task {
  id: string;
  project_id: string;
  title: string;
  week: Week;
  done: boolean;
  manually_edited: boolean;
  created_at: string;
}

export interface Blocker {
  id: string;
  project_id: string;
  text: string;
  resolved: boolean;
  manually_edited: boolean;
  created_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  date: string;
  flagged: boolean;
  kind: MilestoneKind;
  completed: boolean;
  gcal_event_id: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  status: Status;
  team: string[];
  section: string;
  pipeline_stage: PipelineStage | null;
  project_phase: ProjectPhase | null;
  created_at: string;
  tasks: Task[];
  blockers: Blocker[];
  timeline_milestones: Milestone[];
}

export interface Contractor {
  id: string;
  name: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  full_time: boolean;
  created_at: string;
}

// A project as filled in on the intake form, before it is saved.
export interface IntakeDraft {
  name: string;
  status: Status;
  project_phase: ProjectPhase | null;
  team: string[];
  milestones: { title: string; date: string; kind: MilestoneKind }[];
  tasks: { title: string; week: Week }[];
  blockers: string[];
}

export type KeyIntelCategory = "needs_decision" | "new_this_week" | "decision_locked";

export interface KeyIntelItem {
  id: string;
  category: KeyIntelCategory;
  client: string;
  text: string;
  sort_order: number;
  created_at: string;
}
