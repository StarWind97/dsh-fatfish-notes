param([string]$Source)
$ErrorActionPreference='Stop'
Add-Type -Path $Source
$profile='C:\Test Notes\window-browser'
$url='http://127.0.0.1:12345/'
$line='"C:\Program Files\Google\Chrome\Application\chrome.exe" "--user-data-dir=C:\Test Notes\window-browser" --app=http://127.0.0.1:12345/'
if(![NotesWindow]::Matches($line,$profile,$url)){throw 'Expected profile rejected'}
if([NotesWindow]::Matches($line,$profile+'-other',$url)){throw 'Profile prefix accepted'}
if([NotesWindow]::Matches($line,$profile,'http://127.0.0.1:54321/')){throw 'Other origin accepted'}
if([NotesWindow]::Matches($line+' --type=renderer',$profile,$url)){throw 'Child process accepted'}
if([NotesWindow]::Matches($line+' --user-data-dir=C:\other',$profile,$url)){throw 'Duplicate profile accepted'}
if([NotesWindow]::Matches($line+' --app=http://127.0.0.1:12345/',$profile,$url)){throw 'Duplicate app accepted'}
if([NotesWindow]::Matches($null,$profile,$url)){throw 'Missing command accepted'}
if([NotesWindow]::OwnsWindow([IntPtr]::Zero,$PID)){throw 'Missing window accepted'}
if(![NotesWindow]::CommandLine($PID)){throw 'Cannot read own command line'}
if([NotesWindow]::CommandLine(-1)){throw 'Invalid PID accepted'}
'native identity checks passed'
