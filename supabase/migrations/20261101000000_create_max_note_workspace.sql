create table if not exists public.max_note_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note','prompt')),
  title text not null default 'Tanpa judul',
  content text not null default '',
  category text not null default 'Umum',
  tags text[] not null default '{}',
  image_path text,
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists max_note_items_user_updated_idx on public.max_note_items(user_id, updated_at desc);
create index if not exists max_note_items_user_kind_idx on public.max_note_items(user_id, kind, is_archived);
alter table public.max_note_items enable row level security;
drop policy if exists "Users manage their own Max Note items" on public.max_note_items;
create policy "Users manage their own Max Note items" on public.max_note_items for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('max-note-media', 'max-note-media', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;
drop policy if exists "Users read own Max Note media" on storage.objects;
create policy "Users read own Max Note media" on storage.objects for select to authenticated
using (bucket_id = 'max-note-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users upload own Max Note media" on storage.objects;
create policy "Users upload own Max Note media" on storage.objects for insert to authenticated
with check (bucket_id = 'max-note-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users update own Max Note media" on storage.objects;
create policy "Users update own Max Note media" on storage.objects for update to authenticated
using (bucket_id = 'max-note-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'max-note-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users delete own Max Note media" on storage.objects;
create policy "Users delete own Max Note media" on storage.objects for delete to authenticated
using (bucket_id = 'max-note-media' and (storage.foldername(name))[1] = auth.uid()::text);