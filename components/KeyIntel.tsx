"use client";

import { useEffect, useState } from "react";
import { fetchKeyIntel } from "@/lib/data";
import type { KeyIntelCategory } from "@/lib/types";

type Item = { client: string; text: string };

// Shown only until the key_intel table exists in Supabase.

const NEEDS_DECISION = [
  {
    client: "Mochi",
    text: "Who from CoPo is on set July 16? Decide and tell Amy — photographer will control by default if not established now.",
  },
  {
    client: "Emergence",
    text: "Who is writing the web manifesto copy? Flagged in two separate meetings, still unresolved.",
  },
  {
    client: "Pavilion",
    text: "Matt's consolidated feedback expected Monday. Follow up if not received.",
  },
];

const NEW_THIS_WEEK = [
  {
    client: "Automat Workforce",
    text: "45-day trial agreed Jun 26. Check-in July 2 @11am PT. Send testimonial to Lucas today.",
  },
  {
    client: "BTQ Tech",
    text: "Intro call Jun 24 — quantum computing. Potential engagement, follow-up needed.",
  },
];

const DECISIONS_LOCKED = [
  {
    client: "Mochi",
    text: 'Direction 1 confirmed. Cardone Book as headline. All-caps out. "Health" at equal visual weight.',
  },
  {
    client: "Emergence",
    text: "Per-vertical color palette dropped. Nighthaus + Martina Plantin confirmed. Dark green as hero.",
  },
  {
    client: "Pavilion",
    text: '"Local Without Limits" as central idea. Direction 3 ruled out.',
  },
  {
    client: "Federato",
    text: "Lock copy received — Katie clear to build all report pages.",
  },
];

function IntelSection({
  title,
  items,
}: {
  title: string;
  items: { client: string; text: string }[];
}) {
  return (
    <div className="intel-section">
      <div className="intel-title">{title}</div>
      {items.length === 0 && <div className="empty-state">Nothing here yet.</div>}
      {items.map((item, i) => (
        <div className="intel-row" key={i}>
          <div className="intel-client-tag">{item.client}</div>
          {item.text}
        </div>
      ))}
    </div>
  );
}

const SECTIONS: { category: KeyIntelCategory; title: string }[] = [
  { category: "needs_decision", title: "Needs a decision" },
  { category: "new_this_week", title: "New this week" },
  { category: "decision_locked", title: "Decisions locked" },
];

const FALLBACK: Record<KeyIntelCategory, Item[]> = {
  needs_decision: NEEDS_DECISION,
  new_this_week: NEW_THIS_WEEK,
  decision_locked: DECISIONS_LOCKED,
};

export default function KeyIntel() {
  const [items, setItems] = useState<Record<KeyIntelCategory, Item[]> | null>(
    null
  );

  useEffect(() => {
    fetchKeyIntel().then((rows) => {
      if (rows === null) {
        setItems(FALLBACK);
        return;
      }
      const grouped: Record<KeyIntelCategory, Item[]> = {
        needs_decision: [],
        new_this_week: [],
        decision_locked: [],
      };
      for (const r of rows) grouped[r.category]?.push(r);
      setItems(grouped);
    });
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <div className="week-label">From Granola</div>
          <div className="week-title">Key intel</div>
        </div>
      </div>
      {items === null ? (
        <div className="empty-state">Loading…</div>
      ) : (
        SECTIONS.map(({ category, title }) => (
          <IntelSection key={category} title={title} items={items[category]} />
        ))
      )}
    </div>
  );
}
