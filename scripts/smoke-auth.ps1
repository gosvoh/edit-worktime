param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Login = "admin",
  [string]$Password = "admin12345"
)

$ErrorActionPreference = "Stop"

Write-Host "1) Login..."
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{
  login = $Login
  password = $Password
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod `
  -Uri "$BaseUrl/api/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body $loginBody `
  -WebSession $session

Write-Host "Login OK. ExpiresAt: $($loginResponse.expiresAt)"

Write-Host "2) Get current session (/api/auth/me)..."
$me = Invoke-RestMethod -Uri "$BaseUrl/api/auth/me" -Method Get -WebSession $session
Write-Host "User:" $me.user.login "Role:" $me.user.role

Write-Host "3) Read employees..."
$employees = Invoke-RestMethod -Uri "$BaseUrl/api/employees" -Method Get -WebSession $session
Write-Host "Employees count:" $employees.Count

if ($employees.Count -gt 0) {
  $first = $employees[0]
  Write-Host "4) Patch first employee load with same value (auth check)..."
  $patchBody = @{
    currentLoadHours = [double]$first.currentLoadHours
  } | ConvertTo-Json
  $patched = Invoke-RestMethod `
    -Uri "$BaseUrl/api/employees/$($first.id)" `
    -Method Patch `
    -ContentType "application/json" `
    -Body $patchBody `
    -WebSession $session
  Write-Host "Patched employee:" $patched.fullName
}

Write-Host "5) Logout..."
Invoke-RestMethod -Uri "$BaseUrl/api/auth/logout" -Method Post -WebSession $session | Out-Null
Write-Host "Logout OK."

Write-Host "6) Verify session closed (expect 401)..."
try {
  Invoke-RestMethod -Uri "$BaseUrl/api/auth/me" -Method Get -WebSession $session | Out-Null
  throw "Expected 401 after logout, but request succeeded."
} catch {
  Write-Host "Session invalidated as expected."
}

Write-Host "Smoke auth test passed."
