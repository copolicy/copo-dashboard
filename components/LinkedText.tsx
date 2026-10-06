"use client";

import { Fragment } from "react";

// Renders text with links. Supports two forms, so tasks stay plain text
// in the database:
//   [these two selects](https://figma.com/...)  -> "these two selects" linked
//   https://figma.com/...                        -> short label, e.g. "Figma ↗"

const TOKEN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;

const SITE_LABELS: [RegExp, string][] = [
  [/(^|\.)figma\.com$/, "Figma"],
  [/^docs\.google\.com$/, "Google Doc"],
  [/^drive\.google\.com$/, "Drive"],
  [/(^|\.)notion\.(so|site)$/, "Notion"],
  [/(^|\.)slack\.com$/, "Slack"],
  [/(^|\.)substack\.com$/, "Substack"],
  [/(^|\.)loom\.com$/, "Loom"],
  [/(^|\.)dropbox\.com$/, "Dropbox"],
  [/(^|\.)frame\.io$/, "Frame.io"],
  [/(^|\.)vimeo\.com$/, "Vimeo"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "YouTube"],
];

export function shortLinkLabel(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const known = SITE_LABELS.find(([re]) => re.test(host));
    return known ? known[1] : host;
  } catch {
    return "link";
  }
}

// Wraps a title and URL in the stored link format.
export function withLink(title: string, url: string) {
  const t = title.trim();
  const u = url.trim();
  if (!u) return t;
  if (!t) return u;
  return `[${t}](${u})`;
}

export function isUrl(text: string) {
  return /^https?:\/\/\S+$/.test(text.trim());
}

export default function LinkedText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    const url = m[2] ?? m[3];
    const label = m[1] ?? `${shortLinkLabel(url)} ↗`;
    parts.push(
      <a
        key={start}
        className="text-link"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={url}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {label}
      </a>
    );
    last = start + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>{p}</Fragment>
      ))}
    </>
  );
}
