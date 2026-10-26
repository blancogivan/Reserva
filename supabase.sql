-- Reserva · base de datos en Supabase
-- Pégalo entero en SQL Editor → New query → Run. Se puede ejecutar más de una vez sin romper nada.

-- 1. Documentos de la app (rutinas, sesiones, salud por meses, ajustes…), cada uno de su dueño
create table if not exists public.docs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  col text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, col, id)
);
alter table public.docs enable row level security;
drop policy if exists "docs: solo el dueño" on public.docs;
create policy "docs: solo el dueño" on public.docs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Lo que envía el atajo de Salud, tal cual, hasta que la app lo procesa
create table if not exists public.salud_raw (
  n bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  recibido timestamptz not null default now(),
  payload text not null
);
alter table public.salud_raw enable row level security;
drop policy if exists "salud_raw: leer y borrar lo mío" on public.salud_raw;
create policy "salud_raw: leer y borrar lo mío" on public.salud_raw
  for select using (auth.uid() = user_id);
drop policy if exists "salud_raw: borrar lo mío" on public.salud_raw;
create policy "salud_raw: borrar lo mío" on public.salud_raw
  for delete using (auth.uid() = user_id);

-- 3. Clave secreta del atajo (una por persona); la crea la app
create table if not exists public.atajo_tokens (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  token text not null unique,
  creado timestamptz not null default now()
);
alter table public.atajo_tokens enable row level security;
drop policy if exists "tokens: solo el dueño" on public.atajo_tokens;
create policy "tokens: solo el dueño" on public.atajo_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Puerta de entrada del atajo: guarda el texto si la clave es válida (no deja leer nada)
create or replace function public.ingest_salud(p_token text, p_payload text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid;
begin
  select user_id into uid from public.atajo_tokens where token = p_token;
  if uid is null then raise exception 'clave no válida'; end if;
  if length(p_payload) > 2000000 then raise exception 'demasiado grande'; end if;
  insert into public.salud_raw(user_id, payload) values (uid, p_payload);
  return 'ok';
end $$;
revoke all on function public.ingest_salud(text, text) from public;
grant execute on function public.ingest_salud(text, text) to anon, authenticated;
