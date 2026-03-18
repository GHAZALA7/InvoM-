-- ============================================================
-- CELLARIS INVENTORY MANAGEMENT - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- OWNERSHIP TYPES (General, Cellaris, future brands)
-- ============================================================
create table ownership_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz default now()
);

insert into ownership_types (name) values ('General'), ('Cellaris');

-- ============================================================
-- STORES
-- ============================================================
create table stores (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'employee' check (role in ('super_admin', 'manager', 'employee')),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz default now()
);

-- ============================================================
-- PRODUCTS (global catalog)
-- ============================================================
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category_id uuid references categories(id) on delete set null,
  ownership_type_id uuid references ownership_types(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- STORE PRODUCTS (per-store inventory, unique QR per store-product)
-- ============================================================
create table store_products (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  qr_code text not null,
  sku text not null unique,
  low_stock_threshold integer not null default 5,
  created_at timestamptz default now(),
  unique(store_id, product_id)
);

-- ============================================================
-- TRANSACTIONS (audit log of all inventory changes)
-- ============================================================
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  store_product_id uuid not null references store_products(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  action text not null check (action in ('sale', 'restock', 'correction')),
  quantity_changed integer not null,
  quantity_before integer not null,
  quantity_after integer not null,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table stores enable row level security;
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table store_products enable row level security;
alter table transactions enable row level security;
alter table ownership_types enable row level security;

-- Helper: get current user's role
create or replace function get_my_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Helper: is current user active?
create or replace function is_active_user()
returns boolean as $$
  select is_active from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Ownership types: readable by all authenticated active users
create policy "ownership_types_read" on ownership_types
  for select using (auth.uid() is not null and is_active_user());

-- Stores: readable by all active users; writable by super_admin
create policy "stores_read" on stores
  for select using (auth.uid() is not null and is_active_user());

create policy "stores_insert" on stores
  for insert with check (get_my_role() = 'super_admin');

create policy "stores_update" on stores
  for update using (get_my_role() = 'super_admin');

-- Profiles: users see their own; super_admin sees all
create policy "profiles_read_own" on profiles
  for select using (auth.uid() = id or get_my_role() = 'super_admin');

create policy "profiles_insert" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id or get_my_role() = 'super_admin');

-- Categories: all active users can read and create
create policy "categories_read" on categories
  for select using (auth.uid() is not null and is_active_user());

create policy "categories_insert" on categories
  for insert with check (auth.uid() is not null and is_active_user());

-- Products: all active users can read and create
create policy "products_read" on products
  for select using (auth.uid() is not null and is_active_user());

create policy "products_insert" on products
  for insert with check (auth.uid() is not null and is_active_user());

create policy "products_update" on products
  for update using (auth.uid() is not null and is_active_user());

-- Store products: all active users can read and write
create policy "store_products_read" on store_products
  for select using (auth.uid() is not null and is_active_user());

create policy "store_products_insert" on store_products
  for insert with check (auth.uid() is not null and is_active_user());

create policy "store_products_update" on store_products
  for update using (auth.uid() is not null and is_active_user());

-- Transactions: all active users can read and insert; no deletes
create policy "transactions_read" on transactions
  for select using (auth.uid() is not null and is_active_user());

create policy "transactions_insert" on transactions
  for insert with check (auth.uid() is not null and is_active_user());

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index idx_store_products_store_id on store_products(store_id);
create index idx_store_products_product_id on store_products(product_id);
create index idx_transactions_store_id on transactions(store_id);
create index idx_transactions_store_product_id on transactions(store_product_id);
create index idx_transactions_user_id on transactions(user_id);
create index idx_transactions_created_at on transactions(created_at desc);
create index idx_products_category_id on products(category_id);
