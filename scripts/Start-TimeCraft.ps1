# TimeCraft launcher - port 3100, Chrome app window, stop server when app closes
#Requires -Version 5.1
$ErrorActionPreference = "Continue"

$Port = 3100
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Get-AppUrl {
    $buildIdPath = Join-Path $Root ".next\BUILD_ID"
    if (Test-Path $buildIdPath) {
        $id = (Get-Content $buildIdPath -Raw).Trim()
        if ($id) {
            return "http://localhost:${Port}/?tc=$id"
        }
    }
    return "http://localhost:${Port}/"
}
$NpmCmd = "C:\Program Files\nodejs\npm.cmd"
$NodeDir = "C:\Program Files\nodejs"
$ChromeProfile = Join-Path $env:LOCALAPPDATA "TimeCraft\ChromeProfile"
$LocalAppDir = Join-Path $env:LOCALAPPDATA "TimeCraft"
$ServerBat = Join-Path $PSScriptRoot "_run-server.cmd"
$FlagFile = Join-Path $env:TEMP "timecraft-launched-server.flag"
$LastServedBuildFile = Join-Path $LocalAppDir "last-served-build-id.txt"
$LogFile = Join-Path ([Environment]::GetFolderPath("Desktop")) "TimeCraft-last-run.txt"

function Write-Log([string]$Msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Msg"
    try { Add-Content -Path $LogFile -Value $line -Encoding UTF8 } catch { }
}

function Test-TimeCraftServer {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:${Port}/" -UseBasicParsing -TimeoutSec 3
        return ($r.StatusCode -eq 200)
    } catch { return $false }
}

function Get-ListenerPids([int]$LocalPort) {
    Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
}

function Stop-Port([int]$LocalPort) {
    foreach ($procId in (Get-ListenerPids $LocalPort)) {
        Write-Log "Stop PID $procId (port $LocalPort)"
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}

function Show-Message([string]$Text) {
    Add-Type -AssemblyName System.Windows.Forms
    [void][System.Windows.Forms.MessageBox]::Show($Text, "TimeCraft", "OK", "Warning")
}

function Find-Chrome {
    @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1
}

function Start-ServerWindow {
    if (Test-Path $FlagFile) { Remove-Item $FlagFile -Force -ErrorAction SilentlyContinue }
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.Arguments = "/c `"$ServerBat`""
    $psi.WorkingDirectory = $Root
    $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Minimized
    $psi.UseShellExecute = $true
    [void][System.Diagnostics.Process]::Start($psi)
    "" | Set-Content -Path $FlagFile -Encoding ASCII
    Write-Log "Server started (minimized)"
}

function Stop-ServerIfWeStartedIt {
    if (-not (Test-Path $FlagFile)) { return }
    Remove-Item $FlagFile -Force -ErrorAction SilentlyContinue
    Stop-Port $Port
    Write-Log "Server stopped"
}

function Open-ChromeApp {
    $chrome = Find-Chrome
    $appUrl = Get-AppUrl
    if (-not $chrome) {
        Show-Message "Google Chrome not found.`n`nInstall Chrome, or open:`n$appUrl"
        return $false
    }
    New-Item -ItemType Directory -Force -Path $ChromeProfile | Out-Null
    $args = @(
        "--user-data-dir=$ChromeProfile",
        "--app=$appUrl",
        "--disable-features=HttpsUpgrades,AutomaticHttpsDefault"
    )
    Write-Log "Open Chrome app: $appUrl"
    $p = Start-Process -FilePath $chrome -ArgumentList $args -PassThru
    $p.WaitForExit()
    Write-Log "Chrome closed"
    return $true
}

Write-Log "=== Start ==="

if (-not (Test-Path "C:\Program Files\nodejs\node.exe")) {
    Show-Message "Node.js not found.`nInstall from https://nodejs.org/"
    exit 1
}

$env:PATH = "$NodeDir;$env:PATH"
Set-Location $Root
New-Item -ItemType Directory -Force -Path $LocalAppDir | Out-Null

if (-not (Test-Path (Join-Path $Root "node_modules"))) {
    Write-Host "First run: npm install..."
    & $NpmCmd install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Show-Message "npm install failed."
        exit 1
    }
}

$buildIdPath = Join-Path $Root ".next\BUILD_ID"
$srcNewer = $false
$currentBuildId = ""
if (Test-Path $buildIdPath) {
    $currentBuildId = (Get-Content $buildIdPath -Raw).Trim()
    $builtAt = (Get-Item $buildIdPath).LastWriteTimeUtc
    $srcNewer = [bool](
        Get-ChildItem -Path (Join-Path $Root "src") -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTimeUtc -gt $builtAt } |
            Select-Object -First 1
    )
} else {
    $srcNewer = $true
}

if ($srcNewer) {
    Write-Host "Updating build (source changed)..."
    & $NpmCmd run build
    if ($LASTEXITCODE -ne 0) {
        Show-Message "npm run build failed."
        exit 1
    }
    if (Test-Path $buildIdPath) {
        $currentBuildId = (Get-Content $buildIdPath -Raw).Trim()
    }
}

$lastServedBuildId = ""
if (Test-Path $LastServedBuildFile) {
    $lastServedBuildId = (Get-Content $LastServedBuildFile -Raw).Trim()
}
$buildChanged = $currentBuildId -and ($currentBuildId -ne $lastServedBuildId)
$mustRestartServer = $srcNewer -or $buildChanged

if (Test-TimeCraftServer) {
    if ($mustRestartServer) {
        Write-Log "Server up but build changed ($lastServedBuildId -> $currentBuildId) — restarting"
        Stop-Port $Port
        Start-Sleep -Seconds 2
    } else {
        Write-Log "Server already up (build $currentBuildId)"
        Open-ChromeApp | Out-Null
        exit 0
    }
}

if (Get-ListenerPids $Port) {
    Write-Log "Port busy, cleaning..."
    Stop-Port $Port
    Start-Sleep -Seconds 2
}

Start-ServerWindow

Write-Host ""
Write-Host "  TimeCraft starting..."
Write-Host "  First launch may take 1-2 minutes."
Write-Host ""

$ok = $false
for ($i = 0; $i -lt 90; $i++) {
    if (Test-TimeCraftServer) { $ok = $true; break }
    Start-Sleep -Seconds 2
}

if (-not $ok) {
    Stop-ServerIfWeStartedIt
    Show-Message @"
TimeCraft did not start in time.

1. Look for a minimized "TimeCraft Server" window
2. Read any error text there
3. Log: $LogFile
"@
    exit 1
}

if ($currentBuildId) {
    $currentBuildId | Set-Content -Path $LastServedBuildFile -Encoding ASCII -NoNewline
    Write-Log "Serving build $currentBuildId"
}

Open-ChromeApp | Out-Null
Stop-ServerIfWeStartedIt
Write-Host "TimeCraft finished."
exit 0
