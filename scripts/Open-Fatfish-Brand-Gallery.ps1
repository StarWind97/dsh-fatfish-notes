param([switch]$NoBrowser)
$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent $PSScriptRoot
$pageRoot=Join-Path $repoRoot 'docs/brand/reviews/2026-11-17-original-shape'
$stateRoot=Join-Path $repoRoot '.dsh-home/pure-001/brand-gallery-20261117'
$stateFile=Join-Path $stateRoot 'page-state.json'
$url='http://127.0.0.1:8823'
New-Item -ItemType Directory -Force -Path $stateRoot | Out-Null
try {$existing=Invoke-RestMethod "$url/__preview_status__" -TimeoutSec 2} catch {$existing=$null}
if($existing){
  if($existing.root -ne $pageRoot -or $existing.stateFile -ne $stateFile){throw 'Port 8823 belongs to another page; no process was changed.'}
}else{
  $python=(Get-Command python -ErrorAction Stop).Source
  $server=Join-Path $pageRoot 'serve_page.py'
  $serverArgs=@('-X','utf8','-u',('"'+$server+'"'),'--directory',('"'+$pageRoot+'"'),'--state-file',('"'+$stateFile+'"'),'--port','8823','--no-browser')
  $process=Start-Process -FilePath $python -ArgumentList $serverArgs -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $stateRoot 'server.out.log') -RedirectStandardError (Join-Path $stateRoot 'server.err.log')
  for($i=0;$i -lt 30;$i++){
    try {$existing=Invoke-RestMethod "$url/__preview_status__" -TimeoutSec 1;break} catch {Start-Sleep -Milliseconds 200}
  }
  if(!$existing -or $existing.root -ne $pageRoot -or $existing.stateFile -ne $stateFile){throw 'Preview did not start; see the gallery server logs.'}
  $process.Id | Set-Content -LiteralPath (Join-Path $stateRoot 'server.pid')
}
if(!$NoBrowser){Start-Process "$url/"}
Write-Output "$url/"
