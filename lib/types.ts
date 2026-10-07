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
  due_date: string | null;
  carried_over: boolean;
  asana_gid: string | null;
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
  workspace_url: string | null;
  granola_synced_at: string | null;
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
  workspace_url: string;
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

export interface ClientLink {
  id: string;
  project_id: string;
  label: string;
  url: string;
  created_at: string;
}

export interface ClientMeeting {
  id: string;
  project_id: string;
  granola_id: string;
  title: string;
  met_at: string;
  points: string[];
  next_steps: string[];
  url: string | null;
}

export type InsightKind = "insight" | "risk" | "opportunity";

export interface ClientInsight {
  id: string;
  project_id: string;
  kind: InsightKind;
  text: string;
  sort_order: number;
}

export interface ClientDetail {
  links: ClientLink[];
  meetings: ClientMeeting[];
  insights: ClientInsight[];
}
