$ErrorActionPreference='Stop'
$previewUrl='http://127.0.0.1:8818/'
$running=$false
try {
  $page=Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 2
  if($page.Content -notmatch 'fatfish-small-mark-20261116'){throw 'Port 8818 belongs to another service.'}
  $running=$true
} catch {
  if($_.Exception.Message -match 'another service'){throw}
}
if(!$running){
  $nodePath='D:\ProgramFiles\nvm\installs\v24.21.0\node.exe'
  if(!(Test-Path -LiteralPath $nodePath)){$nodePath=(Get-Command node -ErrorAction Stop).Source}
  $serverFile=Join-Path $PSScriptRoot 'serve.cjs'
  Start-Process -FilePath $nodePath -ArgumentList ('"'+$serverFile+'"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
  $ready=$false
  for($i=0;$i -lt 20;$i++){
    try{$page=Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 1;if($page.Content -match 'fatfish-small-mark-20261116'){$ready=$true;break}}catch{}
    Start-Sleep -Milliseconds 150
  }
  if(!$ready){throw 'Preview server did not start. Open index.html directly.'}
}
Start-Process $previewUrl
