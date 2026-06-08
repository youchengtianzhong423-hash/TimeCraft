param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,
    [Parameter(Mandatory = $true)]
    [string]$IcoPath,
    [string]$PngPath
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$src = (Resolve-Path $SourcePath).Path
$icoFull = $IcoPath
if (-not [System.IO.Path]::IsPathRooted($icoFull)) {
    $icoFull = Join-Path (Get-Location) $icoFull
}
$dir = Split-Path $icoFull -Parent
if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

if (-not $PngPath) {
    $PngPath = [System.IO.Path]::ChangeExtension($icoFull, ".png")
}
$pngFull = $PngPath
if (-not [System.IO.Path]::IsPathRooted($pngFull)) {
    $pngFull = Join-Path (Get-Location) $pngFull
}

$img = [System.Drawing.Image]::FromFile($src)
try {
    $img.Save($pngFull, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
    $img.Dispose()
}

$pngResolved = (Resolve-Path $pngFull).Path
$tmpIco = Join-Path ([System.IO.Path]::GetTempPath()) "timecraft-icon-tmp.ico"
if (Test-Path $tmpIco) { Remove-Item $tmpIco -Force }

$cmd = "npx --yes png-to-ico `"$pngResolved`" > `"$tmpIco`" 2>nul"
cmd /c $cmd | Out-Null
if (-not (Test-Path $tmpIco) -or (Get-Item $tmpIco).Length -lt 500) {
    throw "ICO generation failed"
}

Copy-Item $tmpIco $icoFull -Force
Remove-Item $tmpIco -Force -ErrorAction SilentlyContinue
Write-Host "Created $icoFull size=$((Get-Item $icoFull).Length)"
