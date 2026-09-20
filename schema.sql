-- Barbearia Renato Carriço — schema Supabase (rode 1x no SQL Editor)
create table if not exists store (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
create table if not exists appointments (
  id text primary key,
  client text not null,
  phone text not null default '',
  service_id text not null default '',
  service_name text not null default '',
  price numeric not null default 0,
  barber text not null default 'Renato Carriço',
  date text not null,
  time text not null,
  end_time text not null default '',
  note text not null default '',
  status text not null default 'confirmado',
  created_at timestamptz default now()
);
create table if not exists blocks (
  id text primary key,
  date text not null,
  start_time text not null,
  end_time text not null,
  reason text not null default ''
);
alter table store enable row level security;
alter table appointments enable row level security;
alter table blocks enable row level security;
drop policy if exists "public all store" on store;
drop policy if exists "public all appointments" on appointments;
drop policy if exists "public all blocks" on blocks;
create policy "public all store" on store for all using (true) with check (true);
create policy "public all appointments" on appointments for all using (true) with check (true);
create policy "public all blocks" on blocks for all using (true) with check (true);
create index if not exists idx_appt_date on appointments(date);
create index if not exists idx_blocks_date on blocks(date);
-- linha inicial do documento principal
insert into store (id, data) values ('main', '{}'::jsonb)
on conflict (id) do nothing;
