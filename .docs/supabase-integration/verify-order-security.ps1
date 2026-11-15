$ErrorActionPreference = 'Continue'
$PSNativeCommandUseErrorActionPreference = $false

$projectRef = 'wueuktufolitrkwpjlex'
$projectUrl = "https://$projectRef.supabase.co"
$restUrl = "$projectUrl/rest/v1"
$authUrl = "$projectUrl/auth/v1"
$runId = [guid]::NewGuid().ToString('N')
$testEmail = "codex-model-$runId@example.com"
$testPassword = "Tc-Verify-$runId!"
$testUserId = $null
$serviceKey = $null
$checks = [ordered]@{}
$cleanupConfirmed = $false
$runError = ''
$cleanupError = ''
$cleanupFile = Join-Path (Get-Location) '.docs\supabase-integration\.verify-order-security-cleanup.sql'
$cleanupCheckFile = Join-Path (Get-Location) '.docs\supabase-integration\.verify-order-security-check.sql'

function Invoke-SupabaseRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [Parameter(Mandatory = $true)][hashtable]$Headers,
    [object]$Body
  )

  $request = @{
    Method = $Method
    Uri = $Uri
    Headers = $Headers
    TimeoutSec = 30
    ErrorAction = 'Stop'
  }
  if ($PSBoundParameters.ContainsKey('Body') -and $null -ne $Body) {
    $request.ContentType = 'application/json'
    $request.Body = ConvertTo-Json -InputObject $Body -Depth 20 -Compress
  }

  try {
    $data = Invoke-RestMethod @request
    return [pscustomobject]@{ Ok = $true; Status = 200; Data = $data; Error = '' }
  }
  catch {
    $status = 0
    $message = $_.ErrorDetails.Message
    if (-not $message) { $message = $_.Exception.Message }
    if ($_.Exception.Response) {
      try { $status = [int]$_.Exception.Response.StatusCode } catch {}
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = [System.IO.StreamReader]::new($stream)
          $bodyText = $reader.ReadToEnd()
          if ($bodyText) { $message = $bodyText }
          $reader.Dispose()
        }
      } catch {}
    }
    return [pscustomobject]@{ Ok = $false; Status = $status; Data = $null; Error = [string]$message }
  }
}

function Has-ErrorCode {
  param([object]$Response, [string]$Code)
  return (-not $Response.Ok) -and ($Response.Error -match [regex]::Escape($Code))
}

try {
  $rawKeys = npx supabase --output-format json projects api-keys 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'La CLI no pudo leer las claves del proyecto enlazado.' }
  $keyText = ($rawKeys | ForEach-Object { $_.ToString() }) -join "`n"
  if ($keyText -notmatch [regex]::Escape($projectRef)) { throw 'La CLI no confirmó el project-ref esperado; no se crearon cuentas.' }
  $jsonStart = $keyText.IndexOf('{')
  if ($jsonStart -lt 0) { throw 'La lista de claves del proyecto no devolvió JSON válido.' }
  $keyPayload = $keyText.Substring($jsonStart) | ConvertFrom-Json
  $publicKey = $keyPayload.keys | Where-Object { $_.type -eq 'publishable' } | Select-Object -First 1
  $serviceKeyInfo = $keyPayload.keys | Where-Object { $_.name -eq 'service_role' } | Select-Object -First 1
  if (-not $publicKey -or -not $serviceKeyInfo) { throw 'Falta una clave publishable o service_role en el proyecto enlazado.' }
  $serviceKey = $serviceKeyInfo.api_key

  $serviceHeaders = @{
    apikey = $serviceKey
    Authorization = "Bearer $serviceKey"
  }
  $createdUser = Invoke-SupabaseRequest -Method Post -Uri "$authUrl/admin/users" -Headers $serviceHeaders -Body @{
    email = $testEmail
    password = $testPassword
    email_confirm = $true
    user_metadata = @{ full_name = 'Codex order model verification'; role = 'admin' }
  }
  if (-not $createdUser.Ok -or -not $createdUser.Data.id) { throw 'No se pudo crear la cuenta temporal de verificación.' }
  $testUserId = [string]$createdUser.Data.id

  $publicHeaders = @{ apikey = $publicKey.api_key }
  $signedIn = Invoke-SupabaseRequest -Method Post -Uri "$authUrl/token?grant_type=password" -Headers $publicHeaders -Body @{
    email = $testEmail
    password = $testPassword
  }
  if (-not $signedIn.Ok -or -not $signedIn.Data.access_token) { throw 'No se pudo obtener una sesión normal para la cuenta temporal.' }
  $customerHeaders = @{
    apikey = $publicKey.api_key
    Authorization = "Bearer $($signedIn.Data.access_token)"
  }

  $roleResponse = Invoke-SupabaseRequest -Method Post -Uri "$restUrl/rpc/current_app_role" -Headers $customerHeaders -Body @{}
  $checks.untrusted_user_metadata_cannot_assign_admin = $roleResponse.Ok -and $roleResponse.Data -eq 'customer'

  $productsResponse = Invoke-SupabaseRequest -Method Get -Uri "$restUrl/products?select=id,name,price&is_active=eq.true&limit=1" -Headers $customerHeaders
  if (-not $productsResponse.Ok -or -not $productsResponse.Data) { throw 'La cuenta de prueba no pudo leer un producto activo del catálogo.' }
  $product = @($productsResponse.Data)[0]

  $createdOrderResponse = Invoke-SupabaseRequest -Method Post -Uri "$restUrl/rpc/create_order" -Headers $customerHeaders -Body @{
    p_items = @(@{ product_id = $product.id; quantity = 2 })
    p_contact_name = 'Codex model verification'
    p_contact_phone = '+591 70000000'
    p_delivery_type = 'pickup'
    p_address = $null
    p_comment = $null
  }
  if (-not $createdOrderResponse.Ok -or -not $createdOrderResponse.Data) { throw 'El RPC no creó el pedido válido de prueba.' }
  $order = @($createdOrderResponse.Data)[0]
  $testOrderId = [string]$order.id
  $expectedTotal = [decimal]$product.price * 2
  $checks.customer_rpc_order_is_owned_pending_and_server_total = (
    $order.client_id -eq $testUserId -and
    $order.status -eq 'pending' -and
    [decimal]$order.total -eq $expectedTotal -and
    [long]$order.order_number -gt 0
  )

  $itemsResponse = Invoke-SupabaseRequest -Method Get -Uri "$restUrl/order_items?select=product_id,product_name,quantity,unit_price,subtotal&order_id=eq.$testOrderId" -Headers $customerHeaders
  $line = @($itemsResponse.Data)[0]
  $checks.order_line_applied_price_and_subtotal_match_catalog = (
    $itemsResponse.Ok -and
    @($itemsResponse.Data).Count -eq 1 -and
    $line.product_id -eq $product.id -and
    $line.product_name -eq $product.name -and
    [int]$line.quantity -eq 2 -and
    [decimal]$line.unit_price -eq [decimal]$product.price -and
    [decimal]$line.subtotal -eq $expectedTotal
  )

  $forgedInsert = Invoke-SupabaseRequest -Method Post -Uri "$restUrl/orders" -Headers $customerHeaders -Body @{
    client_id = $testUserId
    contact_name = 'Forged order'
    contact_phone = '+591 70000000'
    delivery_type = 'pickup'
    total = 0.01
    status = 'delivered'
  }
  $checks.customer_direct_insert_with_forged_total_status_denied = Has-ErrorCode $forgedInsert '42501'

  $forgedUpdate = Invoke-SupabaseRequest -Method Patch -Uri "$restUrl/orders?id=eq.$testOrderId" -Headers $customerHeaders -Body @{
    total = 0.01
    status = 'delivered'
  }
  $checks.customer_direct_update_total_status_denied = Has-ErrorCode $forgedUpdate '42501'

  $forgedStatusRpc = Invoke-SupabaseRequest -Method Post -Uri "$restUrl/rpc/change_order_status" -Headers $customerHeaders -Body @{
    p_order_id = $testOrderId
    p_status = 'delivered'
  }
  $checks.customer_status_rpc_requires_staff = Has-ErrorCode $forgedStatusRpc '42501'

  $forgedPriceRpc = Invoke-SupabaseRequest -Method Post -Uri "$restUrl/rpc/create_order" -Headers $customerHeaders -Body @{
    p_items = @(@{ product_id = $product.id; quantity = 1; unit_price = 0.01 })
    p_contact_name = 'Forged price'
    p_contact_phone = '+591 70000000'
    p_delivery_type = 'pickup'
    p_address = $null
    p_comment = $null
  }
  $checks.customer_supplied_unit_price_rejected = Has-ErrorCode $forgedPriceRpc '22023'

  $finalOrderResponse = Invoke-SupabaseRequest -Method Get -Uri "$restUrl/orders?select=id,status,total,client_id&id=eq.$testOrderId" -Headers $customerHeaders
  $finalOrder = @($finalOrderResponse.Data)[0]
  $allOrdersResponse = Invoke-SupabaseRequest -Method Get -Uri "$restUrl/orders?select=id&client_id=eq.$testUserId" -Headers $customerHeaders
  $checks.order_unchanged_and_forged_rpc_created_no_order = (
    $finalOrderResponse.Ok -and
    $finalOrder.status -eq 'pending' -and
    [decimal]$finalOrder.total -eq $expectedTotal -and
    $finalOrder.client_id -eq $testUserId -and
    $allOrdersResponse.Ok -and
    @($allOrdersResponse.Data).Count -eq 1
  )
}
catch {
  $runError = $_.Exception.Message
}
finally {
  $cleanupSql = @'
DELETE FROM public.orders
WHERE client_id IN (SELECT id FROM auth.users WHERE email = '__TEST_EMAIL__');
DELETE FROM private.user_roles
WHERE user_id IN (SELECT id FROM auth.users WHERE email = '__TEST_EMAIL__');
DELETE FROM auth.users WHERE email = '__TEST_EMAIL__';
'@.Replace('__TEST_EMAIL__', $testEmail)
  $cleanupCheckSql = @'
SELECT jsonb_build_object(
  'auth_users', (SELECT count(*) FROM auth.users WHERE email = '__TEST_EMAIL__'),
  'orders', (SELECT count(*) FROM public.orders WHERE client_id IN (
    SELECT id FROM auth.users WHERE email = '__TEST_EMAIL__'
  )),
  'roles', (SELECT count(*) FROM private.user_roles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = '__TEST_EMAIL__'
  ))
) AS cleanup_check;
'@.Replace('__TEST_EMAIL__', $testEmail)

  try {
    [System.IO.File]::WriteAllText($cleanupFile, $cleanupSql, [System.Text.UTF8Encoding]::new($false))
    $cleanupOutput = npx supabase db query --remote --yes --file $cleanupFile 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'La eliminación SQL de los datos temporales falló.' }
    [System.IO.File]::WriteAllText($cleanupCheckFile, $cleanupCheckSql, [System.Text.UTF8Encoding]::new($false))
    $checkOutput = npx supabase db query --remote --read-only --yes --file $cleanupCheckFile 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo comprobar la limpieza remota.' }
    $checkText = ($checkOutput | ForEach-Object { $_.ToString() }) -join "`n"
    $cleanupConfirmed = (
      $checkText -match '"auth_users"\s*:\s*0' -and
      $checkText -match '"orders"\s*:\s*0' -and
      $checkText -match '"roles"\s*:\s*0'
    )
    if (-not $cleanupConfirmed) { throw 'La consulta final encontró registros temporales restantes.' }
  }
  catch {
    $cleanupError = $_.Exception.Message
  }
  Remove-Item -LiteralPath $cleanupFile, $cleanupCheckFile -ErrorAction SilentlyContinue
  $serviceKey = $null
}

$failedChecks = @($checks.GetEnumerator() | Where-Object { $_.Value -ne $true } | ForEach-Object { $_.Key })
$passed = ($failedChecks.Count -eq 0) -and ($checks.Count -gt 0) -and $cleanupConfirmed -and (-not $runError) -and (-not $cleanupError)
$summary = [ordered]@{
  passed = $passed
  checks = $checks
  cleanup_confirmed = $cleanupConfirmed
  failed_checks = $failedChecks
  error = $runError
  cleanup_error = $cleanupError
}
$summary | ConvertTo-Json -Depth 5
if (-not $passed) { exit 1 }
