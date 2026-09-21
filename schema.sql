-- Renato Carriço Barbearia
-- Banco relacional, protegido por RLS e preparado para Supabase Realtime.
-- Execute este arquivo inteiro no SQL Editor de um projeto Supabase novo.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- Uma conta de Auth só se torna administradora após receber um perfil staff.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.business_profile (
  id boolean primary key default true check (id),
  shop_name text not null default 'Renato Carriço Barbearia',
  headline text not null default 'Cada detalhe faz o estilo.',
  description text not null default 'Corte, barba e uma pausa bem-feita.',
  address text not null default 'Av. Atilio Rauta, 783 — Anchieta / ES',
  maps_url text not null default 'https://www.google.com/maps/search/?api=1&query=Av.+Atilio+Rauta+783+Anchieta+ES',
  instagram_url text not null default 'https://instagram.com/',
  whatsapp_number text not null default '5528999137277' check (whatsapp_number ~ '^[0-9]{10,15}$'),
  timezone text not null default 'America/Sao_Paulo',
  updated_at timestamptz not null default now()
);

create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  description text not null default '',
  duration_minutes smallint not null check (duration_minutes in (15, 30, 45, 60, 75, 90, 120)),
  price_cents integer not null check (price_cents >= 0 and price_cents <= 1000000),
  active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 0 = domingo, 1 = segunda, ... 6 = sábado.
create table if not exists public.business_hours (
  day_of_week smallint primary key check (day_of_week between 0 and 6),
  is_open boolean not null default true,
  opens_at time not null default '08:30',
  closes_at time not null default '18:00',
  break_starts_at time,
  break_ends_at time,
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at),
  check ((break_starts_at is null and break_ends_at is null) or
         (break_starts_at is not null and break_ends_at is not null and
          break_starts_at > opens_at and break_ends_at < closes_at and break_ends_at > break_starts_at))
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null check (char_length(trim(client_name)) between 3 and 100),
  phone text not null check (phone ~ '^[0-9]{10,15}$'),
  service_id uuid not null references public.services(id) on delete restrict,
  barber_id uuid not null references public.barbers(id) on delete restrict,
  starts_at timestamp without time zone not null,
  ends_at timestamp without time zone not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'completed', 'cancelled')),
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  check (ends_at > starts_at)
);

-- O índice de exclusão é a última linha de defesa contra duas reservas no mesmo horário.
alter table public.appointments drop constraint if exists appointments_no_overlap;
alter table public.appointments add constraint appointments_no_overlap
  exclude using gist (
    barber_id with =,
    tsrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('confirmed', 'completed'));

create table if not exists public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  starts_at timestamp without time zone not null,
  ends_at timestamp without time zone not null,
  reason text not null default '' check (char_length(reason) <= 160),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  check (ends_at > starts_at)
);

-- Sinal público sem dados pessoais: permite atualizar horários livres em telas abertas.
create table if not exists public.availability_state (
  id boolean primary key default true check (id),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists appointments_starts_at_idx on public.appointments (starts_at);
create index if not exists calendar_blocks_starts_at_idx on public.calendar_blocks (starts_at);
create index if not exists services_active_sort_idx on public.services (active, sort_order);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_business_profile on public.business_profile;
create trigger touch_business_profile before update on public.business_profile
for each row execute function public.touch_updated_at();
drop trigger if exists touch_services on public.services;
create trigger touch_services before update on public.services
for each row execute function public.touch_updated_at();
drop trigger if exists touch_business_hours on public.business_hours;
create trigger touch_business_hours before update on public.business_hours
for each row execute function public.touch_updated_at();
drop trigger if exists touch_appointments on public.appointments;
create trigger touch_appointments before update on public.appointments
for each row execute function public.touch_updated_at();

create or replace function public.bump_availability_revision()
returns trigger language plpgsql set search_path = public as $$
begin
  update public.availability_state
    set revision = revision + 1, updated_at = now()
    where id = true;
  return coalesce(new, old);
end;
$$;
drop trigger if exists bump_availability_from_appointments on public.appointments;
create trigger bump_availability_from_appointments after insert or update or delete on public.appointments
for each row execute function public.bump_availability_revision();
drop trigger if exists bump_availability_from_blocks on public.calendar_blocks;
create trigger bump_availability_from_blocks after insert or update or delete on public.calendar_blocks
for each row execute function public.bump_availability_revision();

-- SECURITY DEFINER evita recursão na policy da tabela profiles. A função pertence ao dono do schema.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'staff')
  );
$$;

create or replace function public.require_staff()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;
end;
$$;

-- Lista apenas horários livres: nenhum dado pessoal de agendamento é exposto ao visitante.
create or replace function public.get_available_slots(p_service_id uuid, p_date date)
returns table(slot time)
language plpgsql stable security definer set search_path = public as $$
declare
  v_duration smallint;
  v_today date := (now() at time zone coalesce((select timezone from public.business_profile where id = true), 'America/Sao_Paulo'))::date;
  v_now time := (now() at time zone coalesce((select timezone from public.business_profile where id = true), 'America/Sao_Paulo'))::time;
begin
  if p_date < v_today or p_date > v_today + 90 then
    return;
  end if;

  select duration_minutes into v_duration
  from public.services where id = p_service_id and active = true;
  if v_duration is null then return; end if;

  return query
  with opening as (
    select h.opens_at, h.closes_at, h.break_starts_at, h.break_ends_at
    from public.business_hours h
    where h.day_of_week = extract(dow from p_date)::smallint and h.is_open
  ), candidates as (
    select gs as starts_at, gs + make_interval(mins => v_duration) as ends_at
    from opening o,
      generate_series(
        (p_date + o.opens_at)::timestamp,
        (p_date + o.closes_at)::timestamp - make_interval(mins => v_duration),
        interval '30 minutes'
      ) gs
  )
  select c.starts_at::time
  from candidates c
  cross join opening o
  where not (o.break_starts_at is not null and
    tsrange(c.starts_at, c.ends_at, '[)') &&
    tsrange((p_date + o.break_starts_at)::timestamp, (p_date + o.break_ends_at)::timestamp, '[)'))
    and not exists (
      select 1 from public.appointments a
      where a.status in ('confirmed', 'completed')
        and tsrange(a.starts_at, a.ends_at, '[)') && tsrange(c.starts_at, c.ends_at, '[)')
    )
    and not exists (
      select 1 from public.calendar_blocks b
      where tsrange(b.starts_at, b.ends_at, '[)') && tsrange(c.starts_at, c.ends_at, '[)')
    )
    and (p_date > v_today or c.starts_at::time > v_now)
  order by c.starts_at;
end;
$$;

-- Reserva pública atômica. O lock também serializa uma reserva e um bloqueio criados ao mesmo tempo.
create or replace function public.create_public_booking(
  p_client_name text, p_phone text, p_service_id uuid, p_date date, p_time time
) returns public.appointments
language plpgsql security definer set search_path = public as $$
declare
  v_service public.services%rowtype;
  v_barber_id uuid;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\\D', '', 'g');
  v_start timestamp := (p_date + p_time)::timestamp;
  v_end timestamp;
  v_today date := (now() at time zone coalesce((select timezone from public.business_profile where id = true), 'America/Sao_Paulo'))::date;
  v_appointment public.appointments%rowtype;
begin
  if char_length(trim(coalesce(p_client_name, ''))) not between 3 and 100 then
    raise exception 'Informe um nome com pelo menos 3 caracteres' using errcode = 'P0001';
  end if;
  if v_phone !~ '^[0-9]{10,15}$' then
    raise exception 'Informe um WhatsApp válido' using errcode = 'P0001';
  end if;
  if p_date < v_today or p_date > v_today + 90 then
    raise exception 'Escolha uma data entre hoje e os próximos 90 dias' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('renato-carriço-calendar'));
  select * into v_service from public.services where id = p_service_id and active = true;
  if not found then raise exception 'Serviço indisponível' using errcode = 'P0001'; end if;
  select id into v_barber_id from public.barbers where active = true order by created_at limit 1;
  if v_barber_id is null then raise exception 'Agenda indisponível no momento' using errcode = 'P0001'; end if;
  v_end := v_start + make_interval(mins => v_service.duration_minutes);

  if not exists (select 1 from public.get_available_slots(p_service_id, p_date) where slot = p_time) then
    raise exception 'Este horário não está mais disponível' using errcode = 'P0001';
  end if;

  insert into public.appointments (client_name, phone, service_id, barber_id, starts_at, ends_at)
  values (trim(p_client_name), v_phone, p_service_id, v_barber_id, v_start, v_end)
  returning * into v_appointment;
  insert into public.audit_logs (action, entity, entity_id, details)
  values ('booking_created', 'appointment', v_appointment.id::text, jsonb_build_object('source', 'public'));
  return v_appointment;
exception when exclusion_violation then
  raise exception 'Este horário acabou de ser reservado. Escolha outro.' using errcode = 'P0001';
end;
$$;

create or replace function public.set_appointment_status(p_appointment_id uuid, p_status text)
returns public.appointments
language plpgsql security definer set search_path = public as $$
declare v_appointment public.appointments%rowtype;
begin
  perform public.require_staff();
  if p_status not in ('confirmed', 'completed', 'cancelled') then
    raise exception 'Status inválido' using errcode = 'P0001';
  end if;
  update public.appointments
    set status = p_status,
        cancelled_at = case when p_status = 'cancelled' then now() else null end
    where id = p_appointment_id returning * into v_appointment;
  if not found then raise exception 'Agendamento não encontrado' using errcode = 'P0001'; end if;
  insert into public.audit_logs(actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'status_changed', 'appointment', p_appointment_id::text, jsonb_build_object('status', p_status));
  return v_appointment;
end;
$$;

create or replace function public.create_calendar_block(p_starts_at timestamp, p_ends_at timestamp, p_reason text default '')
returns public.calendar_blocks
language plpgsql security definer set search_path = public as $$
declare v_barber_id uuid; v_block public.calendar_blocks%rowtype;
begin
  perform public.require_staff();
  if p_ends_at <= p_starts_at then raise exception 'Fim deve ser posterior ao início' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('renato-carriço-calendar'));
  select id into v_barber_id from public.barbers where active = true order by created_at limit 1;
  if exists (select 1 from public.appointments a where a.status in ('confirmed','completed')
      and tsrange(a.starts_at,a.ends_at,'[)') && tsrange(p_starts_at,p_ends_at,'[)')) then
    raise exception 'Há atendimento confirmado nesse intervalo' using errcode = 'P0001';
  end if;
  insert into public.calendar_blocks(barber_id, starts_at, ends_at, reason, created_by)
  values(v_barber_id, p_starts_at, p_ends_at, left(coalesce(p_reason,''),160), auth.uid()) returning * into v_block;
  return v_block;
end;
$$;

-- Auditoria enxuta para mudanças administrativas em serviços e perfil.
create or replace function public.audit_admin_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(actor_id, action, entity, entity_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name, coalesce(new.id::text, old.id::text), '{}'::jsonb);
  return coalesce(new, old);
end;
$$;
drop trigger if exists audit_services on public.services;
create trigger audit_services after insert or update or delete on public.services
for each row execute function public.audit_admin_write();
drop trigger if exists audit_business_profile on public.business_profile;
create trigger audit_business_profile after update on public.business_profile
for each row execute function public.audit_admin_write();

-- RLS: visitantes só leem conteúdo público e só podem chamar as RPCs explicitamente liberadas.
alter table public.profiles enable row level security;
alter table public.business_profile enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.business_hours enable row level security;
alter table public.appointments enable row level security;
alter table public.calendar_blocks enable row level security;
alter table public.availability_state enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "public reads business profile" on public.business_profile;
create policy "public reads business profile" on public.business_profile for select using (true);
drop policy if exists "public reads services" on public.services;
create policy "public reads services" on public.services for select using (true);
drop policy if exists "public reads business hours" on public.business_hours;
create policy "public reads business hours" on public.business_hours for select using (true);
drop policy if exists "public reads availability revision" on public.availability_state;
create policy "public reads availability revision" on public.availability_state for select using (true);
drop policy if exists "staff reads own profile" on public.profiles;
create policy "staff reads own profile" on public.profiles for select using (id = auth.uid() or public.is_staff());
drop policy if exists "staff manages public content" on public.business_profile;
create policy "staff manages public content" on public.business_profile for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff manages services" on public.services;
create policy "staff manages services" on public.services for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff manages hours" on public.business_hours;
create policy "staff manages hours" on public.business_hours for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff sees appointments" on public.appointments;
create policy "staff sees appointments" on public.appointments for select using (public.is_staff());
drop policy if exists "staff sees blocks" on public.calendar_blocks;
create policy "staff sees blocks" on public.calendar_blocks for select using (public.is_staff());
drop policy if exists "staff sees audit" on public.audit_logs;
create policy "staff sees audit" on public.audit_logs for select using (public.is_staff());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.business_profile, public.services, public.business_hours, public.availability_state to anon, authenticated;
grant select on public.profiles, public.appointments, public.calendar_blocks, public.audit_logs to authenticated;
grant insert, update, delete on public.business_profile, public.services, public.business_hours to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.get_available_slots(uuid, date) to anon, authenticated;
grant execute on function public.create_public_booking(text, text, uuid, date, time) to anon, authenticated;
grant execute on function public.set_appointment_status(uuid, text) to authenticated;
grant execute on function public.create_calendar_block(timestamp, timestamp, text) to authenticated;

-- Dados iniciais. O primeiro barbeiro ativo é usado pela agenda pública.
insert into public.business_profile (id) values (true) on conflict (id) do nothing;
insert into public.availability_state (id) values (true) on conflict (id) do nothing;
insert into public.barbers (name) select 'Renato Carriço'
where not exists (select 1 from public.barbers);
insert into public.services (name, description, duration_minutes, price_cents, sort_order)
select * from (values
  ('Corte Degradê', 'Máquina, tesoura e finalização.', 30::smallint, 5000, 10::smallint),
  ('Corte + Barba', 'Combo completo com toalha quente.', 60::smallint, 8000, 20::smallint),
  ('Barba Navalha', 'Contorno, navalha e hidratação.', 30::smallint, 3500, 30::smallint)
) as seed(name, description, duration_minutes, price_cents, sort_order)
where not exists (select 1 from public.services);
insert into public.business_hours(day_of_week,is_open,opens_at,closes_at,break_starts_at,break_ends_at)
values
  (0,false,'08:30','18:00',null,null),
  (1,true,'08:30','20:30','12:00','13:20'),
  (2,true,'08:30','20:30','12:00','13:20'),
  (3,true,'08:30','20:30','12:00','13:20'),
  (4,true,'08:30','20:30','12:00','13:20'),
  (5,true,'08:30','20:30','12:00','13:20'),
  (6,true,'08:30','18:00','12:00','13:20')
on conflict (day_of_week) do nothing;

-- Realtime para painel administrativo e atualização imediata de serviços/horários públicos.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'appointments') then
    alter publication supabase_realtime add table public.appointments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'services') then
    alter publication supabase_realtime add table public.services;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'business_hours') then
    alter publication supabase_realtime add table public.business_hours;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'business_profile') then
    alter publication supabase_realtime add table public.business_profile;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'availability_state') then
    alter publication supabase_realtime add table public.availability_state;
  end if;
end $$;

-- Depois de criar uma pessoa em Authentication > Users, promova-a assim:
-- insert into public.profiles (id, display_name, role)
-- values ('COLE-AQUI-O-UUID-DO-USUARIO', 'Renato Carriço', 'owner');
