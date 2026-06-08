@echo off
REM Wait until TimeCraft answers HTTP 200, then open Chrome (max ~2 min)
set /a TRIES=0

:loop
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto open

set /a TRIES+=1
if %TRIES% GEQ 60 goto open
timeout /t 2 /nobreak >nul
goto loop

:open
call "%~dp0open-chrome-url.bat"
