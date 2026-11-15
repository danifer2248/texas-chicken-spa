create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('staff', 'admin')),
  created_at timestamptz not null default now()
);
alter table private.user_roles enable row level security;
revoke all on table private.user_roles from public, anon, authenticated;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select r.role from private.user_roles as r where r.user_id = (select auth.uid())),
    'customer'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select r.role in ('staff', 'admin') from private.user_roles as r where r.user_id = (select auth.uid())),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select r.role = 'admin' from private.user_roles as r where r.user_id = (select auth.uid())),
    false
  );
$$;

revoke all on function public.current_app_role() from public, anon;
revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_admin() to authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) between 1 and 120),
  phone text check (phone is null or length(btrim(phone)) between 7 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) between 1 and 120),
  description text not null check (length(btrim(description)) between 1 and 1000),
  category text not null check (length(btrim(category)) between 1 and 60),
  price numeric(10, 2) not null check (price >= 0),
  image text not null check (length(btrim(image)) between 1 and 1000),
  alt text check (alt is null or length(alt) <= 300),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  client_id uuid not null references auth.users (id) on delete restrict,
  contact_name text not null check (length(btrim(contact_name)) between 1 and 120),
  contact_phone text not null check (length(btrim(contact_phone)) between 7 and 30),
  delivery_type text not null check (delivery_type in ('pickup', 'delivery')),
  address text,
  comment text check (comment is null or length(comment) <= 1000),
  total numeric(14, 2) not null default 0 check (total >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'delivered', 'cancelled')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_delivery_address_check check (
    (delivery_type = 'delivery' and address is not null and length(btrim(address)) between 1 and 300)
    or (delivery_type = 'pickup' and address is null)
  )
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_name text not null check (length(btrim(product_name)) between 1 and 120),
  quantity integer not null check (quantity between 1 and 99),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  subtotal numeric(14, 2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create index orders_client_created_at_idx on public.orders (client_id, created_at desc);
create index orders_status_created_at_idx on public.orders (status, created_at desc);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'Cliente')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, full_name)
select
  u.id,
  coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), 'Cliente')
from auth.users as u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy profiles_read_self_or_staff
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_staff()));
create policy profiles_update_self
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy products_read_active_or_staff
on public.products for select to anon, authenticated
using (is_active or (select public.is_staff()));
create policy products_insert_admin
on public.products for insert to authenticated
with check ((select public.is_admin()));
create policy products_update_admin
on public.products for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy orders_read_owner_or_staff
on public.orders for select to authenticated
using (client_id = (select auth.uid()) or (select public.is_staff()));

create policy order_items_read_visible_order
on public.order_items for select to authenticated
using (
  exists (
    select 1
    from public.orders as o
    where o.id = order_items.order_id
      and (o.client_id = (select auth.uid()) or (select public.is_staff()))
  )
);

revoke all on table public.profiles, public.products, public.orders, public.order_items from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone) on table public.profiles to authenticated;
grant select on table public.products to anon, authenticated;
grant insert (name, description, category, price, image, alt) on table public.products to authenticated;
grant update (name, description, category, price, image, alt, is_active) on table public.products to authenticated;
grant select on table public.orders, public.order_items to authenticated;

insert into public.products (name, description, category, price, image, alt)
values
  ('Ranchera', 'Carne, queso gouda, tocino, lechuga, tomate y salsas.', 'hamburguesas', 36, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJfOobstlmMihsRY1mmcUOT9UCZikkdzXjgtbFM_daBw&s=10', null),
  ('Americana', 'Carne, queso cheddar, pepinillos, pequeños trozos de cebolla y salsas.', 'hamburguesas', 36, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSxwjvO4a9uxP9EHpuk-9TH6_nl2pdKfn7OMJWZqytHBctm_vbiAndtBul7&s=10', null),
  ('Texas', 'Carne, cebolla caramelizada, queso cheddar, salsa BBQ y tocino.', 'hamburguesas', 36, 'https://storage.googleapis.com/patsy-ecommerce.appspot.com/small_barbacoa_1dd535b778', null),
  ('Bucket Texas (8 Piezas)', '8 piezas de pollo frito crujiente acompañado de papas fritas familiares.', 'pollos', 75, 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=500&q=80', null),
  ('Salchipapa', 'Deliciosa salchicha acompañada de papas fritas, ketchup, mayonesa y mostaza.', 'pollos', 34, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSKaubpumDCw6RM7imkqE8ST6iXmXbQH5s5_dO51wvGwg&s=10', null),
  ('Salchipollo', 'Deliciosa salchicha acompañada de pedazos de pollo crujiente, papas fritas, ketchup, mayonesa y mostaza.', 'pollos', 44, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4QiDlW1ZSEZryDMz2bdSgGL8U4UUd7D0TjwbYWki_KyZGoaapgZQIqX4&s=10', null),
  ('Alitas (5 Piezas)', '5 piezas de alitas de pollo crujiente acompañadas de salsa de su elección.', 'alitas', 39, 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=500&q=80', null),
  ('Alitas (12 Piezas)', '12 piezas de alitas de pollo crujiente acompañadas de salsa de su elección.', 'alitas', 69, 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=500&q=80', null),
  ('Alitas (24 Piezas)', '24 piezas de alitas de pollo crujiente acompañadas de salsa de su elección.', 'alitas', 125, 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=500&q=80', null),
  ('Papas Fritas', 'Papas fritas crujientes y sazonadas.', 'extras', 16, 'https://okdiario.com/img/2023/04/12/el-truco-definitivo-para-que-las-patatas-fritas-te-queden-mas-crujientes.jpg', null),
  ('Aros de cebolla', 'Aros de cebolla crujientes y sazonados.', 'extras', 14, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-uy2r8c5gU5P5jWZf3YOuYEWuOHnm7lvBKfSFcakFX-fD4UbXIn4fhEuB&s=10', null),
  ('Tocino', 'Tocino crujiente.', 'extras', 4, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0hMzz8TDewexiR-Fv3DFJWuXmyyw_lg9etW9PwmabIA&s=10', null),
  ('Coca-Cola 500 ml', 'Bebida gaseosa refrescante Coca-Cola de 500 ml.', 'bebidas', 8, 'https://fsa.bo/productos/08676-01.jpg', 'Botella de Coca-Cola Personal'),
  ('Sundae de Chocolate', 'Postre delicioso con salsa de chocolate.', 'postres', 12, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSNZqdWAUZEch-iOnBgDsOQHikRfK-2DI1zD_PN5od9Q&s=10', null)
on conflict (name) do nothing;

create or replace function public.create_order(
  p_items jsonb,
  p_contact_name text,
  p_contact_phone text,
  p_delivery_type text,
  p_address text default null,
  p_comment text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_order public.orders;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_product public.products;
  v_total numeric(14, 2);
  v_item_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Debes iniciar sesión para realizar un pedido.';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'El carrito no es válido.';
  end if;
  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 50 then
    raise exception using errcode = '22023', message = 'El pedido debe incluir entre 1 y 50 productos.';
  end if;
  if p_contact_name is null or length(btrim(p_contact_name)) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'Revisa el nombre de contacto.';
  end if;
  if p_contact_phone is null or length(btrim(p_contact_phone)) not between 7 and 30
     or p_contact_phone !~ '^[0-9+ ()-]{7,30}$'
     or length(regexp_replace(coalesce(p_contact_phone, ''), '[^0-9]', '', 'g')) < 7 then
    raise exception using errcode = '22023', message = 'Revisa el teléfono de contacto.';
  end if;
  if p_delivery_type is null or p_delivery_type not in ('pickup', 'delivery') then
    raise exception using errcode = '22023', message = 'El tipo de entrega no es válido.';
  end if;
  if (p_delivery_type = 'delivery' and (p_address is null or length(btrim(p_address)) not between 1 and 300))
     or (p_delivery_type = 'pickup' and p_address is not null) then
    raise exception using errcode = '22023', message = 'Revisa la dirección de entrega.';
  end if;
  if p_comment is not null and length(p_comment) > 1000 then
    raise exception using errcode = '22023', message = 'El comentario es demasiado largo.';
  end if;

  insert into public.orders (client_id, contact_name, contact_phone, delivery_type, address, comment)
  values (v_user_id, btrim(p_contact_name), btrim(p_contact_phone), p_delivery_type, nullif(btrim(p_address), ''), nullif(btrim(p_comment), ''))
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items) as e(value) loop
    if jsonb_typeof(v_item) is distinct from 'object' then
      raise exception using errcode = '22023', message = 'Un producto del carrito no es válido.';
    end if;
    if not (v_item ? 'product_id')
       or not (v_item ? 'quantity')
       or (select count(*) from jsonb_object_keys(v_item)) <> 2 then
      raise exception using errcode = '22023', message = 'Un producto del carrito no es válido.';
    end if;
    begin
      v_product_id := (v_item ->> 'product_id')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception using errcode = '22023', message = 'El producto o la cantidad no son válidos.';
    end;
    if v_quantity is null or v_quantity not between 1 and 99 then
      raise exception using errcode = '22023', message = 'Cada cantidad debe estar entre 1 y 99.';
    end if;
    if exists (
      select 1 from public.order_items as oi
      where oi.order_id = v_order.id and oi.product_id = v_product_id
    ) then
      raise exception using errcode = '22023', message = 'El carrito contiene un producto duplicado.';
    end if;

    select * into v_product
    from public.products as p
    where p.id = v_product_id and p.is_active
    for share;
    if not found then
      raise exception using errcode = '22023', message = 'Un producto ya no está disponible.';
    end if;

    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
    values (v_order.id, v_product.id, v_product.name, v_quantity, v_product.price);
  end loop;

  select coalesce(sum(oi.subtotal), 0)::numeric(14, 2) into v_total
  from public.order_items as oi
  where oi.order_id = v_order.id;
  update public.orders set total = v_total where id = v_order.id returning * into v_order;
  return v_order;
end;
$$;

create or replace function public.cancel_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_order public.orders;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Debes iniciar sesión.';
  end if;
  update public.orders as o
  set status = 'cancelled', is_active = false
  where o.id = p_order_id and o.client_id = v_user_id and o.status = 'pending'
  returning o.* into v_order;
  if not found then
    raise exception using errcode = 'P0002', message = 'El pedido no existe o ya no se puede cancelar.';
  end if;
  return v_order;
end;
$$;

create or replace function public.change_order_status(p_order_id uuid, p_status text)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_allowed boolean := false;
begin
  if not (select public.is_staff()) then
    raise exception using errcode = '42501', message = 'No tienes permiso para cambiar el estado del pedido.';
  end if;
  select * into v_order from public.orders as o where o.id = p_order_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'No se encontró el pedido.';
  end if;

  v_allowed := coalesce(case v_order.status
    when 'pending' then p_status in ('confirmed', 'cancelled')
    when 'confirmed' then p_status in ('preparing', 'cancelled')
    when 'preparing' then p_status in ('delivered', 'cancelled')
    else false
  end, false);
  if not v_allowed then
    raise exception using errcode = '22023', message = 'Ese cambio de estado no está permitido.';
  end if;

  update public.orders as o
  set status = p_status, is_active = (p_status <> 'cancelled')
  where o.id = p_order_id
  returning o.* into v_order;
  return v_order;
end;
$$;

revoke all on function public.create_order(jsonb, text, text, text, text, text) from public, anon;
revoke all on function public.cancel_order(uuid) from public, anon;
revoke all on function public.change_order_status(uuid, text) from public, anon;
grant execute on function public.create_order(jsonb, text, text, text, text, text) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;
grant execute on function public.change_order_status(uuid, text) to authenticated;
