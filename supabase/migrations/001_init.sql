-- Larven Enterprises BMS : Supabase schema (run once in SQL Editor)
-- DESIGN: every app collection S.<name> is one table: id (text, same ids as the app: C1, B1001, P5 ...)
-- + data (jsonb = the exact object the app stores). So a new field in the app NEVER needs a SQL change
-- and field names can never mismatch. Dates/amounts stay inside data exactly as the app writes them.
-- NOTE: Cafe module is FROZEN and isolated client-side (no cafe tables in DB).

create table if not exists profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'employee' check (role in ('admin','owner','manager','employee')),
  employee_id text,
  active boolean not null default true,
  created_at timestamptz not null default now());

create or replace function my_role() returns text language sql stable security definer set search_path=public as
$$ select role from profiles where id=auth.uid() and active $$;

create or replace function role_rank(r text) returns int language sql immutable as $$
  select case r
    when 'admin' then 4
    when 'owner' then 3
    when 'manager' then 2
    when 'employee' then 1
    else 0
  end;
$$;

create or replace function is_staff() returns boolean language sql stable security definer set search_path=public as
$$ select coalesce(my_role() in ('owner','manager'), false) $$;

-- Hierarchy and account management guard
create or replace function check_profile_management() returns trigger language plpgsql security definer as $$
declare
  v_caller_role text;
  v_caller_rank int;
  v_target_rank int;
  v_active_owners int;
begin
  v_caller_role := my_role();
  if auth.uid() is null or auth.role() = 'service_role' then
    return coalesce(new, old);
  end if;

  v_caller_rank := role_rank(v_caller_role);

  -- 1. Guard against deleting or deactivating the last active owner
  if (tg_op = 'DELETE' and old.role = 'owner') or 
     (tg_op = 'UPDATE' and old.role = 'owner' and (new.active = false or new.role <> 'owner')) then
    select count(*) into v_active_owners from profiles where role = 'owner' and active = true and id <> old.id;
    if v_active_owners < 1 then
      raise exception 'Cannot remove or deactivate the last active owner.';
    end if;
  end if;

  -- 2. Insertion hierarchy rules
  if tg_op = 'INSERT' then
    if v_caller_role = 'admin' then
      return new;
    elsif v_caller_role = 'owner' then
      if new.role not in ('manager', 'employee') then
        raise exception 'Owners can only create managers and employees.';
      end if;
      return new;
    elsif v_caller_role = 'manager' then
      if new.role <> 'employee' then
        raise exception 'Managers can only create employees.';
      end if;
      return new;
    else
      raise exception 'Employees cannot create user accounts.';
    end if;
  end if;

  -- 3. Update / Delete rules: nobody manages an account of equal or higher rank
  v_target_rank := role_rank(old.role);
  if v_caller_role <> 'admin' and v_caller_rank <= v_target_rank then
    raise exception 'Cannot modify or delete an account of equal or higher rank.';
  end if;

  if tg_op = 'UPDATE' and new.role <> old.role then
    if v_caller_role = 'owner' and new.role not in ('manager', 'employee') then
      raise exception 'Owners can only assign manager or employee roles.';
    elsif v_caller_role = 'manager' and new.role <> 'employee' then
      raise exception 'Managers can only assign employee roles.';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_profile_mgmt on profiles;
create trigger trg_profile_mgmt
  before insert or update or delete on profiles
  for each row execute function check_profile_management();

-- Price List table (for future use, unused by app)
create table if not exists price_list(
  id uuid primary key default gen_random_uuid(),
  product text not null,
  customer_id text,
  rate numeric not null check (rate >= 0),
  effective_from date not null default current_date,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null
);

-- whole-app snapshot (same JSON as localStorage minus collections below)
create table if not exists app_state(
  id text primary key default 'main',
  data jsonb not null default '{}',
  updated_at timestamptz not null default now());
insert into app_state(id) values('main') on conflict do nothing;

create or replace function touch() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;

create table if not exists customers(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on customers; create trigger t_touch before update on customers for each row execute function touch();
create index if not exists customers_data_gin on customers using gin (data jsonb_path_ops);

create table if not exists bills(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on bills; create trigger t_touch before update on bills for each row execute function touch();
create index if not exists bills_data_gin on bills using gin (data jsonb_path_ops);

create table if not exists payments(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on payments; create trigger t_touch before update on payments for each row execute function touch();
create index if not exists payments_data_gin on payments using gin (data jsonb_path_ops);

create table if not exists stock(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on stock; create trigger t_touch before update on stock for each row execute function touch();
create index if not exists stock_data_gin on stock using gin (data jsonb_path_ops);

create table if not exists expenses(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on expenses; create trigger t_touch before update on expenses for each row execute function touch();
create index if not exists expenses_data_gin on expenses using gin (data jsonb_path_ops);

create table if not exists employees(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on employees; create trigger t_touch before update on employees for each row execute function touch();
create index if not exists employees_data_gin on employees using gin (data jsonb_path_ops);

create table if not exists attendance(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on attendance; create trigger t_touch before update on attendance for each row execute function touch();
create index if not exists attendance_data_gin on attendance using gin (data jsonb_path_ops);

create table if not exists advances(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on advances; create trigger t_touch before update on advances for each row execute function touch();
create index if not exists advances_data_gin on advances using gin (data jsonb_path_ops);

create table if not exists fg(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on fg; create trigger t_touch before update on fg for each row execute function touch();
create index if not exists fg_data_gin on fg using gin (data jsonb_path_ops);

create table if not exists visits(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on visits; create trigger t_touch before update on visits for each row execute function touch();
create index if not exists visits_data_gin on visits using gin (data jsonb_path_ops);

create table if not exists contacts(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on contacts; create trigger t_touch before update on contacts for each row execute function touch();
create index if not exists contacts_data_gin on contacts using gin (data jsonb_path_ops);

create table if not exists vehicles(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on vehicles; create trigger t_touch before update on vehicles for each row execute function touch();
create index if not exists vehicles_data_gin on vehicles using gin (data jsonb_path_ops);

create table if not exists vehicle_trips(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on vehicle_trips; create trigger t_touch before update on vehicle_trips for each row execute function touch();
create index if not exists vehicle_trips_data_gin on vehicle_trips using gin (data jsonb_path_ops);

create table if not exists payslips(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on payslips; create trigger t_touch before update on payslips for each row execute function touch();
create index if not exists payslips_data_gin on payslips using gin (data jsonb_path_ops);

create table if not exists applications(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on applications; create trigger t_touch before update on applications for each row execute function touch();
create index if not exists applications_data_gin on applications using gin (data jsonb_path_ops);

create table if not exists invites(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on invites; create trigger t_touch before update on invites for each row execute function touch();
create index if not exists invites_data_gin on invites using gin (data jsonb_path_ops);

create table if not exists deleted_bills(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on deleted_bills; create trigger t_touch before update on deleted_bills for each row execute function touch();
create index if not exists deleted_bills_data_gin on deleted_bills using gin (data jsonb_path_ops);

create table if not exists cancelled_bills(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on cancelled_bills; create trigger t_touch before update on cancelled_bills for each row execute function touch();
create index if not exists cancelled_bills_data_gin on cancelled_bills using gin (data jsonb_path_ops);

create table if not exists att_sites(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on att_sites; create trigger t_touch before update on att_sites for each row execute function touch();
create index if not exists att_sites_data_gin on att_sites using gin (data jsonb_path_ops);

-- ============ SECURITY (RLS) ============
alter table customers enable row level security;
alter table bills enable row level security;
alter table payments enable row level security;
alter table stock enable row level security;
alter table expenses enable row level security;
alter table employees enable row level security;
alter table attendance enable row level security;
alter table advances enable row level security;
alter table fg enable row level security;
alter table visits enable row level security;
alter table contacts enable row level security;
alter table vehicles enable row level security;
alter table vehicle_trips enable row level security;
alter table payslips enable row level security;
alter table applications enable row level security;
alter table invites enable row level security;
alter table deleted_bills enable row level security;
alter table cancelled_bills enable row level security;
alter table att_sites enable row level security;
alter table app_state enable row level security;
alter table price_list enable row level security;
alter table profiles enable row level security;

-- Staff (Owner & Manager) operational permissions
do $$ declare t text; begin foreach t in array array['customers','bills','payments','stock','expenses','employees','attendance','advances','fg','visits','contacts','vehicles','vehicle_trips','payslips','applications','invites','deleted_bills','cancelled_bills','att_sites','app_state','price_list'] loop
 execute format('drop policy if exists staff_all on %I',t);
 execute format('create policy staff_all on %I for all using (is_staff()) with check (is_staff())',t);
end loop; end $$;

-- Admin: read-only support access to business operational data (no identity/payroll, no money/stock edits, fully audited)
do $$ declare t text; begin foreach t in array array['customers','bills','payments','stock','expenses','attendance','fg','visits','contacts','vehicles','vehicle_trips','deleted_bills','cancelled_bills','att_sites','app_state','price_list'] loop
 execute format('drop policy if exists admin_ro on %I',t);
 execute format('create policy admin_ro on %I for select using (my_role() = ''admin'')',t);
end loop; end $$;

-- Employee login permissions (working tables only, no delete, no payroll data of others)
drop policy if exists emp_sel on customers; create policy emp_sel on customers for select using (my_role()='employee');
drop policy if exists emp_ins on customers; create policy emp_ins on customers for insert with check (my_role()='employee');
drop policy if exists emp_sel on bills; create policy emp_sel on bills for select using (my_role()='employee');
drop policy if exists emp_ins on bills; create policy emp_ins on bills for insert with check (my_role()='employee');
drop policy if exists emp_sel on payments; create policy emp_sel on payments for select using (my_role()='employee');
drop policy if exists emp_ins on payments; create policy emp_ins on payments for insert with check (my_role()='employee');
drop policy if exists emp_sel on fg; create policy emp_sel on fg for select using (my_role()='employee');
drop policy if exists emp_ins on fg; create policy emp_ins on fg for insert with check (my_role()='employee');
drop policy if exists emp_sel on vehicle_trips; create policy emp_sel on vehicle_trips for select using (my_role()='employee');
drop policy if exists emp_ins on vehicle_trips; create policy emp_ins on vehicle_trips for insert with check (my_role()='employee');
drop policy if exists emp_sel on visits; create policy emp_sel on visits for select using (my_role()='employee');
drop policy if exists emp_ins on visits; create policy emp_ins on visits for insert with check (my_role()='employee');
drop policy if exists emp_sel on stock; create policy emp_sel on stock for select using (my_role()='employee');
drop policy if exists emp_ins on stock; create policy emp_ins on stock for insert with check (my_role()='employee');
drop policy if exists emp_upd on vehicle_trips; create policy emp_upd on vehicle_trips for update using (my_role()='employee') with check (my_role()='employee');
drop policy if exists emp_sel on employees; create policy emp_sel on employees for select using (my_role()='employee' and (id=(select employee_id from profiles where id=auth.uid()) or data->>'emp'=(select employee_id from profiles where id=auth.uid())));
drop policy if exists emp_sel on vehicles; create policy emp_sel on vehicles for select using (my_role()='employee');
drop policy if exists emp_sel on attendance; create policy emp_sel on attendance for select using (my_role()='employee' and (id=(select employee_id from profiles where id=auth.uid()) or data->>'emp'=(select employee_id from profiles where id=auth.uid())));

-- Profiles RLS
drop policy if exists prof_self on profiles; create policy prof_self on profiles for select using (id=auth.uid());
drop policy if exists prof_admin on profiles; create policy prof_admin on profiles for all using (my_role()='admin') with check (my_role()='admin');
drop policy if exists prof_owner on profiles; create policy prof_owner on profiles for all using (my_role()='owner') with check (my_role()='owner');
drop policy if exists prof_manager on profiles; create policy prof_manager on profiles for all using (my_role()='manager') with check (my_role()='manager');
