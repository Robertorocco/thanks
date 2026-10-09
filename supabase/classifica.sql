-- Classifica del gioco. Da incollare in Supabase > SQL Editor ed eseguire una volta.
-- Chiunque abbia la chiave pubblica può solo aggiungere un tempo e leggere la classifica:
-- non può modificare né cancellare i tempi degli altri.

create table if not exists public.tempi (
  id bigint generated always as identity primary key,
  nome text not null check (char_length(btrim(nome)) between 1 and 24),
  tempo numeric(7, 1) not null check (tempo > 30 and tempo < 3600),
  creato_il timestamptz not null default now()
);

alter table public.tempi enable row level security;

drop policy if exists "chiunque aggiunge un tempo" on public.tempi;
create policy "chiunque aggiunge un tempo" on public.tempi
  for insert to anon, authenticated with check (true);

drop policy if exists "chiunque legge i tempi" on public.tempi;
create policy "chiunque legge i tempi" on public.tempi
  for select to anon, authenticated using (true);

grant insert, select on public.tempi to anon, authenticated;

-- Miglior tempo di ogni nome (senza distinguere maiuscole e minuscole).
create or replace view public.classifica with (security_invoker = true) as
select distinct on (lower(btrim(nome))) btrim(nome) as nome, tempo, creato_il
from public.tempi
order by lower(btrim(nome)), tempo asc, creato_il asc;

grant select on public.classifica to anon, authenticated;
