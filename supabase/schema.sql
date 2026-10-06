create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active', -- active | retainer | wrapping | pipeline
  team text[] default '{}',
  section text not null default 'Active clients',
  created_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  week text not null default 'this', -- 'this' or 'next'
  done boolean default false,
  manually_edited boolean default false,
  created_at timestamptz default now()
);

create table blockers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  text text not null,
  resolved boolean default false,
  manually_edited boolean default false,
  created_at timestamptz default now()
);

create table timeline_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  date date not null,
  flagged boolean default false,
  created_at timestamptz default now()
);

-- RLS disabled: personal single-user tool, anon key is server-side only, no public signup.
alter table projects disable row level security;
alter table tasks disable row level security;
alter table blockers disable row level security;
alter table timeline_milestones disable row level security;

-- Pipeline stage tracking: talks | proposal | refinement | closed_won | closed_lost | ghost
alter table projects add column pipeline_stage text;

-- Project phase tracking for active/retainer clients: discovery | strategy | design | production | delivery
alter table projects add column project_phase text;

-- Milestone kind (milestone | invoice) and completion state (e.g. invoice sent)
alter table timeline_milestones add column kind text not null default 'milestone';
alter table timeline_milestones add column completed boolean not null default false;

-- Studio-wide contractor/freelancer tracking, independent of any single client
create table contractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  end_date date not null,
  created_at timestamptz default now()
);
alter table contractors disable row level security;

-- Contractors: start date + full-time option (full-time contractors have no end date)
alter table contractors add column start_date date;
alter table contractors add column full_time boolean not null default false;
alter table contractors alter column end_date drop not null;

-- Single-row storage for Nicole's connected Google Calendar OAuth tokens.
-- One personal-use dashboard, one Google account connected -- no per-user table needed.
create table google_calendar_tokens (
  id int primary key default 1,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  calendar_id text not null default 'primary',
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);
alter table google_calendar_tokens disable row level security;

-- Track which calendar event backs each milestone/invoice, so we can update/delete it later.
alter table timeline_milestones add column gcal_event_id text;

-- Key intel (from meeting notes). Previously hardcoded in components/KeyIntel.tsx.
create table key_intel (
  id uuid primary key default gen_random_uuid(),
  category text not null, -- needs_decision | new_this_week | decision_locked
  client text not null,
  text text not null,
  sort_order int not null default 0,
  created_at timestamptz default now()
);
alter table key_intel disable row level security;

-- Per-client workspace link (Figma, Drive, Notion...).
alter table projects add column workspace_url text;
