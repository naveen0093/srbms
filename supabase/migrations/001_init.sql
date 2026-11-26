-- Larven Enterprises BMS : Supabase schema (run once in SQL Editor)
-- DESIGN: every app collection S.<name> is one table: id (text, same ids as the app: C1, B1001, P5 ...)
-- + data (jsonb = the exact object the app stores). So a new field in the app NEVER needs a SQL change
-- and field names can never mismatch. Dates/amounts stay inside data exactly as the app writes them.

create table if not exists profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'employee' check (role in ('owner','accountant','employee')),
  employee_id text,
  active boolean not null default true,
  created_at timestamptz not null default now());

create or replace function my_role() returns text language sql stable security definer set search_path=public as
$$ select role from profiles where id=auth.uid() and active $$;
create or replace function is_staff() returns boolean language sql stable security definer set search_path=public as
$$ select coalesce(my_role() in ('owner','accountant'),false) $$;

-- whole-app snapshot (same JSON as localStorage 'aquaflow-bms-v1' minus the collections below) : settings, billDeletePin, etc.
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

create table if not exists cafe_sales(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on cafe_sales; create trigger t_touch before update on cafe_sales for each row execute function touch();
create index if not exists cafe_sales_data_gin on cafe_sales using gin (data jsonb_path_ops);

create table if not exists cafe_purchases(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on cafe_purchases; create trigger t_touch before update on cafe_purchases for each row execute function touch();
create index if not exists cafe_purchases_data_gin on cafe_purchases using gin (data jsonb_path_ops);

create table if not exists cafe_stock_moves(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on cafe_stock_moves; create trigger t_touch before update on cafe_stock_moves for each row execute function touch();
create index if not exists cafe_stock_moves_data_gin on cafe_stock_moves using gin (data jsonb_path_ops);

create table if not exists cafe_expenses(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on cafe_expenses; create trigger t_touch before update on cafe_expenses for each row execute function touch();
create index if not exists cafe_expenses_data_gin on cafe_expenses using gin (data jsonb_path_ops);

create table if not exists cafe_employees(
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  updated_at timestamptz not null default now());
drop trigger if exists t_touch on cafe_employees; create trigger t_touch before update on cafe_employees for each row execute function touch();
create index if not exists cafe_employees_data_gin on cafe_employees using gin (data jsonb_path_ops);

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
alter table cafe_sales enable row level security;
alter table cafe_purchases enable row level security;
alter table cafe_stock_moves enable row level security;
alter table cafe_expenses enable row level security;
alter table cafe_employees enable row level security;
alter table payslips enable row level security;
alter table applications enable row level security;
alter table invites enable row level security;
alter table deleted_bills enable row level security;
alter table cancelled_bills enable row level security;
alter table att_sites enable row level security;
alter table app_state enable row level security;
alter table profiles enable row level security;

do $$ declare t text; begin foreach t in array array['customers','bills','payments','stock','expenses','employees','attendance','advances','fg','visits','contacts','vehicles','vehicle_trips','cafe_sales','cafe_purchases','cafe_stock_moves','cafe_expenses','cafe_employees','payslips','applications','invites','deleted_bills','cancelled_bills','att_sites','app_state'] loop
 execute format('drop policy if exists staff_all on %I',t);
 execute format('create policy staff_all on %I for all using (is_staff()) with check (is_staff())',t);
end loop; end $$;

-- Employee login: may read/add on the working tables only (no delete, no settings, no salary data of others)
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
drop policy if exists emp_sel on employees; create policy emp_sel on employees for select using (my_role()='employee' and (id=(select employee_id from profiles where id=auth.uid()) or data->>'emp'=(select employee_id from profiles where id=auth.uid()) or 'employees'='vehicles'));
drop policy if exists emp_sel on vehicles; create policy emp_sel on vehicles for select using (my_role()='employee' and (id=(select employee_id from profiles where id=auth.uid()) or data->>'emp'=(select employee_id from profiles where id=auth.uid()) or 'vehicles'='vehicles'));
drop policy if exists emp_sel on attendance; create policy emp_sel on attendance for select using (my_role()='employee' and (id=(select employee_id from profiles where id=auth.uid()) or data->>'emp'=(select employee_id from profiles where id=auth.uid()) or 'attendance'='vehicles'));

drop policy if exists prof_self on profiles; create policy prof_self on profiles for select using (id=auth.uid());
drop policy if exists prof_owner on profiles; create policy prof_owner on profiles for all using (my_role()='owner') with check (my_role()='owner');
