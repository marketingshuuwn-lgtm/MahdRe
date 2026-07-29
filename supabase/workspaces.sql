-- شغّل هذا الملف مرة واحدة في Supabase Studio > SQL Editor
-- يجعل المساحات مصدر حقيقة واحداً مثل المهام (بدل localStorage فقط)

create table if not exists public.workspaces (
  id          text primary key,
  label       text not null,
  icon        text not null default 'ph-folder',
  color       text not null default 'var(--accent)',
  bg          text not null default 'var(--accent-light)',
  is_default  boolean not null default false,
  archived    boolean not null default false,
  trait       text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists workspaces_sort_idx
  on public.workspaces (archived, sort_order, created_at);

alter table public.workspaces enable row level security;

drop policy if exists "Allow all access to workspaces" on public.workspaces;
create policy "Allow all access to workspaces"
  on public.workspaces for all using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table public.workspaces;
exception when duplicate_object then null;
end $$;

-- بذور افتراضية إن كان الجدول فارغاً
insert into public.workspaces (id, label, icon, color, bg, is_default, archived, trait, sort_order)
select * from (values
  ('work', 'عمل', 'ph-briefcase', 'var(--accent)', 'var(--accent-light)', true, false, '', 0),
  ('personal', 'شخصي', 'ph-house-line', 'var(--success)', 'var(--success-light)', true, false, '', 1)
) as v(id, label, icon, color, bg, is_default, archived, trait, sort_order)
where not exists (select 1 from public.workspaces limit 1);
