-- =========================================================
-- SHELFIE — Supabase schema + RLS
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- =========================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- USERS  (extends Supabase's built-in auth.users)
-- ---------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  avatar_url text,
  reading_goal int not null default 12,
  is_pro boolean not null default false,
  pro_expires timestamptz,
  created_at timestamptz not null default now()
);

-- auto-create a users row whenever someone signs up via Supabase Auth
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- BOOKS  (shared cache — one row per book, reused by everyone)
-- ---------------------------------------------------------
create table public.books (
  id uuid primary key default uuid_generate_v4(),
  google_books_id text unique,          -- null for manual entries
  title text not null,
  author text,
  cover_url text,
  page_count int,
  isbn text,
  genre text,
  description text,
  source text not null default 'google_books' check (source in ('google_books', 'open_library', 'manual')),
  created_at timestamptz not null default now()
);

create index idx_books_title on public.books using gin (to_tsvector('english', title));
create index idx_books_google_id on public.books (google_books_id);

-- ---------------------------------------------------------
-- USER_BOOKS  (a user's shelf entry for a book)
-- ---------------------------------------------------------
create table public.user_books (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  shelf text not null default 'want_to_read' check (shelf in ('want_to_read','currently_reading','read','dnf')),
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  rating numeric(2,1) check (rating >= 0 and rating <= 5),
  mood text check (mood in ('Happy','Sad','Dark','Exciting','Relaxing','Thought-provoking')),
  pace text check (pace in ('Fast','Medium','Slow')),
  review text,
  private_notes text,
  content_warnings text[] default '{}',
  start_date date,
  finish_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create index idx_user_books_user on public.user_books (user_id);
create index idx_user_books_shelf on public.user_books (user_id, shelf);

-- keep updated_at fresh
create function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_user_books_updated
  before update on public.user_books
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------
-- READING_SESSIONS  (daily log → powers streaks + stats)
-- ---------------------------------------------------------
create table public.reading_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid references public.books(id) on delete set null,
  pages_read int not null default 0,
  date date not null default current_date,
  streak_day int,
  created_at timestamptz not null default now()
);

create index idx_sessions_user_date on public.reading_sessions (user_id, date);

-- ---------------------------------------------------------
-- BUDDY READS
-- ---------------------------------------------------------
create table public.buddy_reads (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid not null references public.books(id) on delete cascade,
  host_id uuid not null references public.users(id) on delete cascade,
  max_members int not null default 5 check (max_members between 2 and 5),
  pace text,
  message text,
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.buddy_read_members (
  id uuid primary key default uuid_generate_v4(),
  buddy_read_id uuid not null references public.buddy_reads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','removed')),
  joined_at timestamptz not null default now(),
  unique (buddy_read_id, user_id)
);

create table public.buddy_read_messages (
  id uuid primary key default uuid_generate_v4(),
  buddy_read_id uuid not null references public.buddy_reads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  chapter int,
  message text not null,
  flagged boolean not null default false,   -- set true by profanity filter (see edge function)
  reported_count int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_buddy_messages_read on public.buddy_read_messages (buddy_read_id, created_at);

-- ---------------------------------------------------------
-- CHALLENGES / BADGES
-- ---------------------------------------------------------
create table public.challenges (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  type text,               -- e.g. 'book_count', 'page_count', 'genre'
  target int not null,
  start_date date,
  end_date date,
  badge_image_url text,
  created_at timestamptz not null default now()
);

create table public.user_challenges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  progress int not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (user_id, challenge_id)
);

create table public.badges (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  icon text,
  condition text,           -- machine-readable rule, e.g. 'books_finished>=1'
  created_at timestamptz not null default now()
);

create table public.user_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.users enable row level security;
alter table public.books enable row level security;
alter table public.user_books enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.buddy_reads enable row level security;
alter table public.buddy_read_members enable row level security;
alter table public.buddy_read_messages enable row level security;
alter table public.challenges enable row level security;
alter table public.user_challenges enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

-- USERS: everyone can read basic profile info (needed for buddy read host names etc.),
-- but only the owner can update their own row.
create policy "users_select_all" on public.users for select using (true);
create policy "users_update_own" on public.users for update using (auth.uid() = id);

-- BOOKS: shared cache — anyone signed in can read; anyone signed in can insert
-- (so the app can cache a newly-searched book). No update/delete from clients.
create policy "books_select_all" on public.books for select using (auth.role() = 'authenticated');
create policy "books_insert_authenticated" on public.books for insert with check (auth.role() = 'authenticated');

-- USER_BOOKS: strictly private to the owner.
create policy "user_books_owner_all" on public.user_books for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- READING_SESSIONS: strictly private to the owner.
create policy "sessions_owner_all" on public.reading_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- BUDDY_READS: everyone can see active/public buddy reads (it's a public feed);
-- only the host can update/archive/delete their own.
create policy "buddy_reads_select_all" on public.buddy_reads for select using (true);
create policy "buddy_reads_insert_own" on public.buddy_reads for insert with check (auth.uid() = host_id);
create policy "buddy_reads_update_own" on public.buddy_reads for update using (auth.uid() = host_id);
create policy "buddy_reads_delete_own" on public.buddy_reads for delete using (auth.uid() = host_id);

-- BUDDY_READ_MEMBERS: a user can see membership rows for buddy reads they host
-- or are a member of; users can request to join (insert their own pending row);
-- only the host can accept/reject/remove (update).
create policy "members_select_related" on public.buddy_read_members for select
  using (
    auth.uid() = user_id
    or auth.uid() in (select host_id from public.buddy_reads where id = buddy_read_id)
  );

create policy "members_insert_own_request" on public.buddy_read_members for insert
  with check (auth.uid() = user_id);

create policy "members_update_host_only" on public.buddy_read_members for update
  using (auth.uid() in (select host_id from public.buddy_reads where id = buddy_read_id));

-- BUDDY_READ_MESSAGES: only accepted members (or the host) can read/post —
-- this is what keeps discussion groups private to the buddy read.
create policy "messages_select_members_only" on public.buddy_read_messages for select
  using (
    auth.uid() in (
      select user_id from public.buddy_read_members
      where buddy_read_id = buddy_read_messages.buddy_read_id and status = 'accepted'
    )
    or auth.uid() in (select host_id from public.buddy_reads where id = buddy_read_id)
  );

create policy "messages_insert_members_only" on public.buddy_read_messages for insert
  with check (
    auth.uid() = user_id
    and (
      auth.uid() in (
        select user_id from public.buddy_read_members
        where buddy_read_id = buddy_read_messages.buddy_read_id and status = 'accepted'
      )
      or auth.uid() in (select host_id from public.buddy_reads where id = buddy_read_id)
    )
  );

-- CHALLENGES / BADGES: reference tables, readable by everyone signed in.
create policy "challenges_select_all" on public.challenges for select using (auth.role() = 'authenticated');
create policy "badges_select_all" on public.badges for select using (auth.role() = 'authenticated');

-- USER_CHALLENGES / USER_BADGES: strictly private to the owner.
create policy "user_challenges_owner_all" on public.user_challenges for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_badges_owner_all" on public.user_badges for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- SEED: starter badges + challenges (safe to re-run: ON CONFLICT DO NOTHING)
-- =========================================================
insert into public.badges (name, description, icon, condition) values
  ('First Book', 'Finish your first book', '🌱', 'books_finished>=1'),
  ('Speed Reader', '500 pages in a week', '⚡', 'pages_in_7_days>=500'),
  ('Genre Explorer', 'Read 5 different genres', '🧭', 'distinct_genres>=5'),
  ('Night Owl', 'Log a reading session after midnight', '🦉', 'session_after_midnight'),
  ('Marathon Reader', '1000 pages in a month', '🏃', 'pages_in_30_days>=1000'),
  ('Streak Master', '30-day reading streak', '🔥', 'streak>=30'),
  ('Social Reader', 'Complete 3 buddy reads', '🤝', 'buddy_reads_completed>=3')
on conflict (name) do nothing;

insert into public.challenges (title, description, type, target, start_date, end_date) values
  ('Read 12 Books in 2026', 'A book a month, give or take.', 'book_count', 12, '2026-01-01', '2026-12-31'),
  ('Fantasy February', 'Three fantasy books in the shortest month.', 'genre_count', 3, '2026-02-01', '2026-02-28'),
  ('A Book Under 200 Pages', 'Sometimes short is sweet.', 'book_count', 1, '2026-01-01', '2026-12-31')
on conflict do nothing;
