@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Open-Fatfish-Taskbar-Review.ps1"
if errorlevel 1 pause
