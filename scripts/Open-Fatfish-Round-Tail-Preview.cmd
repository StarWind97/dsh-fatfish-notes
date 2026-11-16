@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Open-Fatfish-Round-Tail-Preview.ps1"
if errorlevel 1 pause
