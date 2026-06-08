foreach ($port in 3000, 3100) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object {
            Write-Host "Stopping PID $_ (port $port)"
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        }
}
Write-Host "Done."
Start-Sleep -Seconds 2
