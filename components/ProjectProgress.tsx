import type { Project } from "@/lib/types";

// Thin progress bar for the top of a project: share of its tasks marked done.
// Tasks Nicole deleted (hidden) don't count.
export default function ProjectProgress({
  project,
  phaseLabel,
}: {
  project: Project;
  phaseLabel?: string | null;
}) {
  const tasks = project.tasks.filter((t) => !t.hidden);
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="progress" title={`${done} of ${tasks.length} tasks done`}>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-label">
        {phaseLabel && <span>{phaseLabel} · </span>}
        {tasks.length ? `${done} of ${tasks.length} tasks done · ${pct}%` : "No tasks yet"}
      </div>
    </div>
  );
}
