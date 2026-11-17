param([int]$BrowserPid, [string]$ExpectedStartTicks = '', [string]$ExpectedProfile, [string]$ExpectedAppUrl, [string]$AppId)
$ErrorActionPreference = 'Stop'
Add-Type -Path (Join-Path $PSScriptRoot 'window-native.cs')
function Matches-WindowProcess($candidate) {
 if (!$candidate -or $candidate.ProcessName -notin @('chrome','msedge')) { return $false }
 return [NotesWindow]::Matches([NotesWindow]::CommandLine($candidate.Id),$ExpectedProfile,$ExpectedAppUrl)
}
$browserProcess = Get-Process -Id $BrowserPid -ErrorAction SilentlyContinue
if (!$ExpectedStartTicks -and !(Matches-WindowProcess $browserProcess)) {
 for ($attempt=0; $attempt -lt 10; $attempt++) {
  $browserProcess = Get-Process chrome,msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -and (Matches-WindowProcess $_) } | Select-Object -First 1
  if ($browserProcess) { break }
  Start-Sleep -Milliseconds 200
 }
}
if (!(Matches-WindowProcess $browserProcess)) { @{found=$false;focused=$false} | ConvertTo-Json -Compress; exit 0 }
$ticks = $browserProcess.StartTime.ToUniversalTime().Ticks.ToString()
if ($ExpectedStartTicks -and $ExpectedStartTicks -ne $ticks) { @{found=$false;focused=$false} | ConvertTo-Json -Compress; exit 0 }
for ($i=0; $i -lt 60 -and !$browserProcess.MainWindowHandle; $i++) { Start-Sleep -Milliseconds 100; $browserProcess.Refresh() }
$handle = $browserProcess.MainWindowHandle
if (![NotesWindow]::OwnsWindow($handle,$browserProcess.Id) -or $browserProcess.StartTime.ToUniversalTime().Ticks.ToString() -ne $ticks) { @{found=$false;focused=$false} | ConvertTo-Json -Compress; exit 0 }
$iconApplied=$false
try {
 if ($AppId -match '^FatfishNotes\.[a-f0-9]{24}$') {
  $iconPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../assets/brand/favicon.ico'))
  $iconApplied=[NotesWindow]::SetTaskbarIcon($handle,$browserProcess.Id,$iconPath,$browserProcess.Path,$ExpectedProfile,$ExpectedAppUrl,$AppId)
 }
} catch { $iconApplied=$false }
if ([NotesWindow]::IsIconic($handle)) { [void][NotesWindow]::ShowWindowAsync($handle,9) }
[void][NotesWindow]::SetForegroundWindow($handle)
Start-Sleep -Milliseconds 150
@{found=$true;focused=([NotesWindow]::GetForegroundWindow() -eq $handle);startTicks=$ticks;pid=$browserProcess.Id;iconApplied=$iconApplied} | ConvertTo-Json -Compress
