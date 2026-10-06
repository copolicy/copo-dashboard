"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";

function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromIso(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplay(iso: string) {
  const d = fromIso(iso);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className = "",
  format = formatDisplay,
  onClear,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
  format?: (iso: string) => string;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function openPicker() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((o) => !o);
  }

  return (
    <div className={`date-picker ${className}`}>
      <button
        type="button"
        ref={triggerRef}
        className="date-picker-trigger"
        onClick={(e) => {
          e.stopPropagation();
          openPicker();
        }}
      >
        {value ? format(value) : placeholder}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="date-picker-popover"
            ref={popoverRef}
            style={{ position: "fixed", top: coords.top, left: coords.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <DayPicker
              mode="single"
              selected={fromIso(value)}
              onSelect={(d) => {
                if (d) {
                  onChange(toIso(d));
                  setOpen(false);
                }
              }}
            />
            {onClear && value && (
              <button
                type="button"
                className="date-picker-clear"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
              >
                Remove date
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
