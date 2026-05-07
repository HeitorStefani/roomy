alter table users
  add column if not exists role text not null default 'member';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_role_check'
  ) then
    alter table users
      add constraint users_role_check check (role in ('admin', 'member'));
  end if;
end $$;
