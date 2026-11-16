@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Open-Fatfish-Tail-Preview.ps1"
if errorlevel 1 pause
