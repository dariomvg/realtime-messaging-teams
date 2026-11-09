-- =====================================================================
-- TeamNotify — Supabase schema
-- Tables, functions, triggers, privileges, Row Level Security, Realtime.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> paste this whole file -> Run.
-- Run it ONCE on a fresh project (it is not idempotent).
-- Afterwards follow "6. First admin" at the bottom.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------

-- One profile per auth user. Holds the role and the position.
create table public.profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references auth.users (id) on delete cascade,
  name             text not null,
  role             text not null default 'worker' check (role in ('admin', 'worker')),
  position         text,
  password_changed boolean not null default false,
  created_at       timestamptz not null default now()
);

-- A message is addressed to a position (not to individual users).
create table public.messages (
  id                 bigint generated always as identity primary key,
  content            text not null,
  description        text not null,
  recipient_position text not null check (length(trim(recipient_position)) > 0),
  created_at         timestamptz not null default now()
);

-- One row per (message, worker): tracks delivery and whether it was read.
create table public.message_recipients (
  id         uuid primary key default gen_random_uuid(),
  message_id bigint not null references public.messages (id) on delete cascade,
  user_id    uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at    timestamptz,
  unique (message_id, user_id)
);

create index profiles_position_idx          on public.profiles (position);
create index message_recipients_user_idx    on public.message_recipients (user_id, read_at);
create index message_recipients_message_idx on public.message_recipients (message_id);


-- ---------------------------------------------------------------------
-- 2. FUNCTIONS AND TRIGGERS
-- ---------------------------------------------------------------------

-- is_admin(): used inside RLS policies. SECURITY DEFINER so the policies on
-- "profiles" can call it without recursing into themselves.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- fan_out_message(): when a message is created, deliver it to every worker
-- whose position matches. Runs as definer so clients never need INSERT
-- permission on message_recipients.
create or replace function public.fan_out_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.message_recipients (message_id, user_id)
  select new.id, p.user_id
  from public.profiles p
  where p.role = 'worker'
    and p.position = new.recipient_position;
  return new;
end;
$$;

create trigger on_message_created
after insert on public.messages
for each row execute function public.fan_out_message();

-- resync_message_recipients(): when an admin changes a message's position,
-- the old recipients lose it and the new position's workers receive it (unread).
create or replace function public.resync_message_recipients()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.recipient_position is distinct from old.recipient_position then
    delete from public.message_recipients where message_id = new.id;

    insert into public.message_recipients (message_id, user_id)
    select new.id, p.user_id
    from public.profiles p
    where p.role = 'worker'
      and p.position = new.recipient_position;
  end if;
  return new;
end;
$$;

create trigger on_message_position_updated
after update of recipient_position on public.messages
for each row execute function public.resync_message_recipients();

-- mark_message_read(): a worker marks ONE of their own messages as read.
-- Only sets read_at, only once, only for auth.uid().
create or replace function public.mark_message_read(p_message_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.message_recipients
  set read_at = coalesce(read_at, now())
  where message_id = p_message_id
    and user_id = auth.uid();
$$;

-- mark_password_changed(): called by the app right after the user sets a new
-- password (see src/lib/auth/password-actions.ts).
create or replace function public.mark_password_changed()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set password_changed = true
  where user_id = auth.uid();
$$;

-- Lock down who can execute what.
revoke execute on function public.is_admin()               from public, anon;
revoke execute on function public.mark_message_read(bigint) from public, anon;
revoke execute on function public.mark_password_changed()  from public, anon;
revoke execute on function public.fan_out_message()        from public, anon, authenticated;
revoke execute on function public.resync_message_recipients() from public, anon, authenticated;

grant execute on function public.is_admin()               to authenticated;
grant execute on function public.mark_message_read(bigint) to authenticated;
grant execute on function public.mark_password_changed()  to authenticated;


-- ---------------------------------------------------------------------
-- 3. TABLE PRIVILEGES (defense in depth, on top of RLS)
-- ---------------------------------------------------------------------
-- RLS limits WHICH ROWS a user can touch; privileges limit WHICH COLUMNS and
-- operations. Supabase grants everything by default, so we start from zero.

revoke all on public.profiles           from anon, authenticated;
revoke all on public.messages           from anon, authenticated;
revoke all on public.message_recipients from anon, authenticated;

grant select                         on public.profiles           to authenticated;
grant update (position)              on public.profiles           to authenticated; -- admins only (policy)
grant select, insert, delete         on public.messages           to authenticated;
grant update (recipient_position)    on public.messages           to authenticated; -- admins only (policy)
grant select                         on public.message_recipients to authenticated;


-- ---------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table public.profiles           enable row level security;
alter table public.messages           enable row level security;
alter table public.message_recipients enable row level security;

-- profiles: everyone reads their own; admins read all.
create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- profiles: only admins change a worker's position (column grant limits the
-- update to "position"; role/name/password_changed can never be updated).
create policy "profiles_update_position_admin"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
-- No INSERT/DELETE policies: workers are created/deleted only by the Edge
-- Functions (service role).

-- messages: admins read all; workers read only what was delivered to them.
create policy "messages_select_admin_or_recipient"
  on public.messages for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.message_recipients r
      where r.message_id = messages.id
        and r.user_id = (select auth.uid())
    )
  );

create policy "messages_insert_admin"
  on public.messages for insert to authenticated
  with check (public.is_admin());

create policy "messages_update_admin"
  on public.messages for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "messages_delete_admin"
  on public.messages for delete to authenticated
  using (public.is_admin());

-- message_recipients: workers read their own rows; admins read all.
-- No INSERT/UPDATE/DELETE policies: rows are created by triggers, read_at is
-- set through mark_message_read(), deletion cascades from messages/profiles.
create policy "recipients_select_own_or_admin"
  on public.message_recipients for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());


-- ---------------------------------------------------------------------
-- 5. REALTIME
-- ---------------------------------------------------------------------
-- Realtime respects the SELECT policies above (except DELETE events, which
-- cannot be filtered and only carry the primary key).
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_recipients;


-- ---------------------------------------------------------------------
-- 6. FIRST ADMIN (manual)
-- ---------------------------------------------------------------------
-- a) Authentication -> Users -> "Add user" -> create the admin with email +
--    password (tick "Auto Confirm User").
-- b) Run this with that admin's email (it will NOT work for workers: those
--    are created from the dashboard through the create-worker Edge Function):
--
-- insert into public.profiles (user_id, name, role, password_changed)
-- select id, 'Your Name', 'admin', true
-- from auth.users
-- where email = 'admin@yourcompany.com';