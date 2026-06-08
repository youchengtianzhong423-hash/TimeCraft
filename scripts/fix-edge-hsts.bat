@echo off
title TimeCraft - Edge HSTS fix (one-time)
echo.
echo ERR_SSL_PROTOCOL_ERROR が出るとき:
echo   Edge が http を https に書き換えている可能性があります。
echo.
echo 次の画面で「Delete domain security policies」に
echo   127.0.0.1
echo を入力して Delete を押してください。
echo （必要なら localhost も同様に Delete）
echo.
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
start "" "%EDGE%" "edge://net-internals/#hsts"
echo.
pause
