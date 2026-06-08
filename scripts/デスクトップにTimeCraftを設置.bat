@echo off
chcp 65001 >nul
title TimeCraft - デスクトップショートカット設置
cd /d "%~dp0"

echo.
echo ========================================
echo   TimeCraft をデスクトップに置きます
echo ========================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_desktop_shortcut.ps1"
set ERR=%ERRORLEVEL%

echo.
if %ERR% neq 0 (
  echo [エラー] 設置に失敗しました。上の赤い文字を確認してください。
) else (
  echo [完了] 設置処理は終わりました。
  echo.
  echo 次を確認してください:
  echo   1. キーボードの Win + D でデスクトップを表示
  echo   2. 「TimeCraft」というアイコンを探す
  echo.
  echo ※ OneDrive 利用時、デスクトップは次の場所にあることがあります:
  echo    %USERPROFILE%\OneDrive\デスクトップ
  echo.
  start "" "%USERPROFILE%\OneDrive\デスクトップ" 2>nul
  start "" "%USERPROFILE%\Desktop" 2>nul
)

echo.
pause
