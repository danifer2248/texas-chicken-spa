-- Consulta de solo lectura para contrastar el modelo remoto.
-- Ejecutar desde la raíz: npx supabase db query --remote --read-only --yes --file .docs/supabase-integration/verify-order-model.sql
SELECT jsonb_build_object(
  'orders_columns', (
    SELECT jsonb_agg(jsonb_build_object(
      'column', column_name,
      'type', data_type,
      'nullable', is_nullable,
      'default', column_default,
      'precision', numeric_precision,
      'scale', numeric_scale,
      'identity', is_identity,
      'identity_generation', identity_generation
    ) ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name IN ('id', 'client_id', 'order_number', 'status', 'total')
  ),
  'order_items_columns', (
    SELECT jsonb_agg(jsonb_build_object(
      'column', column_name,
      'type', data_type,
      'nullable', is_nullable,
      'default', column_default,
      'precision', numeric_precision,
      'scale', numeric_scale,
      'generated', is_generated,
      'generation_expression', generation_expression
    ) ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
      AND column_name IN ('order_id', 'product_id', 'product_name', 'quantity', 'unit_price', 'subtotal')
  ),
  'foreign_keys', (
    SELECT jsonb_agg(pg_get_constraintdef(oid) ORDER BY conrelid::regclass::text, conname)
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid IN ('public.profiles'::regclass, 'public.orders'::regclass, 'public.order_items'::regclass)
  ),
  'check_constraints', (
    SELECT jsonb_agg(pg_get_constraintdef(oid) ORDER BY conrelid::regclass::text, conname)
    FROM pg_constraint
    WHERE contype = 'c'
      AND conrelid IN ('public.orders'::regclass, 'public.order_items'::regclass)
  ),
  'create_order_rpc', (
    SELECT jsonb_build_object(
      'arguments', pg_get_function_arguments(p.oid),
      'security_definer', p.prosecdef,
      'result', pg_get_function_result(p.oid),
      'uses_catalog_price', position('v_product.price' in p.prosrc) > 0,
      'stores_unit_price_snapshot', position('unit_price' in p.prosrc) > 0,
      'calculates_total_from_subtotals', position('sum(oi.subtotal)' in p.prosrc) > 0,
      'locks_catalog_row', position('for share' in lower(p.prosrc)) > 0,
      'rejects_extra_client_line_fields', position('jsonb_object_keys' in p.prosrc) > 0,
      'execute_granted_to_authenticated', has_function_privilege('authenticated', p.oid, 'execute')
    )
    FROM pg_proc AS p
    WHERE p.oid = to_regprocedure('public.create_order(jsonb,text,text,text,text,text)')
  ),
  'change_order_status_rpc', (
    SELECT jsonb_build_object(
      'security_definer', p.prosecdef,
      'requires_staff', position('public.is_staff()' in p.prosrc) > 0,
      'execute_granted_to_authenticated', has_function_privilege('authenticated', p.oid, 'execute')
    )
    FROM pg_proc AS p
    WHERE p.oid = to_regprocedure('public.change_order_status(uuid,text)')
  ),
  'authenticated_order_table_privileges', jsonb_build_object(
    'select', has_table_privilege('authenticated', 'public.orders', 'select'),
    'insert', has_table_privilege('authenticated', 'public.orders', 'insert'),
    'update', has_table_privilege('authenticated', 'public.orders', 'update'),
    'delete', has_table_privilege('authenticated', 'public.orders', 'delete')
  ),
  'rls', (
    SELECT jsonb_agg(jsonb_build_object('table', c.relname, 'enabled', c.relrowsecurity) ORDER BY c.relname)
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN ('profiles', 'products', 'orders', 'order_items')
  )
) AS validation;
