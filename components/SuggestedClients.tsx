"use client";

import type { SuggestedClient } from "@/lib/types";

const SOURCE_LABELS: Record<string, string> = {
  granola: "Granola",
  asana: "Asana",
  asana_lead: "Asana lead",
};

// Clients the sync spotted but isn't allowed to create. "Add" puts them on
// the dashboard (Active clients, or Pipeline for leads); "Dismiss" hides them.
export default function SuggestedClients({
  suggestions,
  onAdd,
  onDismiss,
}: {
  suggestions: SuggestedClient[];
  onAdd: (s: SuggestedClient) => void;
  onDismiss: (s: SuggestedClient) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <section className="client-panel suggested-panel">
      <div className="intel-title">
        Suggested clients <span className="person-count">{suggestions.length}</span>
      </div>
      {suggestions.map((s) => (
        <div className="suggested-row" key={s.id}>
          <div className="suggested-body">
            <div className="suggested-name">{s.name}</div>
            <div className="suggested-reason">
              <span className="suggested-source">{SOURCE_LABELS[s.source] ?? s.source}</span>
              {s.reason}
            </div>
          </div>
          <div className="suggested-actions">
            <button className="btn btn-primary" onClick={() => onAdd(s)}>
              {s.source === "asana_lead" ? "Add to Pipeline" : "Add"}
            </button>
            <button className="btn" onClick={() => onDismiss(s)}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
