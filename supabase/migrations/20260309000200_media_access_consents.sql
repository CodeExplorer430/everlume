create table if not exists public.media_access_consents (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  photo_id uuid references public.photos(id) on delete set null,
  access_mode text not null,
  event_type text not null check (event_type in ('consent_granted', 'media_accessed')),
  consent_source text not null default 'protected_media_gate',
  media_kind text,
  media_variant text,
  ip_hash text not null,
  user_agent_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists media_access_consents_page_created_at_idx
  on public.media_access_consents (page_id, created_at desc);

create index if not exists media_access_consents_photo_created_at_idx
  on public.media_access_consents (photo_id, created_at desc);

alter table public.media_access_consents enable row level security;

drop policy if exists "Admins can read media access consents." on public.media_access_consents;
create policy "Admins can read media access consents." on public.media_access_consents
  for select using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'editor', 'viewer')
        and profiles.is_active = true
    )
  );
