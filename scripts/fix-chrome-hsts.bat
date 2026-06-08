@echo off
title TimeCraft - Chrome HSTS fix (one-time)
echo.
echo Chrome が https に飛ばすとき:
echo   1. chrome://net-internals/#hsts を開く
echo   2. Delete domain: 127.0.0.1 と localhost を Delete
echo.
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
start "" "%CHROME%" "chrome://net-internals/#hsts"
echo.
pause
