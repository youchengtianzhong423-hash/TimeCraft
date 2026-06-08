$Port = 3100
$Url = "http://127.0.0.1:${Port}/"
$ChromeProfile = Join-Path $env:LOCALAPPDATA "TimeCraft\ChromeProfile"

try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -ne 200) { throw "bad status" }
} catch {
    Add-Type -AssemblyName System.Windows.Forms
    [void][System.Windows.Forms.MessageBox]::Show(
        "TimeCraft is not running.`n`nUse TimeCraft Start.lnk first.`n`n$Url",
        "TimeCraft"
    )
    exit 1
}

$chrome = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { $chrome = "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe" }
New-Item -ItemType Directory -Force -Path $ChromeProfile | Out-Null
Start-Process $chrome -ArgumentList @("--user-data-dir=$ChromeProfile", "--new-window", "--disable-features=HttpsUpgrades", $Url)
