-- 0022: anunciantes da Awin com parceria aceita, sincronizados pela API (Programmes), para
-- reconhecer o domínio de uma URL colada e saber se o deep link é permitido.

create table public.ofe_awin_anunciantes (
  id uuid primary key default gen_random_uuid(),
  advertiser_id integer not null unique check (advertiser_id > 0),
  nome text not null check (char_length(nome) between 1 and 160),
  dominios text[] not null default '{}',
  deeplink_permitido boolean not null default true,
  sincronizado_em timestamptz not null default now()
);
create index ofe_awin_anunciantes_dominios on public.ofe_awin_anunciantes using gin (dominios);
alter table public.ofe_awin_anunciantes enable row level security;
create policy ofe_awin_ler on public.ofe_awin_anunciantes for select to authenticated using (app.usuario_ativo());
create policy ofe_awin_escrever on public.ofe_awin_anunciantes for all to authenticated
  using (app.pode_escrever()) with check (app.pode_escrever());
grant select on public.ofe_awin_anunciantes to ofe_worker;
create policy ofe_awin_worker on public.ofe_awin_anunciantes for select to ofe_worker using (true);
