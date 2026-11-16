-- Run this once in Supabase Dashboard → SQL Editor.
create table if not exists public.activity_items (
  activity text not null,
  item_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (activity, item_id)
);

create table if not exists public.game_sessions (
  code text primary key,
  game text not null,
  status text not null default 'lobby' check (status in ('lobby', 'started', 'ended')),
  created_at timestamptz not null default now()
);

create table if not exists public.game_players (
  id text not null,
  session_code text not null references public.game_sessions(code) on delete cascade,
  name text not null,
  picks integer not null default 0,
  joined_at timestamptz not null default now(),
  primary key (session_code, id)
);

alter table public.activity_items enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_players enable row level security;

create policy "classroom activity access" on public.activity_items for all to anon, authenticated using (true) with check (true);
create policy "classroom session access" on public.game_sessions for all to anon, authenticated using (true) with check (true);
create policy "classroom player access" on public.game_players for all to anon, authenticated using (true) with check (true);

alter publication supabase_realtime add table public.activity_items;
alter publication supabase_realtime add table public.game_sessions;
alter publication supabase_realtime add table public.game_players;
