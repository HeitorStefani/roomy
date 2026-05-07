create extension if not exists pgcrypto;

create table if not exists houses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  house_id uuid references houses(id) on delete set null,
  ra text not null unique,
  email text unique,
  password_hash text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  name text not null,
  avatar_color text default 'bg-zinc-500',
  avatar_url text,
  email_notificacao text,
  pix_key text,
  telegram_chat_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  title text not null,
  room text not null default 'Geral',
  assigned_to uuid references users(id) on delete set null,
  status text not null default 'todo',
  priority text not null default 'media',
  recurrence text not null default 'unica',
  start_date date,
  due_date date,
  overdue boolean not null default false,
  rotation_members uuid[],
  week_days integer[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists task_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete set null,
  done_by uuid references users(id) on delete set null,
  done_at timestamptz not null default now()
);

create table if not exists house_bills (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  title text not null,
  total numeric(12,2) not null,
  due_date date not null,
  paid_by uuid references users(id) on delete set null,
  notified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bill_participants (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references house_bills(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  amount numeric(12,2) not null,
  paid boolean not null default false,
  comprovante_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bill_id, user_id)
);

create table if not exists bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references house_bills(id) on delete cascade,
  descricao text not null,
  quantidade numeric(12,3),
  unidade text,
  valor_unit numeric(12,2),
  valor_total numeric(12,2)
);

create table if not exists personal_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  description text not null,
  category text not null,
  amount numeric(12,2) not null,
  type text not null check (type in ('expense', 'income')),
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  icon_name text not null,
  color text not null,
  limit_amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists stock_items (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  owner_id uuid references users(id) on delete cascade,
  name text not null,
  category text not null,
  quantity integer not null default 0,
  min_quantity integer not null default 1,
  unit text not null default 'un',
  in_shopping_list boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_house on users(house_id);
create index if not exists idx_users_telegram on users(telegram_chat_id);
create index if not exists idx_tasks_house_assigned on tasks(house_id, assigned_to);
create index if not exists idx_bills_house_due on house_bills(house_id, due_date);
create index if not exists idx_stock_house_owner on stock_items(house_id, owner_id);

insert into houses (name, invite_code)
values ('Republica Roomy', 'ROOMY2026')
on conflict (invite_code) do nothing;
