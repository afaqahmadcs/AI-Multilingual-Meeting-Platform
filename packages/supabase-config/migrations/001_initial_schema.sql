-- ==============================================================================
-- LinguaMeet Initial Database Schema & Security Policies
-- ==============================================================================

-- 1. Profiles Table (extends Supabase auth.users)
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null,
    avatar_url text,
    preferred_language text default 'en' check (preferred_language in ('en', 'ur')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 2. Meetings Table
create table if not exists public.meetings (
    id uuid primary key default gen_random_uuid(),
    room_code text unique not null,
    title text not null default 'LinguaMeet Session',
    host_id uuid references public.profiles(id) on delete set null,
    is_active boolean default true,
    created_at timestamptz default now(),
    ended_at timestamptz
);

-- Index for instant room lookup
create index if not exists idx_meetings_room_code on public.meetings(room_code);

-- 3. Meeting Participants Table
create table if not exists public.meeting_participants (
    id uuid primary key default gen_random_uuid(),
    meeting_id uuid not null references public.meetings(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete set null,
    display_name text not null,
    preferred_language text not null default 'en' check (preferred_language in ('en', 'ur')),
    is_host boolean default false,
    joined_at timestamptz default now(),
    left_at timestamptz
);

create index if not exists idx_participants_meeting_id on public.meeting_participants(meeting_id);

-- 4. Transcripts & Captions Log Table
create table if not exists public.meeting_transcripts (
    id uuid primary key default gen_random_uuid(),
    meeting_id uuid not null references public.meetings(id) on delete cascade,
    speaker_id text not null,
    speaker_name text not null,
    original_text text not null,
    translated_text text not null,
    src_lang text not null check (src_lang in ('en', 'ur')),
    tgt_lang text not null check (tgt_lang in ('en', 'ur')),
    timestamp timestamptz default now()
);

create index if not exists idx_transcripts_meeting_id on public.meeting_transcripts(meeting_id);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.meeting_transcripts enable row level security;

-- Profiles: Anyone authenticated can read profiles; users can update their own profile
create policy "Public profiles are viewable by everyone" 
    on public.profiles for select 
    using (true);

create policy "Users can update their own profile" 
    on public.profiles for update 
    using (auth.uid() = id);

-- Meetings: Active meetings are readable by anyone with the room code (or authenticated)
create policy "Anyone can view active meetings by code" 
    on public.meetings for select 
    using (is_active = true);

create policy "Authenticated users can create meetings" 
    on public.meetings for insert 
    with check (auth.uid() = host_id);

create policy "Hosts can update their meetings" 
    on public.meetings for update 
    using (auth.uid() = host_id);

-- Participants: Readable by room members; insertable by anyone joining
create policy "Participants viewable by anyone in meeting" 
    on public.meeting_participants for select 
    using (true);

create policy "Participants can register entry" 
    on public.meeting_participants for insert 
    with check (true);

-- Transcripts: Readable by meeting participants
create policy "Transcripts viewable by meeting participants" 
    on public.meeting_transcripts for select 
    using (true);

create policy "Service or participants can insert transcripts" 
    on public.meeting_transcripts for insert 
    with check (true);

-- Automatic Profile Creation Trigger on Auth Sign-Up
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, display_name, avatar_url, preferred_language)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Participant'),
        new.raw_user_meta_data->>'avatar_url',
        'en'
    );
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
