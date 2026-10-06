"use client";

import { useState } from "react";
import { shortLinkLabel } from "@/components/LinkedText";

// Adds https:// when someone pastes "figma.com/..." without it.
export function normalizeUrl(raw: string) {
  const v = raw.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

// The client's workspace link (Figma, Drive, Notion...), shown in the
// project card header. Lives inside the clickable header, so every
// interaction stops the click from also expanding/collapsing the card.
export default function WorkspaceLink({
  url,
  onChange,
}: {
  url: string | null;
  onChange: (url: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(url ?? "");

  function save() {
    const next = normalizeUrl(value);
    onChange(next || null);
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="ws-edit" onClick={(e) => e.stopPropagation()}>
        <input
          className="ws-input"
          value={value}
          autoFocus
          placeholder="Paste workspace link"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setValue(url ?? "");
              setEditing(false);
            }
          }}
        />
        <button className="ws-btn ws-save" onClick={save}>
          Save
        </button>
        {url && (
          <button
            className="ws-btn"
            onClick={() => {
              onChange(null);
              setValue("");
              setEditing(false);
            }}
          >
            Remove
          </button>
        )}
        <button
          className="ws-btn"
          onClick={() => {
            setValue(url ?? "");
            setEditing(false);
          }}
        >
          Cancel
        </button>
      </span>
    );
  }

  if (!url) {
    return (
      <button
        className="ws-add"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        + Workspace
      </button>
    );
  }

  return (
    <span className="ws-link-wrap">
      <a
        className="ws-link"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={url}
        onClick={(e) => e.stopPropagation()}
      >
        Workspace · {shortLinkLabel(url)} ↗
      </a>
      <button
        className="ws-edit-btn"
        aria-label="Edit workspace link"
        title="Edit workspace link"
        onClick={(e) => {
          e.stopPropagation();
          setValue(url);
          setEditing(true);
        }}
      >
        ✎
      </button>
    </span>
  );
}
