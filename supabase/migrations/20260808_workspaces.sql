-- مساحات العمل — مزامنة بين الأجهزة (نفس نمط جدول tasks بدون user_id)
-- شغّل هذا في SQL Editor في Supabase مرة واحدة.

create table if not exists public.workspaces (
  id text primary key,
  label text not null,
  icon text not null default 'ph-folder',
  color text not null default 'var(--accent)',
  bg text not null default 'var(--accent-light)',
  is_default boolean not null default false,
  archived boolean not null default false,
  trait text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspaces_sort_idx on public.workspaces (sort_order, created_at);

-- صلاحيات بسيطة (anon) بما يتوافق مع tasks الحالية
alter table public.workspaces enable row level security;

drop policy if exists "workspaces_select_all" on public.workspaces;
drop policy if exists "workspaces_insert_all" on public.workspaces;
drop policy if exists "workspaces_update_all" on public.workspaces;
drop policy if exists "workspaces_delete_all" on public.workspaces;

create policy "workspaces_select_all" on public.workspaces for select using (true);
create policy "workspaces_insert_all" on public.workspaces for insert with check (true);
create policy "workspaces_update_all" on public.workspaces for update using (true);
create policy "workspaces_delete_all" on public.workspaces for delete using (true);

-- بذور افتراضية إن كان الجدول فارغاً (لا تستبدل صفوفاً موجودة)
insert into public.workspaces (id, label, icon, color, bg, is_default, archived, trait, sort_order)
values
  ('work', 'عمل', 'ph-briefcase', 'var(--accent)', 'var(--accent-light)', true, false, '', 0),
  ('personal', 'شخصي', 'ph-house-line', 'var(--success)', 'var(--success-light)', true, false, '', 1),
  ('alama', 'علامة', 'ph-kanban', '#0079bf', 'rgba(0, 121, 191, 0.12)', true, false, 'مهام تريلو', 2)
on conflict (id) do nothing;
