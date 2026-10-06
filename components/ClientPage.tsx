"use client";

import { useEffect, useState, type ComponentProps } from "react";
import ProjectCardList from "@/components/ProjectCardList";
import LinkedText, { shortLinkLabel } from "@/components/LinkedText";
import { normalizeUrl } from "@/components/WorkspaceLink";
import { addClientLink, deleteClientLink, fetchClientDetail } from "@/lib/data";
import type { ClientDetail, ClientMeeting, InsightKind, Project } from "@/lib/types";

type CardListProps = Omit<
  ComponentProps<typeof ProjectCardList>,
  "projects" | "title" | "expandedIds" | "focusedId" | "onToggleExpand"
>;

const INSIGHT_LABELS: Record<InsightKind, string> = {
  insight: "Insight",
  risk: "Watch out",
  opportunity: "Opportunity",
};

const MEETINGS_SHOWN = 4;

function formatMeetingDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatSynced(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ClientPage({
  project,
  cardListProps,
}: {
  project: Project;
  cardListProps: CardListProps;
}) {
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAllMeetings, setShowAllMeetings] = useState(false);

  useEffect(() => {
    fetchClientDetail(project.id)
      .then(setDetail)
      .catch((e) => setLoadError(String(e.message ?? e)));
  }, [project.id]);

  const meetings = detail?.meetings ?? [];
  const visibleMeetings = showAllMeetings ? meetings : meetings.slice(0, MEETINGS_SHOWN);

  return (
    <div className="client-page">
      <div className="page-header">
        <div className="header-left">
          <div className="week-label">{project.section}</div>
          <div className="week-title">{project.name}</div>
          {project.team.length > 0 && (
            <div className="client-team">{project.team.join(" · ")}</div>
          )}
        </div>
      </div>

      {loadError && <div className="intake-error">{loadError}</div>}

      <div className="client-grid">
        <div className="client-main">
          <ProjectCardList
            {...cardListProps}
            projects={[project]}
            expandedIds={new Set([project.id])}
            focusedId={null}
            onToggleExpand={() => {}}
          />

          <section className="client-panel">
            <div className="client-panel-head">
              <div className="intel-title">Latest from Granola</div>
              {project.granola_synced_at && (
                <div className="client-synced">
                  Synced {formatSynced(project.granola_synced_at)}
                </div>
              )}
            </div>
            {detail === null ? (
              <div className="empty-state">Loading…</div>
            ) : meetings.length === 0 ? (
              <div className="empty-state">
                No meeting notes yet. Ask Claude to sync this client from Granola.
              </div>
            ) : (
              <>
                {visibleMeetings.map((m) => (
                  <MeetingNote key={m.id} meeting={m} />
                ))}
                {meetings.length > MEETINGS_SHOWN && (
                  <button
                    className="completed-toggle"
                    onClick={() => setShowAllMeetings((v) => !v)}
                  >
                    {showAllMeetings
                      ? "Show fewer"
                      : `Show ${meetings.length - MEETINGS_SHOWN} older meeting${
                          meetings.length - MEETINGS_SHOWN > 1 ? "s" : ""
                        }`}
                  </button>
                )}
              </>
            )}
          </section>
        </div>

        <aside className="client-side">
          <section className="client-panel">
            <div className="intel-title">Insights</div>
            {detail === null ? (
              <div className="empty-state">Loading…</div>
            ) : detail.insights.length === 0 ? (
              <div className="empty-state">
                No insights yet. They&apos;re gathered when Granola notes are synced.
              </div>
            ) : (
              detail.insights.map((i) => (
                <div className={`insight insight-${i.kind}`} key={i.id}>
                  <div className="insight-kind">{INSIGHT_LABELS[i.kind] ?? "Insight"}</div>
                  <div className="insight-text">
                    <LinkedText text={i.text} />
                  </div>
                </div>
              ))
            )}
          </section>

          <LinksPanel
            projectId={project.id}
            links={detail?.links ?? null}
            onChange={(links) => setDetail((d) => (d ? { ...d, links } : d))}
          />
        </aside>
      </div>
    </div>
  );
}

function MeetingNote({ meeting }: { meeting: ClientMeeting }) {
  return (
    <article className="meeting-note">
      <div className="meeting-head">
        <span className="meeting-date">{formatMeetingDate(meeting.met_at)}</span>
        <span className="meeting-title">{meeting.title}</span>
        {meeting.url && (
          <a
            className="text-link meeting-open"
            href={meeting.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Granola ↗
          </a>
        )}
      </div>
      {meeting.points.length > 0 && (
        <ul className="meeting-points">
          {meeting.points.map((p, i) => (
            <li key={i}>
              <LinkedText text={p} />
            </li>
          ))}
        </ul>
      )}
      {meeting.next_steps.length > 0 && (
        <>
          <div className="meeting-sub">Next steps</div>
          <ul className="meeting-points meeting-steps">
            {meeting.next_steps.map((p, i) => (
              <li key={i}>
                <LinkedText text={p} />
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

function LinksPanel({
  projectId,
  links,
  onChange,
}: {
  projectId: string;
  links: ClientDetail["links"] | null;
  onChange: (links: ClientDetail["links"]) => void;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const href = normalizeUrl(url);
    if (!href) return setError("Paste a link first.");
    setError(null);
    try {
      const link = await addClientLink(projectId, label.trim() || shortLinkLabel(href), href);
      onChange([...(links ?? []), link]);
      setLabel("");
      setUrl("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(id: string) {
    onChange((links ?? []).filter((l) => l.id !== id));
    try {
      await deleteClientLink(id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="client-panel">
      <div className="intel-title">Important links</div>
      {links === null ? (
        <div className="empty-state">Loading…</div>
      ) : links.length === 0 ? (
        <div className="empty-state">No links yet.</div>
      ) : (
        <ul className="client-links">
          {links.map((l) => (
            <li key={l.id}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" title={l.url}>
                <span className="client-link-label">{l.label}</span>
                <span className="client-link-site">{shortLinkLabel(l.url)} ↗</span>
              </a>
              <button
                className="task-delete"
                onClick={() => remove(l.id)}
                aria-label={`Remove ${l.label}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="client-link-form">
        <input
          className="add-task-input"
          placeholder="Name (e.g. Brand guidelines)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <div className="client-link-form-row">
          <input
            className="add-task-input"
            placeholder="Paste link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button className="add-task-btn" onClick={add}>
            Add
          </button>
        </div>
      </div>
      {error && <div className="intake-error">{error}</div>}
    </section>
  );
}
