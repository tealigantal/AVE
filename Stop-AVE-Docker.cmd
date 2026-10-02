@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\docker\Stop-AVE.ps1" %*
if errorlevel 1 pause
