-- Zusätzliche Leistungen pro Angebot (z. B. Marketing Plan) mit Fixpreis
create table if not exists public.offer_addons (
  id uuid primary key default uuid_generate_v4(),
  offer_id uuid not null references public.offers on delete cascade,
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  title text not null,
  description text default '',
  price numeric not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_offer_addons_offer_id on public.offer_addons(offer_id);
create index if not exists idx_offer_addons_user_id on public.offer_addons(user_id);

alter table public.offer_addons enable row level security;

create policy "Users can view own offer addons"
  on public.offer_addons for select using (auth.uid() = user_id);
create policy "Users can insert own offer addons"
  on public.offer_addons for insert with check (auth.uid() = user_id);
create policy "Users can update own offer addons"
  on public.offer_addons for update using (auth.uid() = user_id);
create policy "Users can delete own offer addons"
  on public.offer_addons for delete using (auth.uid() = user_id);
