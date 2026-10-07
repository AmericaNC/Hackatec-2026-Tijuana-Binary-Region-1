-- Crear tabla de perfiles
create table public.perfiles (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null,
  carrera text not null,
  matricula text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar seguridad a nivel de filas (RLS)
alter table public.perfiles enable row level security;

-- Políticas de acceso: los usuarios solo ven y modifican su propio perfil según su UID
create policy "Los usuarios pueden ver su propio perfil."
  on public.perfiles for select
  using (auth.uid() = id);

create policy "Los usuarios pueden insertar su propio perfil."
  on public.perfiles for insert
  with check (auth.uid() = id);

create policy "Los usuarios pueden actualizar su propio perfil."
  on public.perfiles for update
  using (auth.uid() = id);