param(
    [string]$Mode = ""
)

# ============================================================
#   SIMASMUH - Script Manajemen Aplikasi
#   Copyright (C) 2026 - Muhipo Dev
# ============================================================

$ROOT         = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_DIR  = Join-Path $ROOT "backend"
$FRONTEND_DIR = Join-Path $ROOT "frontend"
$FACE_AI_DIR  = Join-Path $ROOT "services\face-attendance"
$WA_GATEWAY_DIR = Join-Path $ROOT "services\whatsapp-gateway"

# Log files
$BACKEND_LOG        = Join-Path $ROOT "backend.log"
$FRONTEND_LOG       = Join-Path $ROOT "frontend.log"
$PRISMA_STUDIO_LOG  = Join-Path $ROOT "prisma-studio.log"
$FACE_AI_LOG        = Join-Path $ROOT "face-ai.log"
$WA_GATEWAY_LOG     = Join-Path $ROOT "whatsapp-gateway.log"

# PID marker files
$BACKEND_PID_FILE        = Join-Path $ROOT ".backend.pid"
$FRONTEND_PID_FILE       = Join-Path $ROOT ".frontend.pid"
$PRISMA_STUDIO_PID_FILE  = Join-Path $ROOT ".prisma-studio.pid"
$FACE_AI_PID_FILE        = Join-Path $ROOT ".face-ai.pid"
$WA_GATEWAY_PID_FILE     = Join-Path $ROOT ".whatsapp-gateway.pid"

# ─── HELPERS ────────────────────────────────────────────────

function Write-Banner {
    try { Clear-Host } catch {}
    Write-Host ""
    Write-Host "  +==================================================+" -ForegroundColor Cyan
    Write-Host "  |           SIMASMUH - Muhipo Dev 2026             |" -ForegroundColor Cyan
    Write-Host "  |     Sistem Informasi Manajemen SMA MUHIPO        |" -ForegroundColor Cyan
    Write-Host "  +==================================================+" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Status { param($Message, $Color = "White"); Write-Host "  >> $Message" -ForegroundColor $Color }
function Write-Ok     { param($Message); Write-Host "  [OK] $Message" -ForegroundColor Green }
function Write-Err    { param($Message); Write-Host "  [ERR] $Message" -ForegroundColor Red }
function Write-Info   { param($Message); Write-Host "  [i]  $Message" -ForegroundColor Yellow }

# Cari path npm yang valid
function Get-NpmPath {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($npm) { return $npm.Source }
    foreach ($p in @(
        "$env:ProgramFiles\nodejs\npm.cmd",
        "$env:APPDATA\npm\npm.cmd",
        "C:\Program Files\nodejs\npm.cmd"
    )) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

function Get-StoredPid {
    param($File)
    if (Test-Path $File) {
        $raw = Get-Content $File -Raw
        if ($raw -match '^\d+$') { return [int]$raw.Trim() }
    }
    return $null
}

function Test-ProcessRunning {
    param([int]$ProcessId)
    try {
        $p = Get-Process -Id $ProcessId -ErrorAction Stop
        return (-not $p.HasExited)
    } catch {
        return $false
    }
}

function Stop-ProcessById {
    param([int]$ProcessId)
    try {
        $null = cmd.exe /c "taskkill /PID $ProcessId /T /F 2>nul"
    } catch {}
}

function Stop-PortProcess {
    param([int]$Port)
    try {
        $result = netstat -ano 2>$null | Select-String ":$Port\s" | Select-String "LISTENING"
        foreach ($line in $result) {
            $tokens = ($line.Line -split '\s+') | Where-Object { $_ -ne '' }
            $pidVal = $tokens[-1]
            if ($pidVal -match '^\d+$' -and [int]$pidVal -gt 0) {
                $null = cmd.exe /c "taskkill /PID $pidVal /T /F 2>nul"
            }
        }
    } catch {}
}

# Kompresi file log mentah ke format Gzip (.log.gz) sekecil-kecilnya
function Compress-LogFile-Gzip {
    param(
        [string]$SourcePath,
        [string]$TargetDir = ""
    )
    if (-not (Test-Path $SourcePath)) { return }
    $fileInfo = Get-Item $SourcePath
    if ($fileInfo.Length -le 10) { return }

    if ([string]::IsNullOrWhiteSpace($TargetDir)) {
        $TargetDir = Join-Path $ROOT "storage\compressed-logs"
    }
    if (-not (Test-Path $TargetDir)) {
        $null = New-Item -ItemType Directory -Path $TargetDir -Force -ErrorAction SilentlyContinue
    }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($SourcePath)
    $gzPath = Join-Path $TargetDir "$($baseName)_$($timestamp).log.gz"

    try {
        $inFileStream  = [System.IO.File]::OpenRead($SourcePath)
        $outFileStream = [System.IO.File]::Create($gzPath)
        $gzStream      = New-Object System.IO.Compression.GZipStream($outFileStream, [System.IO.Compression.CompressionLevel]::Optimal)
        $inFileStream.CopyTo($gzStream)
        $gzStream.Close()
        $outFileStream.Close()
        $inFileStream.Close()

        $gzInfo = Get-Item $gzPath
        $ratio = [Math]::Round(((($fileInfo.Length - $gzInfo.Length) / $fileInfo.Length) * 100), 1)
        Write-Ok "Log terkompresi otomatis: $($fileInfo.Name) ($($fileInfo.Length) B -> $($gzInfo.Length) B, hemat $ratio%)"
        
        # Kosongkan file log mentah agar tidak membengkak di disk
        "" | Out-File -FilePath $SourcePath -Encoding utf8 -Force -ErrorAction SilentlyContinue
    } catch {
        # Abaikan jika terkunci
    }
}

function Compress-All-LogFiles {
    Write-Status "Mengompresi dan merotasi seluruh file log aktif..." "Cyan"
    $allLogs = @($BACKEND_LOG, $FRONTEND_LOG, $PRISMA_STUDIO_LOG, $FACE_AI_LOG, $WA_GATEWAY_LOG)
    foreach ($logFile in $allLogs) {
        Compress-LogFile-Gzip -SourcePath $logFile
    }
}

# Cek apakah port sedang LISTENING (status akurat via netstat)
function Test-PortListening {
    param([int]$Port)
    $result = netstat -ano 2>$null | Select-String ":$Port\s" | Select-String "LISTENING"
    return ($null -ne $result -and $result.Count -gt 0)
}

# Cek koneksi database dengan membaca DATABASE_URL dari .env lalu test TCP
function Test-DatabaseConnection {
    $envFile = Join-Path $BACKEND_DIR ".env"
    if (-not (Test-Path $envFile)) { return $false }

    try {
        $envContent = Get-Content $envFile -Raw

        # 1. Check if using Supabase
        if ($envContent -match 'SUPABASE_URL\s*=\s*"?([^"\r\n]+)"?') {
            $supabaseUrl = $Matches[1].Trim('"').Trim("'")
            try {
                $null = Invoke-WebRequest -Uri "$supabaseUrl/auth/v1/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
                return $true
            } catch {
                if ($_.Exception.Response) { return $true }
            }
            # Fallback to TCP if HTTP fails or times out
        }

        # 2. Check traditional DATABASE_URL TCP Ping
        if (-not ($envContent -match 'DATABASE_URL\s*=\s*"?([^"\r\n]+)"?')) { return $false }
        $dbUrl = $Matches[1].Trim('"').Trim("'")

        if ($dbUrl -match '://[^@]+@([^:/]+):?(\d+)?/') {
            $dbHost = $Matches[1]
            $dbPort = if ($Matches[2]) { [int]$Matches[2] } else { 5432 }
        } else {
            return $false
        }

        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect   = $tcpClient.BeginConnect($dbHost, $dbPort, $null, $null)
        $waited    = $connect.AsyncWaitHandle.WaitOne(3000, $false)
        if ($waited -and $tcpClient.Connected) {
            $tcpClient.Close()
            return $true
        }
        $tcpClient.Close()
        return $false
    } catch {
        return $false
    }
}

# ─── STATUS ─────────────────────────────────────────────────

function Get-ProcessMode {
    param($PidFile)
    $pidVal = Get-StoredPid $PidFile
    if (-not $pidVal) { return "" }
    
    try {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $pidVal" -ErrorAction SilentlyContinue
        if ($proc) {
            $cmd = $proc.CommandLine
            if ($cmd -match "start:debug" -or $cmd -match "--debug") {
                return "(Debug)"
            } elseif ($cmd -match "NODE_ENV=preview" -or $cmd -match "preview") {
                return "(Preview)"
            } elseif ($cmd -match "NODE_ENV=staging" -or $cmd -match "staging") {
                return "(Staging)"
            } elseif ($cmd -match "NODE_ENV=fallback" -or $cmd -match "fallback") {
                return "(Fallback)"
            } elseif ($cmd -match "dev") {
                return "(Dev)"
            } elseif ($cmd -match "prod" -or $cmd -match "start") {
                return "(Prod)"
            }
        }
    } catch {}
    return "(ON)"
}

function Get-AppStatus {
    $backendRunning      = Test-PortListening 3001
    $frontendRunning     = Test-PortListening 3000
    $waGatewayRunning    = Test-PortListening 3002
    $faceAiRunning       = Test-PortListening 8089
    $supabaseRunning     = Test-PortListening 54322
    $prismaStudioRunning = Test-PortListening 51212

    Write-Host "  Mengecek status..." -ForegroundColor DarkGray
    $dbConnected = Test-DatabaseConnection
    try {
        if (-not [Console]::IsOutputRedirected) {
            $y = [Console]::CursorTop - 1
            [Console]::SetCursorPosition(0, $y)
            Write-Host (" " * 40)
            [Console]::SetCursorPosition(0, $y)
        }
    } catch {}

    $bMode = if ($backendRunning) { Get-ProcessMode $BACKEND_PID_FILE } else { "" }
    $fMode = if ($frontendRunning) { Get-ProcessMode $FRONTEND_PID_FILE } else { "" }
    if ($backendRunning -and -not $bMode) { $bMode = "(ON)" }
    if ($frontendRunning -and -not $fMode) { $fMode = "(ON)" }

    $bStatus = if ($backendRunning)      { "AKTIF $bMode".PadRight(12) } else { "MATI".PadRight(12) }
    $fStatus = if ($frontendRunning)     { "AKTIF $fMode".PadRight(12) } else { "MATI".PadRight(12) }
    $wStatus = if ($waGatewayRunning)    { "AKTIF".PadRight(12) } else { "MATI".PadRight(12) }
    $aStatus = if ($faceAiRunning)       { "AKTIF (FaceNet)".PadRight(15) } else { "STANDBY (UI)".PadRight(15) }
    $sStatus = if ($supabaseRunning)     { "AKTIF (Docker)".PadRight(14) } else { "MATI".PadRight(14) }
    $pStatus = if ($prismaStudioRunning) { "AKTIF".PadRight(12) } else { "MATI".PadRight(12) }
    $dStatus = if ($dbConnected)         { "TERHUBUNG".PadRight(12) } else { "TERPUTUS".PadRight(12) }

    $bColor = if ($backendRunning)      { "Green" } else { "Red" }
    $fColor = if ($frontendRunning)     { "Green" } else { "Red" }
    $wColor = if ($waGatewayRunning)    { "Green" } else { "Yellow" }
    $aColor = if ($faceAiRunning)       { "Green" } else { "Cyan" }
    $sColor = if ($supabaseRunning)     { "Green" } else { "Yellow" }
    $pColor = if ($prismaStudioRunning) { "Green" } else { "DarkGray" }
    $dColor = if ($dbConnected)         { "Green" } else { "Red" }

    Write-Host "  +--------------------+--------------------------+"
    Write-Host "  |   STATUS LAYANAN SIMASMUH                     |"
    Write-Host "  +--------------------+--------------------------+"
    Write-Host "  | Frontend (Web)     | " -NoNewline
    Write-Host ($fStatus + " :3000   |") -ForegroundColor $fColor
    Write-Host "  | Backend (API)      | " -NoNewline
    Write-Host ($bStatus + " :3001   |") -ForegroundColor $bColor
    Write-Host "  | WhatsApp Gateway   | " -NoNewline
    Write-Host ($wStatus + " :3002   |") -ForegroundColor $wColor
    Write-Host "  | AI Face Attendance | " -NoNewline
    Write-Host ($aStatus + " :8089 |") -ForegroundColor $aColor
    Write-Host "  | Supabase (Docker)  | " -NoNewline
    Write-Host ($sStatus + " :54323 |") -ForegroundColor $sColor
    Write-Host "  | Prisma Studio (ERD)| " -NoNewline
    Write-Host ($pStatus + " :51212 |") -ForegroundColor $pColor
    Write-Host "  | Database Ping (DB) | " -NoNewline
    Write-Host ($dStatus + "         |") -ForegroundColor $dColor
    Write-Host "  +--------------------+--------------------------+"
    Write-Host ""
}

# ─── STOP ────────────────────────────────────────────────────

function Stop-Apps {
    Write-Status "Menghentikan semua proses aplikasi (Frontend, Backend, WhatsApp Gateway, AI Face, Prisma Studio)..." "Yellow"

    $bPid = Get-StoredPid $BACKEND_PID_FILE
    $fPid = Get-StoredPid $FRONTEND_PID_FILE
    $wPid = Get-StoredPid $WA_GATEWAY_PID_FILE
    $pPid = Get-StoredPid $PRISMA_STUDIO_PID_FILE
    $aPid = Get-StoredPid $FACE_AI_PID_FILE

    if ($bPid) {
        Stop-ProcessById $bPid
        Remove-Item $BACKEND_PID_FILE -ErrorAction SilentlyContinue
    }
    if ($fPid) {
        Stop-ProcessById $fPid
        Remove-Item $FRONTEND_PID_FILE -ErrorAction SilentlyContinue
    }
    if ($wPid) {
        Stop-ProcessById $wPid
        Remove-Item $WA_GATEWAY_PID_FILE -ErrorAction SilentlyContinue
    }
    if ($pPid) {
        Stop-ProcessById $pPid
        Remove-Item $PRISMA_STUDIO_PID_FILE -ErrorAction SilentlyContinue
    }
    if ($aPid) {
        Stop-ProcessById $aPid
        Remove-Item $FACE_AI_PID_FILE -ErrorAction SilentlyContinue
    }

    Stop-PortProcess 3001
    Stop-PortProcess 3000
    Stop-PortProcess 8089
    Stop-PortProcess 8005
    Stop-PortProcess 51212

    Start-Sleep -Seconds 1
    Compress-All-LogFiles
    Write-Ok "Semua proses aplikasi berhasil dinonaktifkan dan log terkompresi rapi."
}

function Stop-FaceAiService {
    Write-Status "Menonaktifkan Face AI Microservice (port 8089)..." "Yellow"
    $aPid = Get-StoredPid $FACE_AI_PID_FILE
    if ($aPid) {
        Stop-ProcessById $aPid
        Remove-Item $FACE_AI_PID_FILE -ErrorAction SilentlyContinue
    }
    Stop-PortProcess 8089
    Stop-PortProcess 8005
    Start-Sleep -Seconds 1
    Write-Ok "Face AI Service berhasil dinonaktifkan."
}

function Stop-BackendOnly {
    Write-Status "Menonaktifkan mode Backend (port 3001)..." "Yellow"
    $bPid = Get-StoredPid $BACKEND_PID_FILE
    if ($bPid) {
        Stop-ProcessById $bPid
        Remove-Item $BACKEND_PID_FILE -ErrorAction SilentlyContinue
    }
    Stop-PortProcess 3001
    Start-Sleep -Seconds 1
    Write-Ok "Backend berhasil dinonaktifkan."
}

function Stop-FrontendOnly {
    Write-Status "Menonaktifkan mode Frontend (port 3000)..." "Yellow"
    $fPid = Get-StoredPid $FRONTEND_PID_FILE
    if ($fPid) {
        Stop-ProcessById $fPid
        Remove-Item $FRONTEND_PID_FILE -ErrorAction SilentlyContinue
    }
    Stop-PortProcess 3000
    Start-Sleep -Seconds 1
    Write-Ok "Frontend berhasil dinonaktifkan."
}

function Stop-PrismaStudio {
    Write-Status "Menonaktifkan Prisma Studio (port 51212)..." "Yellow"
    $pPid = Get-StoredPid $PRISMA_STUDIO_PID_FILE
    if ($pPid) {
        Stop-ProcessById $pPid
        Remove-Item $PRISMA_STUDIO_PID_FILE -ErrorAction SilentlyContinue
    }
    Stop-PortProcess 51212
    Start-Sleep -Seconds 1
    Write-Ok "Prisma Studio berhasil dinonaktifkan."
}

function Stop-ModeMenu {
    Write-Banner
    Write-Host "  +=========================================+" -ForegroundColor Yellow
    Write-Host "  |    MENONAKTIFKAN MODE / STOP APLIKASI   |" -ForegroundColor Yellow
    Write-Host "  +=========================================+" -ForegroundColor Yellow
    Write-Host "  |  [1] Menonaktifkan Backend saja (3001)  |" -ForegroundColor White
    Write-Host "  |  [2] Menonaktifkan Frontend saja (3000) |" -ForegroundColor White
    Write-Host "  |  [3] Menonaktifkan Prisma Studio (51212)|" -ForegroundColor White
    Write-Host "  |  [4] Menonaktifkan Mode Development     |" -ForegroundColor White
    Write-Host "  |  [5] Menonaktifkan Mode Production      |" -ForegroundColor White
    Write-Host "  |  [6] Menonaktifkan Mode Testing/Debug   |" -ForegroundColor White
    Write-Host "  |  [7] Menonaktifkan Mode Preview         |" -ForegroundColor White
    Write-Host "  |  [8] Menonaktifkan Mode Staging         |" -ForegroundColor White
    Write-Host "  |  [9] Menonaktifkan Semua Mode (Full Stop)|" -ForegroundColor Red
    Write-Host "  |  [0] Batal / Kembali ke Menu Utama     |" -ForegroundColor White
    Write-Host "  +=========================================+" -ForegroundColor Yellow
    Write-Host ""
    $sChoice = Read-Host "  Pilih opsi penonaktifan"

    switch ($sChoice) {
        "1" { Stop-BackendOnly }
        "2" { Stop-FrontendOnly }
        "3" { Stop-PrismaStudio }
        "4" { Stop-Apps }
        "5" { Stop-Apps }
        "6" { Stop-Apps }
        "7" { Stop-Apps }
        "8" { Stop-Apps }
        "9" { Stop-Apps }
        "0" { return }
        default { Write-Err "Pilihan tidak valid." }
    }
}

# ─── BUILD ───────────────────────────────────────────────────

function Build-Backend {
    Write-Status "Build Backend (nest build)..." "Magenta"
    $proc = Start-Process -FilePath "cmd.exe" `
                          -ArgumentList "/c cd /d `"$BACKEND_DIR`" && npm run build 2>&1" `
                          -WorkingDirectory $BACKEND_DIR `
                          -NoNewWindow -Wait -PassThru
    if ($proc.ExitCode -ne 0) {
        Write-Err "Build Backend GAGAL (exit code $($proc.ExitCode))."
        return $false
    }
    Write-Ok "Build Backend selesai."
    return $true
}

function Build-Frontend {
    Write-Status "Build Frontend (next build)..." "Magenta"
    Write-Info  "Proses ini mungkin memerlukan beberapa menit..."
    $proc = Start-Process -FilePath "cmd.exe" `
                          -ArgumentList "/c cd /d `"$FRONTEND_DIR`" && npm run build 2>&1" `
                          -WorkingDirectory $FRONTEND_DIR `
                          -NoNewWindow -Wait -PassThru
    if ($proc.ExitCode -ne 0) {
        Write-Err "Build Frontend GAGAL (exit code $($proc.ExitCode))."
        return $false
    }
    Write-Ok "Build Frontend selesai."
    return $true
}

# ─── START ───────────────────────────────────────────────────

function Start-Backend {
    param([string]$Mode = "Production")
    
    if ($Mode -eq "Development") {
        Write-Status "Menjalankan Backend DEVELOPMENT (port 3001)..." "Cyan"
        $cmdLine = "/c set NODE_OPTIONS=--max-old-space-size=1024&& npm run start:dev >> `"$BACKEND_LOG`" 2>&1"
    } elseif ($Mode -eq "Debug" -or $Mode -eq "Testing") {
        Write-Status "Menjalankan Backend TESTING / DEBUG (port 3001, debug port 9229)..." "Cyan"
        Write-Info "Node.js Debugger aktif di 127.0.0.1:9229 (Attach via Chrome chrome://inspect atau VS Code)"
        $cmdLine = "/c set NODE_OPTIONS=--max-old-space-size=1024&& npm run start:debug >> `"$BACKEND_LOG`" 2>&1"
    } elseif ($Mode -eq "Preview") {
        Write-Status "Menjalankan Backend PREVIEW (port 3001)..." "Cyan"
        $cmdLine = "/c set NODE_ENV=preview&& set NODE_OPTIONS=--max-old-space-size=1024&& npm run start:dev >> `"$BACKEND_LOG`" 2>&1"
    } elseif ($Mode -eq "Staging") {
        Write-Status "Menjalankan Backend STAGING (port 3001)..." "Cyan"
        $cmdLine = "/c set NODE_ENV=staging&& set NODE_OPTIONS=--max-old-space-size=1024&& npm run start:dev >> `"$BACKEND_LOG`" 2>&1"
    } elseif ($Mode -eq "Fallback") {
        Write-Status "Menjalankan Backend FALLBACK MODE (port 3001)..." "Yellow"
        Write-Info "Menggunakan konfigurasi aman untuk menghindari error server..."
        $cmdLine = "/c set NODE_ENV=fallback&& set NODE_OPTIONS=--max-old-space-size=1024&& npm run start:dev >> `"$BACKEND_LOG`" 2>&1"
    } else {
        Write-Status "Menjalankan Backend PRODUCTION (port 3001)..." "Cyan"
        $distMain = Join-Path $BACKEND_DIR "dist\src\main.js"
        $altDistMain = Join-Path $BACKEND_DIR "dist\main.js"
        if ((-not (Test-Path $distMain)) -and (-not (Test-Path $altDistMain))) {
            Write-Info "dist/src/main.js tidak ditemukan. Menjalankan build terlebih dahulu..."
            $built = Build-Backend
            if (-not $built) { return $false }
        }
        $cmdLine = "/c set NODE_OPTIONS=--max-old-space-size=1024&& npm run start:prod >> `"$BACKEND_LOG`" 2>&1"
    }

    # Reset log lama secara aman
    try { "" | Out-File -FilePath $BACKEND_LOG -Encoding utf8 -Force -ErrorAction SilentlyContinue } catch {}
    $proc = Start-Process -FilePath "cmd.exe" `
                          -ArgumentList $cmdLine `
                          -WorkingDirectory $BACKEND_DIR `
                          -NoNewWindow -PassThru

    # Simpan PID
    $proc.Id | Set-Content $BACKEND_PID_FILE

    # Tunggu sampai siap (max 60 detik)
    $timeout = 60
    $elapsed = 0
    Write-Host "  " -NoNewline
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 1
        $elapsed++
        Write-Host "." -NoNewline -ForegroundColor Cyan

        if (-not (Test-ProcessRunning $proc.Id)) {
            Write-Host ""
            Write-Err "Backend process berhenti tiba-tiba."
            Write-Info "Periksa log: $BACKEND_LOG"
            return $false
        }

        if (Test-Path $BACKEND_LOG) {
            $log = Get-Content $BACKEND_LOG -Raw -ErrorAction SilentlyContinue
            if ($log -match "Nest application successfully started|Application is running on|Debugger listening") {
                Write-Host ""
                Write-Ok "Backend aktif di port 3001"
                return $true
            }
        }
    }

    Write-Host ""
    $listening = netstat -ano 2>$null | Select-String ":3001\s" | Select-String "LISTENING"
    if ($listening) {
        Write-Ok "Backend aktif di port 3001 (terdeteksi via port check)"
        return $true
    }

    Write-Err "Backend gagal dimulai dalam $timeout detik."
    Write-Info "Periksa log: $BACKEND_LOG"
    return $false
}

function Start-Frontend {
    param([string]$Mode = "Production")
    
    if ($Mode -eq "Development") {
        Write-Status "Menjalankan Frontend DEVELOPMENT (port 3000)..." "Cyan"
        $cmdLine = "/c set NODE_OPTIONS=--max-old-space-size=1536&& npm run dev >> `"$FRONTEND_LOG`" 2>&1"
    } elseif ($Mode -eq "Preview") {
        Write-Status "Menjalankan Frontend PREVIEW (port 3000)..." "Cyan"
        $cmdLine = "/c set NODE_ENV=preview&& set NODE_OPTIONS=--max-old-space-size=1536&& npm run dev >> `"$FRONTEND_LOG`" 2>&1"
    } elseif ($Mode -eq "Staging") {
        Write-Status "Menjalankan Frontend STAGING (port 3000)..." "Cyan"
        $cmdLine = "/c set NODE_ENV=staging&& set NODE_OPTIONS=--max-old-space-size=1536&& npm run dev >> `"$FRONTEND_LOG`" 2>&1"
    } elseif ($Mode -eq "Fallback") {
        Write-Status "Menjalankan Frontend FALLBACK MODE (port 3000)..." "Yellow"
        $cmdLine = "/c set NODE_OPTIONS=--max-old-space-size=1536&& npm run dev >> `"$FRONTEND_LOG`" 2>&1"
    } else {
        Write-Status "Menjalankan Frontend PRODUCTION (port 3000)..." "Cyan"
        $buildManifest = Join-Path $FRONTEND_DIR ".next\build-manifest.json"
        if (-not (Test-Path $buildManifest)) {
            Write-Info ".next/build-manifest.json tidak ditemukan. Menjalankan build terlebih dahulu..."
            $built = Build-Frontend
            if (-not $built) { return $false }
        }
        $cmdLine = "/c set NODE_OPTIONS=--max-old-space-size=1536&& npm run start >> `"$FRONTEND_LOG`" 2>&1"
    }

    # Reset log lama secara aman
    try { "" | Out-File -FilePath $FRONTEND_LOG -Encoding utf8 -Force -ErrorAction SilentlyContinue } catch {}
    $proc = Start-Process -FilePath "cmd.exe" `
                          -ArgumentList $cmdLine `
                          -WorkingDirectory $FRONTEND_DIR `
                          -NoNewWindow -PassThru

    # Simpan PID
    $proc.Id | Set-Content $FRONTEND_PID_FILE

    # Tunggu sampai siap (max 60 detik)
    $timeout = 60
    $elapsed = 0
    Write-Host "  " -NoNewline
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 1
        $elapsed++
        Write-Host "." -NoNewline -ForegroundColor Cyan

        if (-not (Test-ProcessRunning $proc.Id)) {
            Write-Host ""
            Write-Err "Frontend process berhenti tiba-tiba."
            Write-Info "Periksa log: $FRONTEND_LOG"
            return $false
        }

        if (Test-Path $FRONTEND_LOG) {
            $log = Get-Content $FRONTEND_LOG -Raw -ErrorAction SilentlyContinue
            if ($log -match "Ready in|started server on|Local:\s+http|Listening on") {
                Write-Host ""
                Write-Ok "Frontend aktif di port 3000 -> http://localhost:3000"
                return $true
            }
        }
    }

    Write-Host ""
    $listening = netstat -ano 2>$null | Select-String ":3000\s" | Select-String "LISTENING"
    if ($listening) {
        Write-Ok "Frontend aktif di port 3000 (terdeteksi via port check)"
        return $true
    }

    Write-Err "Frontend gagal dimulai dalam $timeout detik."
    Write-Info "Periksa log: $FRONTEND_LOG"
    return $false
}

function Start-SupabaseDocker {
    Write-Status "Memeriksa status Supabase (Docker Desktop)..." "Cyan"
    $dbListening = Test-PortListening 54322
    if ($dbListening) {
        Write-Ok "Supabase (Docker) aktif di port 54322 (DB) & 54323 (Studio)"
        return $true
    }

    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerCmd) {
        Write-Info "Docker CLI tidak terdeteksi. Lewati startup otomatis Supabase."
        return $false
    }

    Write-Status "Menjalankan Supabase di Docker Desktop (npx supabase start)..." "Yellow"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$ROOT`" && npx supabase start 2>&1" -NoNewWindow -Wait
    
    $dbListening = Test-PortListening 54322
    if ($dbListening) {
        Write-Ok "Supabase (Docker) berhasil dijalankan!"
        return $true
    }
    Write-Info "Supabase Docker belum aktif atau sedang proses startup. Pastikan Docker Desktop berjalan."
    return $false
}

function Start-PrismaStudio {
    Write-Status "Menjalankan Prisma Studio (port 51212)..." "Cyan"
    $pListen = Test-PortListening 51212
    if ($pListen) {
        Write-Ok "Prisma Studio sudah aktif -> http://localhost:51212"
        return $true
    }

    try { "" | Out-File -FilePath $PRISMA_STUDIO_LOG -Encoding utf8 -Force } catch {}
    $cmdLine = "/c npx prisma studio --port 51212 --browser none >> `"$PRISMA_STUDIO_LOG`" 2>&1"
    $proc = Start-Process -FilePath "cmd.exe" `
                          -ArgumentList $cmdLine `
                          -WorkingDirectory $BACKEND_DIR `
                          -NoNewWindow -PassThru

    $proc.Id | Set-Content $PRISMA_STUDIO_PID_FILE

    Start-Sleep -Seconds 2
    if (Test-PortListening 51212) {
        Write-Ok "Prisma Studio aktif -> http://localhost:51212"
        return $true
    }
    Write-Info "Prisma Studio berjalan di latar belakang (port 51212)."
    return $true
}

function Start-FaceAiService {
    Write-Status "Menjalankan Face Attendance AI Service (Python FaceNet di port 8089)..." "Cyan"
    $aListen = Test-PortListening 8089
    if ($aListen) {
        Write-Ok "Face AI Service sudah aktif -> http://localhost:8089"
        return $true
    }

    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCmd) {
        Write-Info "Python CLI tidak ditemukan. Lewati startup otomatis Face AI."
        return $false
    }

    try { "" | Out-File -FilePath $FACE_AI_LOG -Encoding utf8 -Force } catch {}
    $cmdLine = "/c python main.py >> `"$FACE_AI_LOG`" 2>&1"
    $proc = Start-Process -FilePath "cmd.exe" `
                          -ArgumentList $cmdLine `
                          -WorkingDirectory $FACE_AI_DIR `
                          -NoNewWindow -PassThru

    $proc.Id | Set-Content $FACE_AI_PID_FILE

    Start-Sleep -Seconds 2
    if (Test-PortListening 8089) {
        Write-Ok "Face AI Service aktif -> http://localhost:8089"
        return $true
    }
    Write-Info "Face AI Service berjalan di latar belakang (port 8089)."
    return $true
}

function Start-WhatsAppGateway {
    Write-Status "Menjalankan WhatsApp Gateway Service (Baileys di port 3002)..." "Cyan"
    $wListen = Test-PortListening 3002
    if ($wListen) {
        Write-Ok "WhatsApp Gateway sudah aktif -> http://localhost:3002"
        return $true
    }

    try { "" | Out-File -FilePath $WA_GATEWAY_LOG -Encoding utf8 -Force } catch {}
    $cmdLine = "/c npm start >> `"$WA_GATEWAY_LOG`" 2>&1"
    $proc = Start-Process -FilePath "cmd.exe" `
                          -ArgumentList $cmdLine `
                          -WorkingDirectory $WA_GATEWAY_DIR `
                          -NoNewWindow -PassThru

    $proc.Id | Set-Content $WA_GATEWAY_PID_FILE

    Start-Sleep -Seconds 2
    if (Test-PortListening 3002) {
        Write-Ok "WhatsApp Gateway aktif -> http://localhost:3002"
        return $true
    }
    Write-Info "WhatsApp Gateway berjalan di latar belakang (port 3002)."
    return $true
}

function Start-Apps {
    param([string]$Mode = "Production")
    
    $npmTest = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npmTest) {
        Write-Err "npm tidak ditemukan! Pastikan Node.js sudah terinstal dan ada di PATH."
        return
    }
    Write-Info "npm ditemukan: $($npmTest.Source)"
    Write-Host ""

    # 1. Pastikan Supabase di Docker Desktop berjalan
    $null = Start-SupabaseDocker
    Write-Host ""

    # 2. Jalankan WhatsApp Gateway
    $null = Start-WhatsAppGateway
    Write-Host ""

    # 3. Jalankan Backend
    $backendOk = Start-Backend -Mode $Mode
    if (-not $backendOk) {
        Write-Err "Gagal memulai Backend. Periksa log di: $BACKEND_LOG"
        return
    }

    # 4. Jalankan Frontend
    Write-Host ""
    $frontendOk = Start-Frontend -Mode $Mode
    if (-not $frontendOk) {
        Write-Err "Gagal memulai Frontend. Periksa log di: $FRONTEND_LOG"
        return
    }

    # 5. Jalankan Prisma Studio
    Write-Host ""
    $null = Start-PrismaStudio

    Write-Host ""
    Write-Ok "=========================================================="
    Write-Ok " SIMASMUH + SUPABASE + PRISMA STUDIO + WA GATEWAY AKTIF!"
    Write-Ok " - Aplikasi Web        : http://localhost:3000"
    Write-Ok " - Backend API         : http://localhost:3001"
    Write-Ok " - WhatsApp Gateway    : http://localhost:3002"
    Write-Ok " - Face AI Service     : On-Demand via Dashboard (Port 8089)"
    Write-Ok " - Prisma Studio       : http://localhost:51212"
    Write-Ok " - Supabase Studio     : http://localhost:54323"
    Write-Ok "=========================================================="
    Write-Host ""
}

# ─── BUILD MANUAL ─────────────────────────────────────────────

function Start-BuildOnly {
    $npmTest = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npmTest) {
        Write-Err "npm tidak ditemukan!"
        return
    }
    Write-Host ""
    Write-Info "Pilih yang ingin di-build:"
    Write-Host "  [1] Backend saja"
    Write-Host "  [2] Frontend saja"
    Write-Host "  [3] Keduanya"
    Write-Host "  [0] Batal"
    Write-Host ""
    $ch = Read-Host "  Pilihan"
    Write-Host ""

    switch ($ch) {
        "1" { Build-Backend }
        "2" { Build-Frontend }
        "3" {
            $b = Build-Backend
            if ($b) { Build-Frontend }
        }
        "0" { return }
        default { Write-Err "Pilihan tidak valid." }
    }
}

# ─── LOGS ────────────────────────────────────────────────────

function Show-Logs {
    Write-Banner
    Write-Host "  Pilih log yang ingin dilihat:" -ForegroundColor White
    Write-Host "  [1] Log Backend       ($BACKEND_LOG)"
    Write-Host "  [2] Log Frontend      ($FRONTEND_LOG)"
    Write-Host "  [3] Log Prisma Studio ($PRISMA_STUDIO_LOG)"
    Write-Host "  [0] Kembali"
    Write-Host ""
    $choice = Read-Host "  Pilihan"

    switch ($choice) {
        "1" {
            if (Test-Path $BACKEND_LOG) {
                Write-Host ""
                Write-Host "  === LOG BACKEND (50 baris terakhir) ===" -ForegroundColor Cyan
                Get-Content $BACKEND_LOG -Tail 50 | ForEach-Object { Write-Host "  $_" }
            } else {
                Write-Err "Log backend tidak ditemukan."
            }
        }
        "2" {
            if (Test-Path $FRONTEND_LOG) {
                Write-Host ""
                Write-Host "  === LOG FRONTEND (50 baris terakhir) ===" -ForegroundColor Cyan
                Get-Content $FRONTEND_LOG -Tail 50 | ForEach-Object { Write-Host "  $_" }
            } else {
                Write-Err "Log frontend tidak ditemukan."
            }
        }
        "3" {
            if (Test-Path $PRISMA_STUDIO_LOG) {
                Write-Host ""
                Write-Host "  === LOG PRISMA STUDIO (50 baris terakhir) ===" -ForegroundColor Cyan
                Get-Content $PRISMA_STUDIO_LOG -Tail 50 | ForEach-Object { Write-Host "  $_" }
            } else {
                Write-Err "Log Prisma Studio tidak ditemukan."
            }
        }
    }

    Write-Host ""
    Read-Host "  Tekan ENTER untuk kembali ke menu"
}

# ─── TROUBLESHOOT ─────────────────────────────────────────────

function Start-Troubleshoot {
    Write-Banner
    Write-Host "  +=========================================+" -ForegroundColor Yellow
    Write-Host "  |         TROUBLESHOOT / PERBAIKAN        |" -ForegroundColor Yellow
    Write-Host "  +=========================================+" -ForegroundColor Yellow
    Write-Host "  |  [1] Matikan Paksa Port 3000 & 3001 & 51212|" -ForegroundColor White
    Write-Host "  |  [2] Hapus Cache .next (Frontend)       |" -ForegroundColor White
    Write-Host "  |  [3] Hapus dist (Backend)               |" -ForegroundColor White
    Write-Host "  |  [4] Bersihkan Log                      |" -ForegroundColor White
    Write-Host "  |  [5] Perbaiki Semuanya (Full Reset)     |" -ForegroundColor Red
    Write-Host "  |  [0] Kembali                            |" -ForegroundColor White
    Write-Host "  +=========================================+" -ForegroundColor Yellow
    Write-Host ""
    $tChoice = Read-Host "  Pilihan"

    switch ($tChoice) {
        "1" {
            Write-Status "Mematikan proses di port 3000, 3001, dan 51212..." "Yellow"
            Stop-PortProcess 3000
            Stop-PortProcess 3001
            Stop-PortProcess 51212
            Write-Ok "Port dibersihkan."
        }
        "2" {
            Write-Status "Menghapus cache .next..." "Yellow"
            $nextDir = Join-Path $FRONTEND_DIR ".next"
            if (Test-Path $nextDir) {
                Remove-Item -Recurse -Force $nextDir -ErrorAction SilentlyContinue
                Write-Ok "Cache .next berhasil dihapus."
            } else {
                Write-Info "Cache .next tidak ditemukan."
            }
        }
        "3" {
            Write-Status "Menghapus folder dist backend..." "Yellow"
            $distDir = Join-Path $BACKEND_DIR "dist"
            if (Test-Path $distDir) {
                Remove-Item -Recurse -Force $distDir -ErrorAction SilentlyContinue
                Write-Ok "Folder dist berhasil dihapus."
            } else {
                Write-Info "Folder dist tidak ditemukan."
            }
        }
        "4" {
            Write-Status "Mengompresi dan mengarsipkan log sebelum dibersihkan..." "Yellow"
            Compress-All-LogFiles
            if (Test-Path $BACKEND_LOG) { "" | Out-File -FilePath $BACKEND_LOG -Encoding utf8 -Force -ErrorAction SilentlyContinue }
            if (Test-Path $FRONTEND_LOG) { "" | Out-File -FilePath $FRONTEND_LOG -Encoding utf8 -Force -ErrorAction SilentlyContinue }
            if (Test-Path $PRISMA_STUDIO_LOG) { "" | Out-File -FilePath $PRISMA_STUDIO_LOG -Encoding utf8 -Force -ErrorAction SilentlyContinue }
            if (Test-Path $FACE_AI_LOG) { "" | Out-File -FilePath $FACE_AI_LOG -Encoding utf8 -Force -ErrorAction SilentlyContinue }
            if (Test-Path $WA_GATEWAY_LOG) { "" | Out-File -FilePath $WA_GATEWAY_LOG -Encoding utf8 -Force -ErrorAction SilentlyContinue }
            Write-Ok "Log berhasil dikompresi ke storage/compressed-logs dan file mentah direset."
        }
        "5" {
            Write-Status "Melakukan Full Reset..." "Red"
            Stop-Apps
            Compress-All-LogFiles
            $nextDir = Join-Path $FRONTEND_DIR ".next"
            $distDir = Join-Path $BACKEND_DIR "dist"
            if (Test-Path $nextDir) { Remove-Item -Recurse -Force $nextDir -ErrorAction SilentlyContinue }
            if (Test-Path $distDir) { Remove-Item -Recurse -Force $distDir -ErrorAction SilentlyContinue }
            if (Test-Path $BACKEND_LOG) { "" | Out-File -FilePath $BACKEND_LOG -Encoding utf8 -Force -ErrorAction SilentlyContinue }
            if (Test-Path $FRONTEND_LOG) { "" | Out-File -FilePath $FRONTEND_LOG -Encoding utf8 -Force -ErrorAction SilentlyContinue }
            if (Test-Path $PRISMA_STUDIO_LOG) { "" | Out-File -FilePath $PRISMA_STUDIO_LOG -Encoding utf8 -Force -ErrorAction SilentlyContinue }
            Write-Ok "Reset selesai! Silakan build ulang atau jalankan aplikasi."
        }
    }
}

# ─── SETUP .ENV ───────────────────────────────────────────────

function Start-SetupEnv {
    Write-Banner
    Write-Status "Memeriksa dan membuat file .env..." "Cyan"
    
    $beEnvExample = Join-Path $BACKEND_DIR ".env.example"
    $beEnv        = Join-Path $BACKEND_DIR ".env"
    $feEnvExample = Join-Path $FRONTEND_DIR ".env.example"
    $feEnv        = Join-Path $FRONTEND_DIR ".env"

    if ((-not (Test-Path $beEnv)) -and (Test-Path $beEnvExample)) {
        Copy-Item $beEnvExample $beEnv
        Write-Ok "Dibuat: backend/.env (dari .env.example)"
    } else {
        Write-Info "backend/.env sudah ada, tidak ditimpa."
    }

    if ((-not (Test-Path $feEnv)) -and (Test-Path $feEnvExample)) {
        Copy-Item $feEnvExample $feEnv
        Write-Ok "Dibuat: frontend/.env (dari .env.example)"
    } else {
        Write-Info "frontend/.env sudah ada, tidak ditimpa."
    }

    Write-Host ""
    Write-Ok "Setup .env selesai."
}

# ─── INSTALL DEPENDENCIES ─────────────────────────────────────

function Start-InstallDependencies {
    Write-Banner
    Write-Status "Menginstall dependencies Backend (npm)..." "Cyan"
    $procBe = Start-Process -FilePath "cmd.exe" `
                            -ArgumentList "/c cd /d `"$BACKEND_DIR`" && npm install 2>&1" `
                            -WorkingDirectory $BACKEND_DIR `
                            -NoNewWindow -Wait -PassThru
    if ($procBe.ExitCode -eq 0) {
        Write-Ok "Dependencies Backend selesai diinstall."
    } else {
        Write-Err "Gagal menginstall dependencies Backend."
    }

    Write-Host ""
    Write-Status "Menginstall dependencies Frontend (npm)..." "Cyan"
    $procFe = Start-Process -FilePath "cmd.exe" `
                            -ArgumentList "/c cd /d `"$FRONTEND_DIR`" && npm install 2>&1" `
                            -WorkingDirectory $FRONTEND_DIR `
                            -NoNewWindow -Wait -PassThru
    if ($procFe.ExitCode -eq 0) {
        Write-Ok "Dependencies Frontend selesai diinstall."
    } else {
        Write-Err "Gagal menginstall dependencies Frontend."
    }

    Write-Host ""
    Write-Status "Menginstall dependencies Face Attendance AI FaceNet (Python pip)..." "Cyan"
    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCmd) {
        $reqFile = Join-Path $FACE_AI_DIR "requirements.txt"
        $procPy = Start-Process -FilePath "cmd.exe" `
                                -ArgumentList "/c cd /d `"$FACE_AI_DIR`" && pip install -r `"$reqFile`" 2>&1" `
                                -WorkingDirectory $FACE_AI_DIR `
                                -NoNewWindow -Wait -PassThru
        if ($procPy.ExitCode -eq 0) {
            Write-Ok "Dependencies Python AI Face Attendance selesai diinstall."
        } else {
            Write-Info "Instalasi pip selesai."
        }
    } else {
        Write-Info "Python belum terpasang di sistem. Lewati instalasi pip."
    }

    Write-Host ""
    Write-Ok "Instalasi semua dependencies selesai!"
}

# ─── SETUP ENVIRONMENT BARU ───────────────────────────────────

function Start-EnvironmentSetup {
    Write-Banner
    Write-Host "  +==================================================+" -ForegroundColor Green
    Write-Host "  |   PERSIAPAN LINGKUNGAN / SETUP DEVICE BARU       |" -ForegroundColor Green
    Write-Host "  +==================================================+" -ForegroundColor Green
    Write-Host "  Otomatis menyiapkan SIMASMUH pada perangkat/direktori baru." -ForegroundColor White
    Write-Host ""

    # 1. Setup .env
    Write-Status "1/6. Menyiapkan berkas konfigurasi .env..." "Cyan"
    Start-SetupEnv

    # 2. Check Node & NPM
    Write-Status "2/6. Memeriksa versi Node.js dan npm..." "Cyan"
    try {
        $nodeVer = & node -v 2>$null
        $npmVer  = & npm -v 2>$null
        Write-Ok "Node.js: $nodeVer | npm: $npmVer"
    } catch {
        Write-Err "Node.js atau npm tidak terdeteksi!"
    }

    # 3. Install Dependencies
    Write-Status "3/6. Menginstall/memperbarui Dependencies (Backend & Frontend)..." "Cyan"
    Start-InstallDependencies

    # 4. Generate Prisma Client
    Write-Status "4/6. Menyesuaikan Prisma Client engine untuk sistem lokal..." "Cyan"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$BACKEND_DIR`" && npx prisma generate 2>&1" -NoNewWindow -Wait
    Write-Ok "Prisma Client siap digunakan!"

    # 5. Inisialisasi External Storage
    Write-Status "5/6. Menyiapkan folder penyimpanan foto terisolasi (simasmuh_storage)..." "Cyan"
    $initStorageCode = "try { require('./dist/src/modules/core/config/storage.config').initStorageDirectories(); console.log('Storage initialized.'); } catch (e) { console.log('Storage init fallback:', e.message); }"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$BACKEND_DIR`" && node -e `"$initStorageCode`" 2>&1" -NoNewWindow -Wait
    Write-Ok "Direktori external storage siap!"

    # 6. Verifikasi Koneksi Database
    Write-Status "6/6. Memeriksa koneksi database..." "Cyan"
    $dbOk = Test-DatabaseConnection
    if ($dbOk) {
        Write-Ok "Database terhubung dengan sukses!"
    } else {
        Write-Info "Database belum dapat dijangkau. Pastikan DATABASE_URL / SUPABASE_URL di backend/.env sudah sesuai."
    }

    Write-Host ""
    Write-Ok "Persiapan lingkungan selesai! Anda kini siap menjalankan aplikasi."
}

# ─── KONFIRMASI ───────────────────────────────────────────────

function Confirm-Action {
    param($Message)
    Write-Host ""
    Write-Host "  [!] $Message" -ForegroundColor Yellow
    $confirm = Read-Host "  Ketik 'ya' untuk konfirmasi"
    return ($confirm -ieq "ya")
}

# ─── TESTING SUITE ───────────────────────────────────────────

function Start-TestingSuite {
    while ($true) {
        Write-Banner
        Write-Host "  +=========================================+" -ForegroundColor Yellow
        Write-Host "  |      SUITE TESTING & DIAGNOSTIK        |" -ForegroundColor Yellow
        Write-Host "  +=========================================+" -ForegroundColor Yellow
        Write-Host "  |  [1] Jalankan Backend Unit Tests        |" -ForegroundColor White
        Write-Host "  |  [2] Jalankan Backend E2E Tests         |" -ForegroundColor White
        Write-Host "  |  [3] Jalankan Coverage Report           |" -ForegroundColor White
        Write-Host "  |  [4] Jalankan Frontend Linter           |" -ForegroundColor White
        Write-Host "  |  [5] Diagnostik Status & Koneksi        |" -ForegroundColor White
        Write-Host "  |  [0] Kembali ke Menu Utama              |" -ForegroundColor White
        Write-Host "  +=========================================+" -ForegroundColor Yellow
        Write-Host ""
        $tChoice = Read-Host "  Pilih pengujian"

        switch ($tChoice) {
            "1" {
                Write-Status "Jalankan Backend Unit Tests (jest)..." "Cyan"
                Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$BACKEND_DIR`" && npm run test 2>&1" -NoNewWindow -Wait
                Read-Host "  Tekan ENTER untuk kembali"
            }
            "2" {
                Write-Status "Jalankan Backend E2E Tests (jest e2e)..." "Cyan"
                Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$BACKEND_DIR`" && npm run test:e2e 2>&1" -NoNewWindow -Wait
                Read-Host "  Tekan ENTER untuk kembali"
            }
            "3" {
                Write-Status "Jalankan Test Coverage Report..." "Cyan"
                Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$BACKEND_DIR`" && npm run test:cov 2>&1" -NoNewWindow -Wait
                Read-Host "  Tekan ENTER untuk kembali"
            }
            "4" {
                Write-Status "Jalankan Frontend Lint..." "Cyan"
                Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$FRONTEND_DIR`" && npm run lint 2>&1" -NoNewWindow -Wait
                Read-Host "  Tekan ENTER untuk kembali"
            }
            "5" {
                Write-Banner
                Write-Status "Diagnostik Lengkap SIMASMUH..." "Cyan"
                $dbConnected = Test-DatabaseConnection
                Write-Host "  Database Status    : " -NoNewline
                if ($dbConnected) { Write-Ok "TERHUBUNG" } else { Write-Err "TERPUTUS" }

                $bListen = Test-PortListening 3001
                Write-Host "  Port 3001 (Backend): " -NoNewline
                if ($bListen) { Write-Ok "AKTIF" } else { Write-Info "MATI" }

                $fListen = Test-PortListening 3000
                Write-Host "  Port 3000 (Frontend): " -NoNewline
                if ($fListen) { Write-Ok "AKTIF" } else { Write-Info "MATI" }
                Write-Host ""
                Read-Host "  Tekan ENTER untuk kembali"
            }
            "0" { break }
            default { Write-Err "Pilihan tidak valid." }
        }
    }
}

# ─── DIRECT CLI EXECUTION ─────────────────────────────────────

if ($Mode -ne "") {
    Write-Banner
    switch -Wildcard ($Mode.ToLower()) {
        "*status*"       { Get-AppStatus }
        "*compress*"     { 
            Compress-All-LogFiles 
            return
        }
        "*clean*"        { 
            Write-Status "Membersihkan cache sistem dan file build lama..." "Cyan"
            Remove-Item -Recurse -Force (Join-Path $FRONTEND_DIR ".next\cache") -ErrorAction SilentlyContinue
            Write-Ok "Cache .next/cache berhasil dibersihkan!"
        }
        "*debug*"        { Start-Apps -Mode "Debug" }
        "*testing*"      { Start-Apps -Mode "Testing" }
        "*preview*"      { Start-Apps -Mode "Preview" }
        "*staging*"      { Start-Apps -Mode "Staging" }
        "*fallback*"     { Start-Apps -Mode "Fallback" }
        "*dev*"          { Start-Apps -Mode "Development" }
        "*prod*"         { Start-Apps -Mode "Production" }
        "*stop-backend*" { Stop-BackendOnly }
        "*stop-frontend*"{ Stop-FrontendOnly }
        "*restart*"      { 
            Stop-Apps
            Start-Sleep -Seconds 1
            Start-Apps -Mode "Development"
        }
        "*stop*"         { Stop-Apps }
        "*off*"          { Stop-Apps }
        "*nonaktif*"     { Stop-Apps }
        "*test-unit*"    { Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$BACKEND_DIR`" && npm run test" -NoNewWindow -Wait }
        "*test-e2e*"     { Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$BACKEND_DIR`" && npm run test:e2e" -NoNewWindow -Wait }
        "*setup*"        { Start-EnvironmentSetup }
        default {
            Write-Err "Mode '$Mode' tidak dikenal. Mengakses Menu Utama..."
            Start-Sleep -Seconds 2
        }
    }
    return
}

# ─── MAIN MENU ────────────────────────────────────────────────

while ($true) {
    Write-Banner
    Get-AppStatus

    Write-Host "  +=========================================+" -ForegroundColor DarkCyan
    Write-Host "  |               MENU UTAMA                |" -ForegroundColor DarkCyan
    Write-Host "  +=========================================+" -ForegroundColor DarkCyan
    Write-Host "  |  [1] Mulai Aplikasi (Mode Development)  |" -ForegroundColor White
    Write-Host "  |  [2] Mulai Aplikasi (Mode Production)   |" -ForegroundColor White
    Write-Host "  |  [3] Mulai Aplikasi (Testing/Debugging) |" -ForegroundColor Yellow
    Write-Host "  |  [4] Mulai Aplikasi (Mode Preview)      |" -ForegroundColor Cyan
    Write-Host "  |  [5] Mulai Aplikasi (Mode Staging)      |" -ForegroundColor Cyan
    Write-Host "  |  [6] Mulai Aplikasi (Mode Fallback)     |" -ForegroundColor DarkYellow
    Write-Host "  |  [7] Restart Aplikasi                   |" -ForegroundColor White
    Write-Host "  |  [8] Rebuild & Restart (Full)           |" -ForegroundColor White
    Write-Host "  |  [9] Menonaktifkan Mode / Stop Aplikasi |" -ForegroundColor Red
    Write-Host "  |  [10] Build Aplikasi (Tanpa Menjalankan)|" -ForegroundColor White
    Write-Host "  |  [11] Lihat Log Server                  |" -ForegroundColor White
    Write-Host "  |  [12] Buka Browser (localhost:3000)     |" -ForegroundColor White
    Write-Host "  |  [13] Suite Testing & Diagnostik       |" -ForegroundColor Yellow
    Write-Host "  |  [14] Troubleshoot (Perbaiki Error)    |" -ForegroundColor White
    Write-Host "  |  [15] Setup File .env                  |" -ForegroundColor White
    Write-Host "  |  [16] Install Dependencies (Semua)     |" -ForegroundColor White
    Write-Host "  |  [17] Setup Lingkungan Baru / Device   |" -ForegroundColor Green
    Write-Host "  |  [0] Keluar dari Script                 |" -ForegroundColor White
    Write-Host "  +=========================================+" -ForegroundColor DarkCyan
    Write-Host ""

    $choice = Read-Host "  Pilih menu"

    switch ($choice) {
        "1" {
            Write-Banner
            $running = (Test-PortListening 3001) -or (Test-PortListening 3000)
            if ($running) {
                Write-Info "Aplikasi sudah berjalan. Gunakan Restart (menu 7) untuk memulai ulang."
            } else {
                Start-Apps -Mode "Development"
            }
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "2" {
            Write-Banner
            $running = (Test-PortListening 3001) -or (Test-PortListening 3000)
            if ($running) {
                Write-Info "Aplikasi sudah berjalan. Gunakan Restart (menu 7) untuk memulai ulang."
            } else {
                Start-Apps -Mode "Production"
            }
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "3" {
            Write-Banner
            $running = (Test-PortListening 3001) -or (Test-PortListening 3000)
            if ($running) {
                Write-Info "Aplikasi sudah berjalan. Hentikan dulu atau gunakan menu Restart."
            } else {
                Start-Apps -Mode "Debug"
            }
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "4" {
            Write-Banner
            $running = (Test-PortListening 3001) -or (Test-PortListening 3000)
            if ($running) {
                Write-Info "Aplikasi sudah berjalan. Hentikan dulu atau gunakan menu Restart."
            } else {
                Start-Apps -Mode "Preview"
            }
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "5" {
            Write-Banner
            $running = (Test-PortListening 3001) -or (Test-PortListening 3000)
            if ($running) {
                Write-Info "Aplikasi sudah berjalan. Hentikan dulu atau gunakan menu Restart."
            } else {
                Start-Apps -Mode "Staging"
            }
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "6" {
            Write-Banner
            $running = (Test-PortListening 3001) -or (Test-PortListening 3000)
            if ($running) {
                Write-Info "Aplikasi sudah berjalan. Hentikan dulu atau gunakan menu Restart."
            } else {
                Start-Apps -Mode "Fallback"
            }
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "7" {
            Write-Banner
            if (Confirm-Action "Restart akan menghentikan dan memulai ulang semua layanan.") {
                Stop-Apps
                Write-Host ""
                Start-Apps
            }
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "8" {
            Write-Banner
            if (Confirm-Action "Yakin ingin mem-Build ulang dan Restart Frontend & Backend? (Perubahan kode akan diterapkan)") {
                Write-Status "Menghentikan proses Frontend, Backend, dan Prisma Studio..." "Yellow"
                
                $bPid = Get-StoredPid $BACKEND_PID_FILE
                $fPid = Get-StoredPid $FRONTEND_PID_FILE
                $pPid = Get-StoredPid $PRISMA_STUDIO_PID_FILE
                if ($bPid) {
                    Stop-ProcessById $bPid
                    Remove-Item $BACKEND_PID_FILE -ErrorAction SilentlyContinue
                }
                if ($fPid) {
                    Stop-ProcessById $fPid
                    Remove-Item $FRONTEND_PID_FILE -ErrorAction SilentlyContinue
                }
                if ($pPid) {
                    Stop-ProcessById $pPid
                    Remove-Item $PRISMA_STUDIO_PID_FILE -ErrorAction SilentlyContinue
                }
                Stop-PortProcess 3001
                Stop-PortProcess 3000
                Stop-PortProcess 51212
                Start-Sleep -Seconds 1
                
                $bBuilt = Build-Backend
                $fBuilt = Build-Frontend
                
                if ($bBuilt) { Start-Backend }
                if ($fBuilt) { Start-Frontend }
                Start-PrismaStudio
            }
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "9" {
            Stop-ModeMenu
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "10" {
            Write-Banner
            Start-BuildOnly
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "11" {
            Show-Logs
        }
        "12" {
            Write-Status "Membuka browser ke http://localhost:3000 ..." "Cyan"
            Start-Process "http://localhost:3000"
            Start-Sleep -Seconds 1
        }
        "13" {
            Start-TestingSuite
        }
        "14" {
            Start-Troubleshoot
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "15" {
            Start-SetupEnv
            Read-Host "  Tekan ENTER Untuk kembali ke menu"
        }
        "16" {
            Start-InstallDependencies
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "17" {
            Start-EnvironmentSetup
            Read-Host "  Tekan ENTER untuk kembali ke menu"
        }
        "0" {
            Write-Banner
            if (Confirm-Action "Apakah Anda ingin mematikan aplikasi sebelum keluar?") {
                Stop-Apps
            }
            Write-Host ""
            Write-Ok "Sampai jumpa! - Muhipo Dev 2026"
            Write-Host ""
            break
        }
        default {
            Write-Err "Pilihan tidak valid. Coba lagi."
            Start-Sleep -Seconds 1
        }
    }

    if ($choice -eq "0") { break }
}
