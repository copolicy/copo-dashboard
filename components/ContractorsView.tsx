"use client";

import { useState } from "react";
import type { Contractor } from "@/lib/types";
import DatePicker from "./DatePicker";

const DAY_MS = 24 * 60 * 60 * 1000;
const CONTRACT_FLAG_DAYS = 14;

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isEndingSoon(contractor: Contractor) {
  if (contractor.full_time || !contractor.end_date) return false;
  const target = new Date(contractor.end_date + "T00:00:00").getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysOut = (target - today.getTime()) / DAY_MS;
  return daysOut >= 0 && daysOut <= CONTRACT_FLAG_DAYS;
}

function dateRangeLabel(c: Contractor) {
  const start = c.start_date ? formatDate(c.start_date) : null;
  if (c.full_time) {
    return start ? `Started ${start} · Full-time` : "Full-time";
  }
  const end = c.end_date ? formatDate(c.end_date) : null;
  if (start && end) return `${start} – ${end}`;
  if (end) return `Ends ${end}`;
  if (start) return `Started ${start}`;
  return "";
}

type ContractorInput = {
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  fullTime: boolean;
};

function EditContractorModal({
  contractor,
  onClose,
  onSave,
  onDelete,
}: {
  contractor: Contractor;
  onClose: () => void;
  onSave: (input: ContractorInput) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(contractor.name);
  const [role, setRole] = useState(contractor.role ?? "");
  const [startDate, setStartDate] = useState(contractor.start_date ?? "");
  const [endDate, setEndDate] = useState(contractor.end_date ?? "");
  const [fullTime, setFullTime] = useState(contractor.full_time);
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!name.trim()) return setError("Add a name.");
    if (!fullTime && !endDate) return setError("Add an end date, or tick Full-time.");
    onSave({ name: name.trim(), role: role.trim(), startDate, endDate, fullTime });
  }

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal contractor-modal">
        <div className="modal-title">Edit contractor</div>
        <div className="modal-field">
          <div className="modal-label">Name</div>
          <input
            className="modal-input"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
        </div>
        <div className="modal-field">
          <div className="modal-label">Role</div>
          <input
            className="modal-input"
            value={role}
            placeholder="Optional"
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
        </div>
        <div className="modal-field">
          <label className="contractor-fulltime-label">
            <input
              type="checkbox"
              checked={fullTime}
              onChange={(e) => setFullTime(e.target.checked)}
            />
            Full-time (no end date)
          </label>
        </div>
        <div className="contractor-modal-dates">
          <div className="modal-field">
            <div className="modal-label">Start date</div>
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              onClear={() => setStartDate("")}
              placeholder="Optional"
            />
          </div>
          {!fullTime && (
            <div className="modal-field">
              <div className="modal-label">End date</div>
              <DatePicker value={endDate} onChange={setEndDate} placeholder="Date" />
            </div>
          )}
        </div>
        {error && <div className="intake-error">{error}</div>}
        <div className="modal-actions contractor-modal-actions">
          <button
            className="btn btn-danger-quiet"
            onClick={() => {
              if (window.confirm(`Remove ${contractor.name}?`)) onDelete();
            }}
          >
            Remove
          </button>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>

    </div>
  );
}

export default function ContractorsView({
  contractors,
  onAdd,
  onUpdate,
  onDelete,
}: {
  contractors: Contractor[];
  onAdd: (input: {
    name: string;
    role: string;
    startDate: string;
    endDate: string;
    fullTime: boolean;
  }) => void;
  onUpdate: (id: string, input: ContractorInput) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = contractors.find((c) => c.id === editingId) ?? null;
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fullTime, setFullTime] = useState(false);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!fullTime && !endDate) return;
    onAdd({ name: trimmed, role: role.trim(), startDate, endDate, fullTime });
    setName("");
    setRole("");
    setStartDate("");
    setEndDate("");
    setFullTime(false);
  }

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <div className="week-label">Studio</div>
          <div className="week-title">Contractors</div>
        </div>
      </div>

      <div className="intel-section">
        {contractors.length === 0 && (
          <div className="empty-state">No contractors tracked yet.</div>
        )}
        {contractors.map((c) => (
          <div
            className="contractor-row contractor-row-clickable"
            key={c.id}
            onClick={() => setEditingId(c.id)}
            title="Click to edit"
          >
            <div className="contractor-info">
              <div className="contractor-name">{c.name}</div>
              {c.role && <div className="contractor-role">{c.role}</div>}
            </div>
            <div className="contractor-date">{dateRangeLabel(c)}</div>
            {isEndingSoon(c) && (
              <span className="milestone-flag">⚠ Contract ends within 2 weeks</span>
            )}
            <span className="contractor-edit-hint">Edit</span>
          </div>
        ))}

        <div className="add-contractor-row">
          <div className="add-milestone-row">
            <input
              className="add-task-input"
              placeholder="Contractor name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <input
              className="add-task-input"
              placeholder="Role (optional)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>
          <div className="add-milestone-row">
            <label className="contractor-fulltime-label">
              <input
                type="checkbox"
                checked={fullTime}
                onChange={(e) => setFullTime(e.target.checked)}
              />
              Full-time (no end date)
            </label>
          </div>
          <div className="add-milestone-row">
            <div className="date-field-label">
              Start date
              <DatePicker value={startDate} onChange={setStartDate} placeholder="Optional" />
            </div>
            {!fullTime && (
              <div className="date-field-label">
                End date
                <DatePicker value={endDate} onChange={setEndDate} placeholder="Date" />
              </div>
            )}
            <button className="add-task-btn" onClick={submit}>
              +
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <EditContractorModal
          key={editing.id}
          contractor={editing}
          onClose={() => setEditingId(null)}
          onSave={(input) => {
            onUpdate(editing.id, input);
            setEditingId(null);
          }}
          onDelete={() => {
            onDelete(editing.id);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}
