@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Stop-TimeCraft.ps1"
timeout /t 3 /nobreak >nul
