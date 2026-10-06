import { NextResponse } from "next/server";

// Reads a project timeline (PDF or pasted text) with Claude and returns
// a draft for the intake form. Nothing is saved here: the person reviews
// and edits the draft before it goes into the dashboard.

export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const MAX_PDF_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at ~4.5 MB

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Client or project name, short (e.g. 'Mochi Health').",
    },
    status: {
      type: "string",
      enum: ["active", "retainer"],
      description: "'retainer' only if the document describes an ongoing monthly retainer.",
    },
    project_phase: {
      type: ["string", "null"],
      enum: ["discovery", "strategy", "design", "production", "delivery", null],
      description: "The phase the project is in as of today, or null if unclear.",
    },
    team: {
      type: "array",
      items: { type: "string" },
      description: "First names of Company Policy team members named on the project. Do not include client-side people.",
    },
    milestones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short, e.g. 'Brand presentation' or 'Invoice 2 of 3 (40%)'." },
          date: { type: "string", description: "YYYY-MM-DD" },
          kind: { type: "string", enum: ["milestone", "invoice"] },
        },
        required: ["title", "date", "kind"],
      },
      description: "Every dated deliverable, presentation, review, launch and payment date in the timeline. Payment or invoice dates use kind 'invoice'.",
    },
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          week: { type: "string", enum: ["this", "next"] },
        },
        required: ["title", "week"],
      },
      description: "Concrete to-dos for Company Policy due this week or next week only. Empty if none.",
    },
    blockers: {
      type: "array",
      items: { type: "string" },
      description: "Open questions, missing inputs or dependencies that could hold the project up. Empty if none are stated.",
    },
  },
  required: ["name", "status", "project_phase", "team", "milestones", "tasks", "blockers"],
};

function instructions(today: string) {
  return `You are filling in a new project intake form for Company Policy, a design studio, from the project details provided.

Today is ${today}. When a date has no year, use the next upcoming occurrence. Convert every date to YYYY-MM-DD. Week-based timelines ("Week 3") count from the stated kickoff date; if there is no kickoff date, leave those items out rather than guessing.

Only use what the material says. Do not invent dates, people, tasks or blockers. Keep titles short and plain, and do not use em dashes.

Call save_project with the result.`;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Reading timelines isn't set up yet: ANTHROPIC_API_KEY is missing in Vercel. You can still fill in the form by hand.",
      },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const notes = String(form.get("notes") ?? "").trim();
  const today = String(form.get("today") ?? new Date().toISOString().slice(0, 10));

  const content: object[] = [];
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Please upload a PDF." }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "That PDF is over 4 MB. Try exporting a smaller version, or paste the timeline text instead." },
        { status: 413 }
      );
    }
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data },
    });
  }
  if (notes) content.push({ type: "text", text: `Project details:\n\n${notes}` });
  if (content.length === 0) {
    return NextResponse.json({ error: "Add a PDF or some details first." }, { status: 400 });
  }
  content.push({ type: "text", text: instructions(today) });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      tools: [
        {
          name: "save_project",
          description: "Save the extracted project details to the intake form.",
          input_schema: DRAFT_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "save_project" },
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Anthropic API error", res.status, detail);
    return NextResponse.json(
      { error: `Couldn't read the timeline (error ${res.status}). You can still fill in the form by hand.` },
      { status: 502 }
    );
  }

  const result = await res.json();
  const toolUse = (result.content ?? []).find(
    (block: { type: string }) => block.type === "tool_use"
  );
  if (!toolUse) {
    return NextResponse.json(
      { error: "Couldn't find project details in that. You can fill in the form by hand." },
      { status: 422 }
    );
  }

  return NextResponse.json({ draft: toolUse.input });
}
