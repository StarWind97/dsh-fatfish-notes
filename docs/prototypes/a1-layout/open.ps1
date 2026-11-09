$ErrorActionPreference = 'Stop'
$project = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$preview = Join-Path $project 'output/playwright/a1-layout/index.html'
if (!(Test-Path -LiteralPath $preview)) {
  throw 'Build the preview first: node docs/prototypes/a1-layout/build.cjs'
}
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (!(Test-Path -LiteralPath $chrome)) {
  Start-Process -FilePath $preview
  exit 0
}
$profile = Join-Path $project '.dsh-home/pure-001/a1-layout-preview'
$uri = ([Uri]$preview).AbsoluteUri
# This is an explicitly requested, visible preview window with an isolated profile.
Start-Process -FilePath $chrome -ArgumentList @("--app=$uri", "`"--user-data-dir=$profile`"", '--no-first-run', '--no-default-browser-check', '--window-size=1560,1000') -WindowStyle Normal
