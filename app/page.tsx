"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar, {
  ARCHIVED_SECTION,
  sectionsInOrder,
  type View,
} from "@/components/Sidebar";
import ProjectCardList from "@/components/ProjectCardList";
import KeyIntel from "@/components/KeyIntel";
import ContractorsView from "@/components/ContractorsView";
import CalendarView from "@/components/CalendarView";
import AddClientModal from "@/components/AddClientModal";
import IntakeModal from "@/components/IntakeModal";
import ClientPage from "@/components/ClientPage";
import PersonView from "@/components/PersonView";
import { plainText } from "@/components/LinkedText";
import {
  addContractor,
  addMilestone,
  addProject,
  addTask,
  createProjectFromIntake,
  deleteContractor,
  deleteMilestone,
  deleteTask,
  fetchContractors,
  fetchProjects,
  moveProject,
  moveToActive,
  statusForSection,
  resolveBlocker,
  setMilestoneCompleted,
  setPipelineStage,
  setProjectPhase,
  setTaskDone,
  setTaskDueDate,
  setTaskWeek,
  setWorkspaceUrl,
  updateContractor,
  updateBlockerText,
  updateTaskTitle,
} from "@/lib/data";
import type {
  Contractor,
  IntakeDraft,
  Milestone,
  MilestoneKind,
  PipelineStage,
  Project,
  ProjectPhase,
  Status,
  Week,
} from "@/lib/types";

const CLOSED_PIPELINE_STAGES: PipelineStage[] = ["closed_won", "closed_lost", "ghost"];

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ type: "overview" });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSection, setModalSection] = useState("Active clients");
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeKey, setIntakeKey] = useState(0);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarNotice, setCalendarNotice] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchProjects(), fetchContractors()])
      .then(([p, c]) => {
        setProjects(p);
        setContractors(c);
      })
      .catch((e) => setSyncError(String(e.message ?? e)))
      .finally(() => setLoading(false));

    fetch("/api/calendar/status")
      .then((res) => res.json())
      .then((result) => setCalendarConnected(!!result.connected))
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected")) {
      setCalendarNotice("Google Calendar connected.");
      setCalendarConnected(true);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("calendar_error")) {
      setCalendarNotice(`Google Calendar connection failed: ${params.get("calendar_error")}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  function updateProject(projectId: string, updater: (p: Project) => Project) {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? updater(p) : p))
    );
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (focusedId === id) setFocusedId(null);
  }

  async function handleToggleTask(
    projectId: string,
    taskId: string,
    done: boolean
  ) {
    updateProject(projectId, (p) => ({
      ...p,
      tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done } : t)),
    }));
    try {
      await setTaskDone(taskId, done);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleDeleteTask(projectId: string, taskId: string) {
    const fromAsana = !!projects
      .find((p) => p.id === projectId)
      ?.tasks.find((t) => t.id === taskId)?.asana_gid;
    updateProject(projectId, (p) => ({
      ...p,
      tasks: p.tasks.filter((t) => t.id !== taskId),
    }));
    try {
      await deleteTask(taskId, fromAsana);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleAddTask(
    projectId: string,
    week: Week,
    title: string,
    dueDate: string | null = null
  ) {
    try {
      const task = await addTask(projectId, title, week, dueDate);
      updateProject(projectId, (p) => ({ ...p, tasks: [...p.tasks, task] }));
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleEditTask(
    projectId: string,
    taskId: string,
    title: string
  ) {
    updateProject(projectId, (p) => ({
      ...p,
      tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, title } : t)),
    }));
    try {
      await updateTaskTitle(taskId, title);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleChangeTaskDue(
    projectId: string,
    taskId: string,
    dueDate: string | null
  ) {
    updateProject(projectId, (p) => ({
      ...p,
      tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, due_date: dueDate } : t)),
    }));
    try {
      await setTaskDueDate(taskId, dueDate);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleMoveTaskWeek(
    projectId: string,
    taskId: string,
    week: Week
  ) {
    updateProject(projectId, (p) => ({
      ...p,
      tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, week } : t)),
    }));
    try {
      await setTaskWeek(taskId, week);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleBlockerTextChange(
    projectId: string,
    blockerId: string,
    text: string
  ) {
    updateProject(projectId, (p) => ({
      ...p,
      blockers: p.blockers.map((b) =>
        b.id === blockerId ? { ...b, text } : b
      ),
    }));
    try {
      await updateBlockerText(blockerId, text);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleResolveBlocker(projectId: string, blockerId: string) {
    updateProject(projectId, (p) => ({
      ...p,
      blockers: p.blockers.map((b) =>
        b.id === blockerId ? { ...b, resolved: true } : b
      ),
    }));
    try {
      await resolveBlocker(blockerId);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleAddProject(input: {
    name: string;
    section: string;
    status: Status;
    team: string[];
    pipeline_stage?: PipelineStage | null;
  }) {
    try {
      const project = await addProject(input);
      setProjects((prev) => [...prev, project]);
      setModalOpen(false);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleChangeStage(projectId: string, stage: PipelineStage) {
    updateProject(projectId, (p) => ({ ...p, pipeline_stage: stage }));
    try {
      await setPipelineStage(projectId, stage);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleMoveToActive(projectId: string) {
    updateProject(projectId, (p) => ({
      ...p,
      status: "active",
      section: "Active clients",
      pipeline_stage: null,
    }));
    try {
      await moveToActive(projectId);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleMoveSection(projectId: string, section: string) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    updateProject(projectId, (p) => ({
      ...p,
      section,
      ...statusForSection(section, p.status),
    }));
    try {
      await moveProject(projectId, section, project.status);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleChangePhase(projectId: string, phase: ProjectPhase | null) {
    updateProject(projectId, (p) => ({ ...p, project_phase: phase }));
    try {
      await setProjectPhase(projectId, phase);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleChangeWorkspace(projectId: string, url: string | null) {
    updateProject(projectId, (p) => ({ ...p, workspace_url: url }));
    try {
      await setWorkspaceUrl(projectId, url);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleAddMilestone(
    projectId: string,
    title: string,
    date: string,
    kind: MilestoneKind
  ) {
    try {
      const milestone = await addMilestone(projectId, title, date, kind);
      updateProject(projectId, (p) => ({
        ...p,
        timeline_milestones: [...p.timeline_milestones, milestone],
      }));

      const projectName = projects.find((p) => p.id === projectId)?.name ?? "";
      pushMilestoneToCalendar(projectId, milestone, projectName);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  function pushMilestoneToCalendar(
    projectId: string,
    milestone: Milestone,
    projectName: string
  ) {
    fetch("/api/calendar/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milestoneId: milestone.id,
        title: plainText(milestone.title),
        date: milestone.date,
        projectName,
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.pushed) {
          updateProject(projectId, (p) => ({
            ...p,
            timeline_milestones: p.timeline_milestones.map((m) =>
              m.id === milestone.id ? { ...m, gcal_event_id: result.eventId } : m
            ),
          }));
        }
      })
      .catch(() => {
        // Calendar push is best-effort; not connected or a transient
        // failure shouldn't block the milestone itself from saving.
      });
  }

  function openIntake() {
    setIntakeKey((k) => k + 1);
    setIntakeOpen(true);
  }

  async function handleIntakeSubmit(draft: IntakeDraft) {
    // Errors propagate to the form so it can show them and keep the draft.
    const project = await createProjectFromIntake(draft);
    setProjects((prev) => [...prev, project]);
    setIntakeOpen(false);
    setView({ type: "overview" });
    setExpandedIds((prev) => new Set(prev).add(project.id));
    for (const m of project.timeline_milestones) {
      pushMilestoneToCalendar(project.id, m, project.name);
    }
  }

  async function handleToggleMilestoneCompleted(
    projectId: string,
    milestoneId: string,
    completed: boolean
  ) {
    updateProject(projectId, (p) => ({
      ...p,
      timeline_milestones: p.timeline_milestones.map((m) =>
        m.id === milestoneId ? { ...m, completed } : m
      ),
    }));
    try {
      await setMilestoneCompleted(milestoneId, completed);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleDeleteMilestone(projectId: string, milestoneId: string) {
    const project = projects.find((p) => p.id === projectId);
    const eventId = project?.timeline_milestones.find((m) => m.id === milestoneId)
      ?.gcal_event_id;

    updateProject(projectId, (p) => ({
      ...p,
      timeline_milestones: p.timeline_milestones.filter(
        (m) => m.id !== milestoneId
      ),
    }));
    try {
      await deleteMilestone(milestoneId);
      if (eventId) {
        fetch("/api/calendar/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId }),
        }).catch(() => {});
      }
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleAddContractor(input: {
    name: string;
    role: string;
    startDate: string;
    endDate: string;
    fullTime: boolean;
  }) {
    try {
      const contractor = await addContractor({
        name: input.name,
        role: input.role || null,
        start_date: input.startDate || null,
        end_date: input.fullTime ? null : input.endDate,
        full_time: input.fullTime,
      });
      setContractors((prev) => [...prev, contractor]);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleUpdateContractor(
    id: string,
    input: {
      name: string;
      role: string;
      startDate: string;
      endDate: string;
      fullTime: boolean;
    }
  ) {
    const patch = {
      name: input.name,
      role: input.role || null,
      start_date: input.startDate || null,
      end_date: input.fullTime ? null : input.endDate || null,
      full_time: input.fullTime,
    };
    setContractors((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    try {
      await updateContractor(id, patch);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  async function handleDeleteContractor(id: string) {
    setContractors((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteContractor(id);
    } catch (e) {
      setSyncError(String((e as Error).message ?? e));
    }
  }

  // Clicking a client anywhere (sidebar, calendar) opens its own page.
  function selectProject(_section: string, projectId: string) {
    setView({ type: "client", projectId });
    setFocusedId(null);
    window.scrollTo({ top: 0 });
  }

  const stats = useMemo(() => {
    const activeClients = projects.filter(
      (p) => p.section === "Active clients"
    ).length;
    const wrapping = projects.filter((p) => p.section === "Wrapping").length;
    const pipeline = projects.filter(
      (p) =>
        p.section === "Pipeline" &&
        !(p.pipeline_stage && CLOSED_PIPELINE_STAGES.includes(p.pipeline_stage))
    ).length;
    const openBlockers = projects
      .filter((p) => p.section !== ARCHIVED_SECTION)
      .reduce(
        (sum, p) => sum + p.blockers.filter((b) => !b.resolved).length,
        0
      );
    return { activeClients, wrapping, pipeline, openBlockers };
  }, [projects]);

  const cardListProps = {
    expandedIds,
    focusedId,
    onToggleExpand: toggleExpand,
    onToggleTask: handleToggleTask,
    onDeleteTask: handleDeleteTask,
    onAddTask: handleAddTask,
    onEditTask: handleEditTask,
    onChangeTaskDue: handleChangeTaskDue,
    onMoveTaskWeek: handleMoveTaskWeek,
    onBlockerTextChange: handleBlockerTextChange,
    onResolveBlocker: handleResolveBlocker,
    onChangeStage: handleChangeStage,
    onMoveToActive: handleMoveToActive,
    onMoveSection: handleMoveSection,
    sections: Array.from(
      new Set([...sectionsInOrder(projects), ARCHIVED_SECTION])
    ),
    onChangePhase: handleChangePhase,
    onChangeWorkspace: handleChangeWorkspace,
    onAddMilestone: handleAddMilestone,
    onToggleMilestoneCompleted: handleToggleMilestoneCompleted,
    onDeleteMilestone: handleDeleteMilestone,
  };

  return (
    <div className="shell">
      <Sidebar
        projects={projects}
        contractors={contractors}
        view={view}
        onSelectView={(v) => {
          setView(v);
          setFocusedId(null);
        }}
        onSelectProject={selectProject}
        onAddClient={(section) => {
          if (section === "Active clients") {
            openIntake();
            return;
          }
          setModalSection(section);
          setModalOpen(true);
        }}
        onAddSection={() => {
          setModalSection("");
          setModalOpen(true);
        }}
      />

      <main className="main">
        {syncError && (
          <div
            style={{
              background: "var(--danger-light)",
              color: "var(--danger-text)",
              padding: "8px 12px",
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            {syncError}
          </div>
        )}

        {calendarNotice && (
          <div
            style={{
              background: "var(--accent-light)",
              color: "var(--accent-text)",
              padding: "8px 12px",
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            {calendarNotice}
          </div>
        )}

        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : view.type === "intel" ? (
          <KeyIntel />
        ) : view.type === "contractors" ? (
          <ContractorsView
            contractors={contractors}
            onAdd={handleAddContractor}
            onUpdate={handleUpdateContractor}
            onDelete={handleDeleteContractor}
          />
        ) : view.type === "person" ? (
          <PersonView
            key={view.person}
            person={view.person}
            projects={projects}
            onToggleTask={handleToggleTask}
            onSelectProject={selectProject}
          />
        ) : view.type === "calendar" ? (
          <CalendarView
            projects={projects.filter((p) => p.section !== ARCHIVED_SECTION)}
            contractors={contractors}
            onSelectContractors={() => setView({ type: "contractors" })}
            onAddMilestone={handleAddMilestone}
            onSelectProject={selectProject}
            calendarConnected={calendarConnected}
          />
        ) : view.type === "client" ? (
          (() => {
            const project = projects.find((p) => p.id === view.projectId);
            if (!project) return <div className="empty-state">That client was removed.</div>;
            return (
              <ClientPage
                key={project.id}
                project={project}
                cardListProps={cardListProps}
                onNotesSaved={(notes, savedAt) =>
                  updateProject(project.id, (p) => ({
                    ...p,
                    notes,
                    notes_updated_at: savedAt,
                  }))
                }
              />
            );
          })()
        ) : view.type === "overview" ? (
          <>
            <div className="page-header">
              <div className="header-left">
                <div className="week-label">State of Affairs</div>
                <div className="week-title">Overview</div>
              </div>
              <div className="header-actions">
                <button className="btn btn-primary" onClick={openIntake}>
                  + New project intake
                </button>
              </div>
            </div>
            <div className="stats">
              <div className="stat">
                <div className="stat-n">{stats.activeClients}</div>
                <div className="stat-l">Active clients</div>
              </div>
              <div className="stat">
                <div className="stat-n">{stats.wrapping}</div>
                <div className="stat-l">Wrapping</div>
              </div>
              <div className="stat">
                <div className="stat-n">{stats.openBlockers}</div>
                <div className="stat-l">Open blockers</div>
              </div>
              <div className="stat">
                <div className="stat-n">{stats.pipeline}</div>
                <div className="stat-l">Pipeline</div>
              </div>
            </div>
            <ProjectCardList
              title="Active clients"
              projects={projects.filter((p) => p.section === "Active clients")}
              {...cardListProps}
            />
            <div style={{ marginTop: 20 }}>
              <ProjectCardList
                title="Wrapping"
                projects={projects.filter((p) => p.section === "Wrapping")}
                {...cardListProps}
              />
            </div>
          </>
        ) : (
          <>
            <div className="page-header">
              <div className="header-left">
                <div className="week-label">
                  {sectionsInOrder(projects).includes(view.section)
                    ? view.section
                    : "Section"}
                </div>
                <div className="week-title">{view.section}</div>
              </div>
            </div>
            <ProjectCardList
              projects={projects.filter((p) => p.section === view.section)}
              {...cardListProps}
            />
          </>
        )}
      </main>

      <IntakeModal
        key={intakeKey}
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        onSubmit={handleIntakeSubmit}
      />

      <AddClientModal
        key={`${modalSection}-${modalOpen}`}
        open={modalOpen}
        defaultSection={modalSection}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddProject}
      />
    </div>
  );
}
