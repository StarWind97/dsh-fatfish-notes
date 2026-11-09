param([int]$BrowserPid, [string]$ExpectedStartTicks = '', [string]$ExpectedProfile)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class NotesWindow {
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h, int c);
}
'@
$browserProcess = Get-Process -Id $BrowserPid -ErrorAction SilentlyContinue
if (!$ExpectedStartTicks -and !$browserProcess) {
 for ($attempt=0; $attempt -lt 20; $attempt++) {
  $match = Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains("--user-data-dir=$ExpectedProfile") -and !$_.CommandLine.Contains('--type=') } | Select-Object -First 1
  if ($match) { $browserProcess = Get-Process -Id $match.ProcessId -ErrorAction SilentlyContinue; if ($browserProcess.MainWindowHandle) { $BrowserPid=$browserProcess.Id; break } }
  Start-Sleep -Milliseconds 200
 }
}
if (!$browserProcess -or $browserProcess.ProcessName -notin @('chrome','msedge')) {
 @{ found=$false; focused=$false } | ConvertTo-Json -Compress
 exit 0
}
$ticks = $browserProcess.StartTime.ToUniversalTime().Ticks.ToString()
if (($ExpectedStartTicks -and $ExpectedStartTicks -ne $ticks) -or !$ExpectedProfile) {
 @{ found=$false; focused=$false } | ConvertTo-Json -Compress
 exit 0
}
for ($i=0; $i -lt 60 -and !$browserProcess.MainWindowHandle; $i++) {
 Start-Sleep -Milliseconds 100
 $browserProcess.Refresh()
}
$handle = $browserProcess.MainWindowHandle
if (!$handle) { @{found=$false; focused=$false} | ConvertTo-Json -Compress; exit 0 }
if ([NotesWindow]::IsIconic($handle)) { [void][NotesWindow]::ShowWindowAsync($handle,9) }
[void][NotesWindow]::SetForegroundWindow($handle)
Start-Sleep -Milliseconds 150
@{ found=$true; focused=([NotesWindow]::GetForegroundWindow() -eq $handle); startTicks=$ticks; pid=$BrowserPid } | ConvertTo-Json -Compress
