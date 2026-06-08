$out = Join-Path ([Environment]::GetFolderPath("Desktop")) "TimeCraft-diagnose.txt"
$lines = @("TimeCraft diagnose $(Get-Date)", "")

function Add([string]$s) { $script:lines += $s }

Add "=== Ports ==="
foreach ($p in 3000, 3100) {
    $listen = Get-NetTCPConnection -LocalPort $p -State Listen -EA SilentlyContinue
    Add "Port $p : $(if ($listen) { 'LISTEN PID=' + ($listen.OwningProcess | Select-Object -First 1) } else { 'free' })"
}

Add ""
Add "=== HTTP ==="
foreach ($u in @("http://127.0.0.1:3100/", "http://127.0.0.1:3000/", "https://127.0.0.1:3100/")) {
    try {
        $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 4
        Add "$u -> $($r.StatusCode)"
    } catch {
        Add "$u -> FAIL ($($_.Exception.Message))"
    }
}

Add ""
Add "=== Node ==="
Add "where node: $((where.exe node 2>$null) -join ' | ')"
if (Test-Path "C:\Program Files\nodejs\node.exe") {
    Add "nodejs: $(& 'C:\Program Files\nodejs\node.exe' -v)"
}

Add ""
Add "=== Chrome ==="
$chrome = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
Add "Chrome exists: $(Test-Path $chrome)"

Add ""
Add "=== Launch log ==="
$log = Join-Path $PSScriptRoot "_last-launch.log"
if (Test-Path $log) { Add (Get-Content $log -Raw) } else { Add "(no log)" }

$lines | Set-Content $out -Encoding UTF8
Write-Host "Saved: $out"
notepad $out
