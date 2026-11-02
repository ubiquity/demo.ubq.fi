-- Provider IDs, not access tokens, are the durable keys for event attribution.
create table public.user_identities (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('github', 'google', 'telegram')),
  provider_id text not null check (length(provider_id) > 0),
  identity_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider),
  unique (provider, provider_id)
);

alter table public.user_identities enable row level security;
revoke all on public.user_identities from public, anon, authenticated;
grant select on public.user_identities to authenticated;
grant all on public.user_identities to service_role;
create policy "Users can read their linked identities"
  on public.user_identities for select to authenticated
  using ((select auth.uid()) = user_id);

-- Only trusted auth records and the Telegram Edge Function may write links.
create function public.sync_auth_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'DELETE' then
    delete from public.user_identities
      where user_id = old.user_id and provider = old.provider and old.provider in ('github', 'google');
    return old;
  end if;

  if new.provider in ('github', 'google') then
    insert into public.user_identities (user_id, provider, provider_id, identity_data)
    values (new.user_id, new.provider, new.identity_data->>'sub', new.identity_data)
    on conflict (user_id, provider) do update set
      provider_id = excluded.provider_id,
      identity_data = excluded.identity_data,
      updated_at = now();
  end if;
  return new;
end;
$$;
revoke all on function public.sync_auth_identity() from public, anon, authenticated;

create trigger sync_user_identity
  after insert or update or delete on auth.identities
  for each row execute function public.sync_auth_identity();

-- Include GitHub users who authenticated before this migration was deployed.
insert into public.user_identities (user_id, provider, provider_id, identity_data)
select user_id, provider, identity_data->>'sub', identity_data
from auth.identities where provider in ('github', 'google');
