import { supabase } from "./supabase";
import type {
  Blocker,
  ClientDetail,
  ClientLink,
  Contractor,
  IntakeDraft,
  KeyIntelItem,
  Milestone,
  MilestoneKind,
  PipelineStage,
  Project,
  ProjectPhase,
  Status,
  Task,
  Week,
} from "./types";

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*, tasks(*), blockers(*), timeline_milestones(*)")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as Project[];
}

export async function addProject(input: {
  name: string;
  section: string;
  status: Status;
  team: string[];
  pipeline_stage?: PipelineStage | null;
}) {
  const { data, error } = await supabase
    .from("projects")
    .insert(input)
    .select("*, tasks(*), blockers(*), timeline_milestones(*)")
    .single();

  if (error) throw error;
  return data as unknown as Project;
}

export async function setPipelineStage(
  projectId: string,
  stage: PipelineStage
) {
  const { error } = await supabase
    .from("projects")
    .update({ pipeline_stage: stage })
    .eq("id", projectId);

  if (error) throw error;
}

export async function moveToActive(projectId: string) {
  const { error } = await supabase
    .from("projects")
    .update({
      status: "active",
      section: "Active clients",
      pipeline_stage: null,
    })
    .eq("id", projectId);

  if (error) throw error;
}

// Moves a project to another sidebar section, keeping its status in step:
// Wrapping -> wrapping, Pipeline -> pipeline (starting at "talks"),
// Active clients / Internal -> active (a retainer stays a retainer).
// Archived keeps whatever status it had.
export function statusForSection(
  section: string,
  current: Status
): { status: Status; pipeline_stage: PipelineStage | null } {
  if (section === "Wrapping") return { status: "wrapping", pipeline_stage: null };
  if (section === "Pipeline") return { status: "pipeline", pipeline_stage: "talks" };
  if (section === "Archived") return { status: current, pipeline_stage: null };
  return { status: current === "retainer" ? "retainer" : "active", pipeline_stage: null };
}

export async function moveProject(projectId: string, section: string, current: Status) {
  const { error } = await supabase
    .from("projects")
    .update({ section, ...statusForSection(section, current) })
    .eq("id", projectId);

  if (error) throw error;
}

export async function setProjectPhase(
  projectId: string,
  phase: ProjectPhase | null
) {
  const { error } = await supabase
    .from("projects")
    .update({ project_phase: phase })
    .eq("id", projectId);

  if (error) throw error;
}

export async function setWorkspaceUrl(projectId: string, url: string | null) {
  const { error } = await supabase
    .from("projects")
    .update({ workspace_url: url })
    .eq("id", projectId);

  if (error) throw error;
}

export async function addTask(
  projectId: string,
  title: string,
  week: Week,
  dueDate: string | null = null
) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: projectId,
      title,
      week,
      due_date: dueDate,
      manually_edited: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setTaskDone(taskId: string, done: boolean) {
  const { error } = await supabase
    .from("tasks")
    .update({ done, manually_edited: true })
    .eq("id", taskId);

  if (error) throw error;
}

export async function updateTaskTitle(taskId: string, title: string) {
  const { error } = await supabase
    .from("tasks")
    .update({ title, manually_edited: true })
    .eq("id", taskId);

  if (error) throw error;
}

export async function setTaskWeek(taskId: string, week: Week) {
  const { error } = await supabase
    .from("tasks")
    .update({ week, manually_edited: true })
    .eq("id", taskId);

  if (error) throw error;
}

export async function setTaskDueDate(taskId: string, dueDate: string | null) {
  const { error } = await supabase
    .from("tasks")
    .update({ due_date: dueDate, manually_edited: true })
    .eq("id", taskId);

  if (error) throw error;
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function updateBlockerText(blockerId: string, text: string) {
  const { error } = await supabase
    .from("blockers")
    .update({ text, manually_edited: true })
    .eq("id", blockerId);

  if (error) throw error;
}

export async function resolveBlocker(blockerId: string) {
  const { error } = await supabase
    .from("blockers")
    .update({ resolved: true, manually_edited: true })
    .eq("id", blockerId);

  if (error) throw error;
}

export async function addMilestone(
  projectId: string,
  title: string,
  date: string,
  kind: MilestoneKind
) {
  const { data, error } = await supabase
    .from("timeline_milestones")
    .insert({ project_id: projectId, title, date, kind })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setMilestoneCompleted(
  milestoneId: string,
  completed: boolean
) {
  const { error } = await supabase
    .from("timeline_milestones")
    .update({ completed })
    .eq("id", milestoneId);

  if (error) throw error;
}

export async function deleteMilestone(milestoneId: string) {
  const { error } = await supabase
    .from("timeline_milestones")
    .delete()
    .eq("id", milestoneId);

  if (error) throw error;
}

export async function fetchContractors(): Promise<Contractor[]> {
  const { data, error } = await supabase
    .from("contractors")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Contractor[];
}

export async function addContractor(input: {
  name: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  full_time: boolean;
}) {
  const { data, error } = await supabase
    .from("contractors")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as Contractor;
}

export async function updateContractor(
  contractorId: string,
  input: {
    name: string;
    role: string | null;
    start_date: string | null;
    end_date: string | null;
    full_time: boolean;
  }
) {
  const { data, error } = await supabase
    .from("contractors")
    .update(input)
    .eq("id", contractorId)
    .select()
    .single();

  if (error) throw error;
  return data as Contractor;
}

export async function deleteContractor(contractorId: string) {
  const { error } = await supabase
    .from("contractors")
    .delete()
    .eq("id", contractorId);

  if (error) throw error;
}

// Creates a project from the intake form, along with its milestones,
// tasks and blockers, and returns it in the same shape fetchProjects uses.
export async function createProjectFromIntake(
  draft: IntakeDraft
): Promise<Project> {
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      name: draft.name,
      section: "Active clients",
      status: draft.status,
      team: draft.team,
      project_phase: draft.project_phase,
      workspace_url: draft.workspace_url || null,
    })
    .select()
    .single();
  if (error) throw error;

  const projectId = project.id as string;

  async function insertRows<T>(table: string, rows: object[]): Promise<T[]> {
    if (rows.length === 0) return [];
    const { data, error } = await supabase.from(table).insert(rows).select();
    if (error) throw error;
    return (data ?? []) as T[];
  }

  const [milestones, tasks, blockers] = await Promise.all([
    insertRows<Milestone>(
      "timeline_milestones",
      draft.milestones.map((m) => ({ project_id: projectId, ...m }))
    ),
    insertRows<Task>(
      "tasks",
      draft.tasks.map((t) => ({
        project_id: projectId,
        ...t,
        manually_edited: true,
      }))
    ),
    insertRows<Blocker>(
      "blockers",
      draft.blockers.map((text) => ({
        project_id: projectId,
        text,
        manually_edited: true,
      }))
    ),
  ]);

  return {
    ...(project as Project),
    timeline_milestones: milestones,
    tasks,
    blockers,
  };
}

// Key intel lives in its own table so it can be refreshed from meeting
// notes without a code change. Returns null if the table does not exist yet.
export async function fetchKeyIntel(): Promise<KeyIntelItem[] | null> {
  const { data, error } = await supabase
    .from("key_intel")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return null;
  return (data ?? []) as KeyIntelItem[];
}

// Everything shown on a client's own page beyond the project card.
export async function fetchClientDetail(projectId: string): Promise<ClientDetail> {
  const [links, meetings, insights] = await Promise.all([
    supabase
      .from("client_links")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("client_meetings")
      .select("*")
      .eq("project_id", projectId)
      .order("met_at", { ascending: false }),
    supabase
      .from("client_insights")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
  ]);
  for (const r of [links, meetings, insights]) if (r.error) throw r.error;
  return {
    links: (links.data ?? []) as ClientDetail["links"],
    meetings: (meetings.data ?? []) as ClientDetail["meetings"],
    insights: (insights.data ?? []) as ClientDetail["insights"],
  };
}

export async function addClientLink(projectId: string, label: string, url: string) {
  const { data, error } = await supabase
    .from("client_links")
    .insert({ project_id: projectId, label, url })
    .select()
    .single();
  if (error) throw error;
  return data as ClientLink;
}

export async function deleteClientLink(linkId: string) {
  const { error } = await supabase.from("client_links").delete().eq("id", linkId);
  if (error) throw error;
}
