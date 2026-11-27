-- Anonymous answer log and game funnel.
--
-- Two tables, no auth, no user ids, no IP addresses. The game must work when
-- this is unreachable, so every write is fire-and-forget from the server.
--
-- Written only by the service role from /api/check and /api/event. RLS is on
-- with NO policies, which denies the anon and authenticated roles outright.

create table if not exists answer_log (
  id                bigserial primary key,
  created_at        timestamptz not null default now(),
  game_id           text    not null,
  prompt_id         text    not null,
  -- Free text the player typed. Never rendered back to other players.
  raw_answer        text    not null,
  normalized_answer text    not null,
  matched           boolean not null,
  points            integer not null,
  elapsed_ms        integer
);

create index if not exists answer_log_game_prompt_idx
  on answer_log (game_id, prompt_id);

-- The missed-answer review queue: valid answers we failed to accept. Partial,
-- so it stays small and the daily review is cheap.
create index if not exists answer_log_missed_idx
  on answer_log (normalized_answer)
  where not matched;

create table if not exists game_events (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  -- game_start | prompt_answered | game_finish | share_click | sistemigro_click
  event      text not null,
  game_id    text,
  meta       jsonb
);

create index if not exists game_events_event_idx
  on game_events (event, created_at desc);

alter table answer_log  enable row level security;
alter table game_events enable row level security;

-- Retention: raw_answer is free text, so it is dropped after 90 days while the
-- normalised form is kept for score retuning. Schedule via pg_cron, or run
-- manually — the privacy page commits us to this.
--   update answer_log set raw_answer = ''
--   where created_at < now() - interval '90 days' and raw_answer <> '';
