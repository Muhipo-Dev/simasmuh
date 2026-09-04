$envFile = "backend\.env"
$envContent = Get-Content $envFile -Raw
if ($envContent -match 'DATABASE_URL\s*=\s*"?([^"\r\n]+)"?') {
    $dbUrl = $Matches[1].Trim('"').Trim("'")
    Write-Host "Matched URL: $dbUrl"

    if ($dbUrl -match '://[^@]+@([^:/]+):?(\d+)?/') {
        $dbHost = $Matches[1]
        $dbPort = if ($Matches[2]) { [int]$Matches[2] } else { 5432 }
        Write-Host "Host: $dbHost, Port: $dbPort"

        $tcpClient = New-Object System.Net.Sockets.TcpClient
        try {
            $connect = $tcpClient.BeginConnect($dbHost, $dbPort, $null, $null)
            $waited = $connect.AsyncWaitHandle.WaitOne(3000, $false)
            if ($waited -and $tcpClient.Connected) {
                Write-Host "Connected successfully"
            } else {
                Write-Host "Connection timed out or failed"
            }
        } finally {
            $tcpClient.Close()
        }
    } else {
        Write-Host "Regex 2 failed"
    }
} else {
    Write-Host "Regex 1 failed"
}
