"use client";

import { useEffect, useRef, useState } from "react";

// A person tag that can be clicked to hand the task to someone else.
// The owner lives in the task title ("Adam: send deck"), so picking a new
// person rewrites that prefix. See retitleForOwner in PersonView.
export default function OwnerPicker({
  owner,
  people,
  onChange,
}: {
  owner: string;
  people: string[];
  onChange: (person: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(person: string) {
    setOpen(false);
    setCustom("");
    if (person && person !== owner) onChange(person);
  }

  function submitCustom() {
    const name = custom.trim().split(/\s+/)[0] ?? "";
    if (!name) return;
    pick(name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
  }

  return (
    <span className="owner-picker" ref={wrapRef}>
      <button
        type="button"
        className="upcoming-owner owner-picker-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title="Change who this is for"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {owner} <span className="owner-picker-caret">▾</span>
      </button>
      {open && (
        <div className="owner-picker-menu" role="listbox" onClick={(e) => e.stopPropagation()}>
          <div className="owner-picker-label">Assign to</div>
          {people.map((p) => (
            <button
              type="button"
              key={p}
              role="option"
              aria-selected={p === owner}
              className={`owner-picker-option ${p === owner ? "current" : ""}`}
              onClick={() => pick(p)}
            >
              {p}
              {p === owner && <span aria-hidden="true"> ✓</span>}
            </button>
          ))}
          <input
            className="owner-picker-input"
            placeholder="Someone else…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCustom();
            }}
          />
        </div>
      )}
    </span>
  );
}
