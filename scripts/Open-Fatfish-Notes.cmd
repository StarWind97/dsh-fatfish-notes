@echo off
setlocal EnableExtensions DisableDelayedExpansion
for %%I in ("%~dp0..\.dsh-home\pure-001") do set "qa_root=%%~fI"
set "desktop_exe=D:\ProgramFiles\DeepSeek Harness\DeepSeek Harness.exe"
set "DSH_HOME=%qa_root%\release12-desktop"
set "desktop_shell=%qa_root%\release12-shell"

if not exist "%desktop_exe%" goto missing_app
if not exist "%desktop_shell%\." goto missing_profile
if not exist "%DSH_HOME%\profiles\desktop\node_modules\dsh-fatfish-notes\package.json" goto missing_profile

set "ELECTRON_RUN_AS_NODE="
set "PATH=C:\Program Files\GitHub CLI;%PATH%"
set "HTTP_PROXY=http://127.0.0.1:7897"
set "HTTPS_PROXY=%HTTP_PROXY%"
set "NO_PROXY=127.0.0.1,localhost"
start "" /D "%qa_root%" "%desktop_exe%" "--user-data-dir=%desktop_shell%" "--proxy-server=%HTTP_PROXY%" "--proxy-bypass-list=localhost;127.0.0.1"
if not errorlevel 1 exit /b 0
echo Could not start DeepSeek Harness.
goto failed

:missing_app
echo DeepSeek Harness was not found at "%desktop_exe%".
goto failed

:missing_profile
echo The isolated notebook or its desktop profile is missing under "%qa_root%".

:failed
pause
exit /b 1
