@echo off
title TimeCraft Server
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0\.."
call npm run start
