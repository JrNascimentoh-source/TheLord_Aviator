-- Rode isto uma vez no SQL Editor do seu banco (Supabase)
create table if not exists public.velas (
  id bigserial primary key,
  game text not null default 'aviator',
  value numeric not null check (value >= 1),
  created_at timestamptz not null default now()
);
create index if not exists velas_created_idx on public.velas (created_at desc);
grant select, insert on public.velas to anon, authenticated;
grant usage, select on sequence public.velas_id_seq to anon, authenticated;
alter table public.velas enable row level security;
drop policy if exists "ler velas" on public.velas;
create policy "ler velas" on public.velas for select using (created_at > now() - interval '24 hours');
drop policy if exists "inserir velas" on public.velas;
create policy "inserir velas" on public.velas for insert with check (value >= 1 and value < 1000000 and game in ('aviator','aviator2'));
