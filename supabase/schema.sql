-- Run this in Supabase → SQL Editor → New query → Run.
-- Then: Authentication → URL configuration → add your GitHub Pages URL to "Redirect URLs"
--   e.g. https://YOURNAME.github.io/YOUR_REPO/

create table if not exists public.calendar_events (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  description text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_events_user_start_idx
  on public.calendar_events (user_id, start_at);

alter table public.calendar_events enable row level security;

drop policy if exists "Users read own events" on public.calendar_events;
create policy "Users read own events"
  on public.calendar_events for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own events" on public.calendar_events;
create policy "Users insert own events"
  on public.calendar_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own events" on public.calendar_events;
create policy "Users update own events"
  on public.calendar_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own events" on public.calendar_events;
create policy "Users delete own events"
  on public.calendar_events for delete
  using (auth.uid() = user_id);

create or replace function public.calendar_events_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists calendar_events_touch_updated on public.calendar_events;
create trigger calendar_events_touch_updated
  before update on public.calendar_events
  for each row execute function public.calendar_events_set_updated_at();
