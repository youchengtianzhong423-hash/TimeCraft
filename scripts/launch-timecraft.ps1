# TimeCraft ローカル起動（開発サーバー + ブラウザ）
$ErrorActionPreference = "SilentlyContinue"
$projectRoot = Split-Path $PSScriptRoot -Parent

$port = 3000
$url = "http://localhost:$port/"

$listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
    Start-Process powershell.exe -ArgumentList @(
        "-NoExit",
        "-NoProfile",
        "-Command",
        "Set-Location '$projectRoot'; npm run dev"
    ) | Out-Null
    Start-Sleep -Seconds 4
}

Start-Process $url
