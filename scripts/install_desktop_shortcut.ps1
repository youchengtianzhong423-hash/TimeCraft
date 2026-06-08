# TimeCraft desktop shortcut - creates .lnk on all Desktop folders (OneDrive dual-desktop fix)
$ScriptsDir = $PSScriptRoot
$ProjectRoot = (Resolve-Path (Join-Path $ScriptsDir "..")).Path
$StartBat = Join-Path $ScriptsDir "TimeCraft-START.bat"
$IconSource = Join-Path $ProjectRoot "public\timecraft-icon-source.png"
$LocalAppDir = Join-Path $env:LOCALAPPDATA "TimeCraft"
$IconIco = Join-Path $LocalAppDir "timecraft-icon.ico"
$ShortcutName = "TimeCraft.lnk"

if (-not (Test-Path $StartBat)) {
    Write-Error "Missing: $StartBat"
    exit 1
}

New-Item -ItemType Directory -Force -Path $LocalAppDir | Out-Null

if (Test-Path $IconSource) {
    $transparentPng = Join-Path $ProjectRoot "public\timecraft-icon-transparent.png"
    $prepare = Join-Path $ScriptsDir "prepare-app-icon.mjs"
    if (Test-Path $prepare) {
        $node = Get-Command node -ErrorAction SilentlyContinue
        if ($node) {
            & $node.Source $prepare $IconSource $transparentPng
            if (Test-Path $transparentPng) {
                $IconSource = $transparentPng
            }
        }
    }
    $conv = Join-Path $ScriptsDir "Convert-PngToIco.ps1"
    if (Test-Path $conv) {
        & $conv -SourcePath $IconSource -IcoPath $IconIco -PngPath (Join-Path $LocalAppDir "timecraft-icon.png")
    }
}

if (-not (Test-Path $IconIco)) {
    Write-Warning "Icon not found: $IconIco"
}

function Get-AllDesktopPaths {
    $candidates = @(
        [Environment]::GetFolderPath("Desktop")
        (Join-Path $env:USERPROFILE "Desktop")
        (Join-Path $env:USERPROFILE "OneDrive\Desktop")
    )
    $oneDriveJa = Join-Path $env:USERPROFILE "OneDrive"
    $oneDriveJa = Join-Path $oneDriveJa ([string][char]0x30C7 + [char]0x30B9 + [char]0x30AF + [char]0x30C8 + [char]0x30C3 + [char]0x30D7)
    $candidates += $oneDriveJa

    try {
        $reg = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders" -Name Desktop -ErrorAction Stop).Desktop
        if ($reg) { $candidates += [Environment]::ExpandEnvironmentVariables($reg) }
    } catch { }

    $candidates |
        Where-Object { $_ -and (Test-Path $_) } |
        ForEach-Object { (Resolve-Path $_).Path } |
        Select-Object -Unique
}

$wsh = New-Object -ComObject WScript.Shell
$desktops = @(Get-AllDesktopPaths)

if ($desktops.Count -eq 0) {
    Write-Error "Desktop folder not found."
    exit 1
}

Write-Host "Icon: $IconIco ($((Get-Item $IconIco -ErrorAction SilentlyContinue).Length) bytes)"
Write-Host "Desktop folders:"
$desktops | ForEach-Object { Write-Host "  $_" }
Write-Host ""

foreach ($desktop in $desktops) {
    Get-ChildItem -Path $desktop -Filter "TimeCraft*.lnk" -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
        Write-Host "Removed: $($_.FullName)"
    }

    $lnk = Join-Path $desktop $ShortcutName
    $sc = $wsh.CreateShortcut($lnk)
    $sc.TargetPath = $StartBat
    $sc.WorkingDirectory = $ScriptsDir
    $sc.Description = "TimeCraft"
    $sc.WindowStyle = 1
    if (Test-Path $IconIco) {
        $sc.IconLocation = "$IconIco,0"
    }
    $sc.Save()
    Write-Host "Created: $lnk -> Icon $($sc.IconLocation)"
}

# アイコンキャッシュの更新を促す
$ie4u = Join-Path $env:SystemRoot "System32\ie4uinit.exe"
if (Test-Path $ie4u) {
    Start-Process $ie4u -ArgumentList "-show" -WindowStyle Hidden -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "OK. If icon still old: delete TimeCraft.lnk, run this script again, then sign out/in or reboot."
