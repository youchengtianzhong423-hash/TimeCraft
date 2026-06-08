@echo off
title TimeCraft
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-TimeCraft.ps1"
if errorlevel 1 pause
exit /b %ERRORLEVEL%
