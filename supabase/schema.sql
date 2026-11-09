-- Texas Chicken SPA: esquema y controles de seguridad para Supabase.
-- Ejecutar completo en Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  name text not null,
  description text not null default '',
  category text not null,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  available boolean not null default true
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  total numeric(10,2) not null default 0 check (total >= 0),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'preparando', 'listo', 'entregado', 'cancelado')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  quantity integer not null check (quantity between 1 and 50),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  subtotal numeric(10,2) not null check (subtotal >= 0)
);

-- El personal se incorpora manualmente desde SQL Editor por quien administra el proyecto.
-- No se concede acceso de escritura a esta tabla desde el navegador.
create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Catálogo inicial: IDs estables que usa el carrito para enviar solo producto y cantidad.
insert into public.products (id, name, description, category, price, image_url, available) values
('ranchera', 'Ranchera', 'Carne, queso gouda, tocino, lechuga, tomate y salsas.', 'hamburguesas', 36, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJfOobstlmMihsRY1mmcUOT9UCZikkdzXjgtbFM_daBw&s=10', true),
('americana', 'Americana', 'Carne, queso cheddar, pepinillos, pequeños trozos de cebolla y salsas.', 'hamburguesas', 36, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSxwjvO4a9uxP9EHpuk-9TH6_nl2pdKfn7OMJWZqytHBctm_vbiAndtBul7&s=10', true),
('texas', 'Texas', 'Carne, cebolla caramelizada, queso cheddar, salsa BBQ y tocino.', 'hamburguesas', 36, 'https://storage.googleapis.com/patsy-ecommerce.appspot.com/small_barbacoa_1dd535b778', true),
('bucket-texas-8', 'Bucket Texas (8 Piezas)', '8 piezas de pollo frito crujiente acompañado de papas fritas familiares.', 'pollos', 75, 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=500&q=80', true),
('salchipapa', 'Salchipapa', 'Deliciosa salchicha acompañada de papas fritas, ketchup, mayonesa y mostaza.', 'pollos', 34, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSKaubpumDCw6RM7imkqE8ST6iXmXbQH5s5_dO51wvGwg&s=10', true),
('salchipollo', 'Salchipollo', 'Deliciosa salchicha acompañada de pedazos de pollo crujiente, papas fritas, ketchup, mayonesa y mostaza.', 'pollos', 44, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4QiDlW1ZSEZryDMz2bdSgGL8U4UUd7D0TjwbYWki_KyZGoaapgZQIqX4&s=10', true),
('alitas-5', 'Alitas (5 Piezas)', '5 piezas de alitas de pollo crujiente acompañadas de salsa de su elección.', 'alitas', 39, 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=500&q=80', true),
('alitas-12', 'Alitas (12 Piezas)', '12 piezas de alitas de pollo crujiente acompañadas de salsa de su elección.', 'alitas', 69, 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=500&q=80', true),
('alitas-24', 'Alitas (24 Piezas)', '24 piezas de alitas de pollo crujiente acompañadas de salsa de su elección.', 'alitas', 125, 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=500&q=80', true),
('papas-fritas', 'Papas Fritas', 'Papas fritas crujientes y sazonadas.', 'extras', 16, 'https://okdiario.com/img/2023/04/12/el-truco-definitivo-para-que-las-patatas-fritas-te-queden-mas-crujientes.jpg', true),
('aros-cebolla', 'Aros de cebolla', 'Aros de cebolla crujientes y sazonados.', 'extras', 14, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-uy2r8c5gU5P5jWZf3YOuYEWuOHnm7lvBKfSFcakFX-fD4UbXIn4fhEuB&s=10', true),
('tocino', 'Tocino', 'Tocino crujiente.', 'extras', 4, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0hMzz8TDewexiR-Fv3DFJWuXmyyw_lg9etW9PwmabIA&s=10', true),
('coca-cola-500', 'Coca-Cola 500 ml', 'Bebida gaseosa refrescante Coca-Cola de 500 ml.', 'bebidas', 8, 'https://fsa.bo/productos/08676-01.jpg', true),
('sundae-chocolate', 'Sundae de Chocolate', 'Postre delicioso con salsa de chocolate.', 'postres', 12, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSNZqdWAUZEch-iOnBgDsOQHikRfK-2DI1zD_PN5od9Q&s=10', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  price = excluded.price,
  image_url = excluded.image_url,
  available = excluded.available;

-- RLS: los clientes solo leen sus pedidos y las líneas de esos pedidos.
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.staff_members enable row level security;

drop policy if exists "Catalog is visible" on public.products;
create policy "Catalog is visible" on public.products
  for select to anon, authenticated using (available = true);

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff_members
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

drop policy if exists "Customers and staff read permitted orders" on public.orders;
create policy "Customers and staff read permitted orders" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());

drop policy if exists "Customers and staff read permitted order items" on public.order_items;
create policy "Customers and staff read permitted order items" on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = (select auth.uid()) or public.is_staff())
    )
  );

-- El cliente no recibe permisos de INSERT/DELETE ni de modificar campos administrativos.
revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;

revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;

revoke all on public.order_items from anon, authenticated;
grant select on public.order_items to authenticated;

revoke all on public.staff_members from anon, authenticated;

drop policy if exists "Only staff can update order status" on public.orders;
create policy "Only staff can update order status" on public.orders
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- La función recibe exclusivamente { "items": [{ "product_id": "...", "quantity": 1 }] }.
-- Cualquier campo extra, incluido total/status/user_id/precio/subtotal, provoca rechazo.
create or replace function public.create_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_product_id text;
  v_quantity integer;
  v_price numeric(10,2);
  v_subtotal numeric(10,2);
  v_total numeric(10,2) := 0;
  v_order_id uuid;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if jsonb_typeof(p_payload) <> 'object'
     or not (p_payload ? 'items')
     or exists (select 1 from jsonb_object_keys(p_payload) as k where k <> 'items') then
    raise exception 'INVALID_ORDER_FIELDS' using errcode = '22023';
  end if;

  if jsonb_typeof(p_payload->'items') <> 'array' then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;

  v_count := jsonb_array_length(p_payload->'items');
  if v_count < 1 or v_count > 20 then
    raise exception 'INVALID_ITEM_COUNT' using errcode = '22023';
  end if;

  -- Validar todos los artículos antes de insertar el pedido.
  for v_item in select value from jsonb_array_elements(p_payload->'items')
  loop
    if jsonb_typeof(v_item) <> 'object'
       or not (v_item ? 'product_id')
       or not (v_item ? 'quantity')
       or exists (select 1 from jsonb_object_keys(v_item) as k where k not in ('product_id', 'quantity'))
       or jsonb_typeof(v_item->'product_id') <> 'string'
       or jsonb_typeof(v_item->'quantity') <> 'number' then
      raise exception 'INVALID_ITEM_FIELDS' using errcode = '22023';
    end if;

    v_product_id := v_item->>'product_id';
    if (v_item->>'quantity') !~ '^[0-9]+$' then
      raise exception 'INVALID_QUANTITY' using errcode = '22023';
    end if;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 50 then
      raise exception 'INVALID_QUANTITY' using errcode = '22023';
    end if;

    select price into v_price
    from public.products
    where id = v_product_id and available = true;

    if not found then
      raise exception 'PRODUCT_NOT_AVAILABLE: %', v_product_id using errcode = '22023';
    end if;
  end loop;

  insert into public.orders (user_id, total, status)
  values (v_user_id, 0, 'pendiente')
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_payload->'items')
  loop
    v_product_id := v_item->>'product_id';
    v_quantity := (v_item->>'quantity')::integer;

    select price into v_price
    from public.products
    where id = v_product_id and available = true;

    v_subtotal := round(v_price * v_quantity, 2);
    v_total := v_total + v_subtotal;

    insert into public.order_items (order_id, product_id, quantity, unit_price, subtotal)
    values (v_order_id, v_product_id, v_quantity, v_price, v_subtotal);
  end loop;

  update public.orders set total = round(v_total, 2) where id = v_order_id;

  return jsonb_build_object(
    'id', v_order_id,
    'total', round(v_total, 2),
    'status', 'pendiente',
    'created_at', now()
  );
end;
$$;

revoke all on function public.create_order(jsonb) from public, anon;
grant execute on function public.create_order(jsonb) to authenticated;

-- Para autorizar personal, ejecutar como administrador después de crear la cuenta:
-- insert into public.staff_members (user_id) values ('UUID-DEL-USUARIO-DEL-PERSONAL');
