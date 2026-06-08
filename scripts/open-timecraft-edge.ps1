# Open TimeCraft in Microsoft Edge (not Cursor Simple Browser)
$Url = "http://127.0.0.1:3000"
$EdgeCandidates = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)
$Edge = $EdgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Edge) {
    Write-Error "Microsoft Edge not found. Open manually: $Url"
    exit 1
}
Start-Process -FilePath $Edge -ArgumentList $Url, "--new-window"
Write-Host "Opened: $Url"
