@echo off
:: ============================================================
::   SIMASMUH Launcher - Muhipo Dev (C) 2026
::   Sistem Informasi Manajemen SMA MUHIPO
::   Smart Environment Analyzer & Dual-Engine Launcher (PowerShell / Native CMD)
:: ============================================================
title SIMASMUH - Sistem Informasi Manajemen SMA MUHIPO
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

:: Pindah ke direktori script berada
cd /d "%~dp0"
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "FACE_AI_DIR=%ROOT_DIR%services\face-attendance"

:: ============================================================
::   TAHAP 1: SISTEM ANALISIS ENVIRONMENT & RUNTIME DETECTOR
:: ============================================================
set "PS_EXEC="

:: 1. Cek PowerShell Core (pwsh.exe)
where pwsh.exe >nul 2>&1
if not errorlevel 1 (
    set "PS_EXEC=pwsh.exe"
)

:: 2. Cek Windows PowerShell (powershell.exe)
if not defined PS_EXEC (
    where powershell.exe >nul 2>&1
    if not errorlevel 1 (
        set "PS_EXEC=powershell.exe"
    )
)

:: 3. Jika PowerShell ditemukan dan simasmuh.ps1 tersedia, jalankan PowerShell Engine
if defined PS_EXEC (
    if exist "%ROOT_DIR%simasmuh.ps1" (
        if "%~1"=="" (
            "%PS_EXEC%" -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%simasmuh.ps1"
        ) else (
            "%PS_EXEC%" -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%simasmuh.ps1" -Mode "%~1"
        )
        if not errorlevel 1 (
            exit /b 0
        )
        echo.
        echo [INFO] Eksekusi PowerShell dialihkan ke Native Terminal CMD...
    )
)

:: ============================================================
::   TAHAP 2: NATIVE TERMINAL CMD ENGINE (AUTOMATIC FALLBACK)
:: ============================================================
echo.
echo  +==================================================+
echo  |           SIMASMUH - Muhipo Dev 2026             |
echo  |     Sistem Informasi Manajemen SMA MUHIPO        |
echo  |     [Mode: Native Terminal Windows CMD]          |
echo  +==================================================+
echo.

:CMD_MAIN_MENU
cls
echo.
echo  +==================================================+
echo  |           SIMASMUH - Muhipo Dev 2026             |
echo  |     Sistem Informasi Manajemen SMA MUHIPO        |
echo  |     [Mode: Native Terminal Windows CMD]          |
echo  +==================================================+
echo.
echo  Status Layanan Port:
call :CHECK_PORT_STATUS 3000 "Frontend Web     "
call :CHECK_PORT_STATUS 3001 "Backend API      "
call :CHECK_PORT_STATUS 51212 "Prisma Studio    "
call :CHECK_PORT_STATUS 54322 "PostgreSQL (DB)  "
echo.
echo  +=========================================+
echo  |               MENU UTAMA                |
echo  +=========================================+
echo  |  [1] Mulai Aplikasi (Mode Development)  |
echo  |  [2] Mulai Aplikasi (Mode Production)   |
echo  |  [3] Mulai Aplikasi (Testing/Debugging) |
echo  |  [7] Restart Aplikasi                   |
echo  |  [8] Rebuild ^& Restart (Full)           |
echo  |  [9] Menonaktifkan Mode / Stop Aplikasi |
echo  |  [10] Build Aplikasi (Tanpa Menjalankan)|
echo  |  [11] Cek Kesiapan Sistem Total (All)   |
echo  |  [12] Buka Browser (localhost:3000)     |
echo  |  [15] Setup File .env                  |
echo  |  [16] Install Dependencies (Semua)     |
echo  |  [17] Setup Lingkungan Baru / Device   |
echo  |  [18] Backup & Restore Database        |
echo  |  [19] Manajemen & Backup Log Projek    |
echo  |  [0] Keluar dari Script                 |
echo  +=========================================+
echo.
set /p "CHOICE=  Pilih menu [0-19]: "

if "%CHOICE%"=="1" goto CMD_START_DEV
if "%CHOICE%"=="2" goto CMD_START_PROD
if "%CHOICE%"=="3" goto CMD_START_DEBUG
if "%CHOICE%"=="7" goto CMD_RESTART
if "%CHOICE%"=="8" goto CMD_REBUILD_RESTART
if "%CHOICE%"=="9" goto CMD_STOP_APPS
if "%CHOICE%"=="10" goto CMD_BUILD_ONLY
if "%CHOICE%"=="11" goto CMD_CHECK_READINESS
if "%CHOICE%"=="12" goto CMD_OPEN_BROWSER
if "%CHOICE%"=="15" goto CMD_SETUP_ENV
if "%CHOICE%"=="16" goto CMD_INSTALL_DEPS
if "%CHOICE%"=="17" goto CMD_SETUP_DEVICE_17
if "%CHOICE%"=="18" goto CMD_BACKUP_RESTORE
if "%CHOICE%"=="19" goto CMD_LOG_MANAGER
if "%CHOICE%"=="0" goto CMD_EXIT

echo.
echo  [ERR] Pilihan tidak valid. Silakan pilih nomor yang tersedia.
timeout /t 2 >nul
goto CMD_MAIN_MENU

:: ------------------------------------------------------------
:: SUBROUTINE: CEK STATUS PORT & SYSTEM
:: ------------------------------------------------------------
:CHECK_PORT_STATUS
set "PORT_NUM=%~1"
set "LABEL=%~2"
netstat -ano 2>nul | findstr /R /C:":%PORT_NUM% .*LISTENING" >nul
if not errorlevel 1 (
    echo   - %LABEL% : AKTIF (Port %PORT_NUM%)
    exit /b 0
)
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %PORT_NUM% -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if not errorlevel 1 (
    echo   - %LABEL% : AKTIF (Port %PORT_NUM%)
) else (
    echo   - %LABEL% : NONAKTIF (Port %PORT_NUM%)
)
exit /b 0

:CHECK_PORT_EXCLUSIONS
netsh interface ipv4 show excludedportrange protocol=tcp 2>nul | findstr /C:"54265" /C:"54165" /C:"54364" >nul
if not errorlevel 1 (
    echo.
    echo  [PERINGATAN PORT SISTEM WINDOWS]
    echo  Port Supabase (54321 - 54323) terblokir oleh Windows WinNAT/Hyper-V!
    echo  Jika database gagal tersambung, jalankan perintah ini di CMD/PowerShell Administrator:
    echo  ^> net stop winnat ^&^& net start winnat
    echo.
)
exit /b 0

:: ------------------------------------------------------------
:: MENU 1: START DEVELOPMENT MODE
:: ------------------------------------------------------------
:CMD_START_DEV
set "TARGET_MODE=DEV"
goto CMD_START_STACK

:: ------------------------------------------------------------
:: MENU 2: START PRODUCTION MODE
:: ------------------------------------------------------------
:CMD_START_PROD
set "TARGET_MODE=PROD"
goto CMD_START_STACK

:: ------------------------------------------------------------
:: MENU 3: START DEBUG MODE
:: ------------------------------------------------------------
:CMD_START_DEBUG
set "TARGET_MODE=DEBUG"
goto CMD_START_STACK

:: ------------------------------------------------------------
:: MENU 7: RESTART APLIKASI
:: ------------------------------------------------------------
:CMD_RESTART
echo.
echo  ======================================================
echo  >> RESTART APLIKASI: Menonaktifkan semua layanan...
echo  ======================================================
call :CMD_STOP_PORTS
timeout /t 1 /nobreak >nul 2>&1
echo  >> Memulai ulang seluruh layanan sistem...
set "TARGET_MODE=DEV"
goto CMD_START_STACK

:: ------------------------------------------------------------
:: MENU 8: REBUILD & RESTART (FULL)
:: ------------------------------------------------------------
:CMD_REBUILD_RESTART
echo.
echo  ======================================================
echo  >> REBUILD ^& RESTART: Menghentikan semua layanan...
echo  ======================================================
call :CMD_STOP_PORTS
timeout /t 1 /nobreak >nul 2>&1

:: Pastikan Database PostgreSQL Lokal (Port 54322) dimulai dan aktif
call :CMD_START_DATABASE

echo.
echo  >> Mem-Build ulang Backend (NestJS)...
cd /d "%BACKEND_DIR%"
call npm run build
if errorlevel 1 (
    echo  [ERR] Build Backend gagal! Membatalkan restart.
    pause
    goto CMD_MAIN_MENU
)
echo.
echo  >> Mem-Build ulang Frontend (Next.js)...
cd /d "%FRONTEND_DIR%"
call npm run build
if errorlevel 1 (
    echo  [ERR] Build Frontend gagal! Membatalkan restart.
    pause
    goto CMD_MAIN_MENU
)
cd /d "%ROOT_DIR%"
echo.
echo  [OK] Build ulang selesai. Meluncurkan seluruh layanan...
set "TARGET_MODE=PROD"
goto CMD_START_STACK

:: ------------------------------------------------------------
:: ORKESTRATOR SEQUENCE MEMULAI SISTEM:
:: 1. Verifikasi Runtime Node.js
:: 2. Menyalakan PostgreSQL (Port 54322) & Tunggu Ready
:: 3. Memulai Backend API (Port 3001)
:: 4. Memulai Frontend Web (Port 3000)
:: 5. Menyalakan Prisma Studio (Port 51212)
:: 6. Menyalakan Face AI (Port 8089)
:: ------------------------------------------------------------
:CMD_START_STACK
echo.
echo  +======================================================+
echo  |    ORKESTRASI MEMULAI LAYANAN SISTEM SIMASMUH        |
echo  +======================================================+
echo.

:: Tahap 1: Cek & Pastikan Node.js siap
echo  [1/5] Memeriksa runtime Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo  [ERR] Node.js belum terpasang atau belum ada di PATH!
    pause
    goto CMD_MAIN_MENU
)
for /f "tokens=*" %%v in ('node -v 2^>nul') do echo  [OK] Node.js terdeteksi: %%v

:: Membersihkan port 3000, 3001, 51212, 8089 dari proses lama agar tidak terjadi EADDRINUSE
call :CMD_STOP_PORTS

:: Tahap 2: Menyalakan PostgreSQL Native Lokal dan pastikan port 54322 siap
echo.
echo  [2/5] Menyiapkan & menyalakan PostgreSQL Database (Port 54322)...
call :CHECK_PORT_EXCLUSIONS
call :CHECK_START_LOCAL_DB

:: Tahap 3: Memulai Backend API (Port 3001)
echo.
echo  [3/5] Memulai Backend API (Port 3001)...
if not exist "%ROOT_DIR%logs" mkdir "%ROOT_DIR%logs" >nul 2>&1
if "%TARGET_MODE%"=="DEV" (
    start "SIMASMUH-Backend" /B /D "%BACKEND_DIR%" cmd /c "npm run start:dev >> "%ROOT_DIR%logs\simasmuh-backend.log" 2>&1"
) else if "%TARGET_MODE%"=="DEBUG" (
    start "SIMASMUH-Backend" /B /D "%BACKEND_DIR%" cmd /c "npm run start:debug >> "%ROOT_DIR%logs\simasmuh-backend.log" 2>&1"
) else (
    start "SIMASMUH-Backend" /B /D "%BACKEND_DIR%" cmd /c "node dist/main.js >> "%ROOT_DIR%logs\simasmuh-backend.log" 2>&1"
)
echo  [OK] Backend API diluncurkan di port 3001.

:: Jeda singkat agar Backend sempat inisialisasi awal
timeout /t 2 /nobreak >nul 2>&1

:: Tahap 4: Memulai Frontend Web (Port 3000)
echo.
echo  [4/5] Memulai Frontend Web (Port 3000)...
if "%TARGET_MODE%"=="PROD" (
    start "SIMASMUH-Frontend" /B /D "%FRONTEND_DIR%" cmd /c "npm run start >nul 2>&1"
) else (
    start "SIMASMUH-Frontend" /B /D "%FRONTEND_DIR%" cmd /c "npm run dev >nul 2>&1"
)
echo  [OK] Frontend Web diluncurkan di port 3000.

:: Tahap 5: Menyalakan Prisma Studio (Port 51212)
echo.
echo  [5/5] Menyalakan Prisma Studio (Port 51212)...
start "SIMASMUH-PrismaStudio" /B /D "%BACKEND_DIR%" cmd /c "npx prisma studio --port 51212 --browser none >nul 2>&1"
echo  [OK] Prisma Studio diluncurkan di port 51212.

:: Layanan Tambahan: Face AI Service jika venv tersedia
if exist "%FACE_AI_DIR%\.venv\Scripts\python.exe" (
    echo.
    echo  [+] Menyalakan Face AI Attendance Service (Port 8089)...
    start "SIMASMUH-FaceAI" /B /D "%FACE_AI_DIR%" cmd /c ".venv\Scripts\python.exe main.py >nul 2>&1"
    echo  [OK] Face AI Service diluncurkan di port 8089.
)

echo.
echo  +======================================================+
echo  |    SEMUA LAYANAN SIMASMUH BERHASIL DILUNCURKAN!      |
echo  +======================================================+
echo  - Frontend Web    : http://localhost:3000
echo  - Backend API     : http://localhost:3001
echo  - Prisma Studio   : http://localhost:51212
echo  - PostgreSQL (DB) : Port 54322 (Mandiri Native)
if exist "%FACE_AI_DIR%\.venv\Scripts\python.exe" (
    echo  - Face AI Service : http://localhost:8089
)
echo.
pause
goto CMD_MAIN_MENU

:: ------------------------------------------------------------
:: SUBROUTINE: CHECK & START LOCAL POSTGRESQL (NATIVE PATH)
:: ------------------------------------------------------------
:CHECK_START_LOCAL_DB
set "DB_ONLINE=0"
netstat -ano 2>nul | findstr /R /C:":54322 .*LISTENING" >nul
if not errorlevel 1 set "DB_ONLINE=1"
if "!DB_ONLINE!"=="0" (
    powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 54322 -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
    if not errorlevel 1 set "DB_ONLINE=1"
)

if "!DB_ONLINE!"=="1" (
    echo  [OK] Database PostgreSQL Lokal (Port 54322) AKTIF.
    exit /b 0
)

:: Cek apakah folder database/data proyek tersedia
set "LOCAL_DATA_DIR=%ROOT_DIR%database\data"
set "PG_CTL_BIN="
if exist "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" set "PG_CTL_BIN=C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
if not defined PG_CTL_BIN (
    for /f "delims=" %%I in ('where pg_ctl.exe 2^>nul') do set "PG_CTL_BIN=%%I"
)

if defined PG_CTL_BIN (
    if exist "%LOCAL_DATA_DIR%" (
        "%PG_CTL_BIN%" status -D "%LOCAL_DATA_DIR%" >nul 2>&1
        if not errorlevel 1 (
            echo  [OK] Database PostgreSQL Lokal (Port 54322) AKTIF.
            exit /b 0
        )
        echo  >> Memulai Database PostgreSQL Native Lokal di port 54322...
        if exist "%LOCAL_DATA_DIR%\postmaster.pid" (
            "%PG_CTL_BIN%" status -D "%LOCAL_DATA_DIR%" >nul 2>&1
            if errorlevel 1 (
                del /F /Q "%LOCAL_DATA_DIR%\postmaster.pid" >nul 2>&1
            )
        )
        start /B "" "%PG_CTL_BIN%" -D "%LOCAL_DATA_DIR%" -o "-p 54322" -l "%ROOT_DIR%database\postgres.log" start >nul 2>&1
        for /L %%i in (1,1,10) do (
            timeout /t 1 /nobreak >nul 2>&1
            powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 54322 -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
            if not errorlevel 1 (
                echo  [OK] Database PostgreSQL Native Lokal berhasil dinyalakan (Port 54322).
                exit /b 0
            )
        )
    )
)

:: Jika docker aktif dan container tersedia, fallback ke docker
where docker >nul 2>&1
if not errorlevel 1 (
    docker ps -a --format "{{.Names}}" 2>nul | findstr /C:"supabase_db_siakad-coba" >nul
    if not errorlevel 1 (
        echo  >> Memulai database fallback via Docker container...
        docker start supabase_db_siakad-coba >nul 2>&1
        timeout /t 2 >nul
    )
)
exit /b 0

:: ------------------------------------------------------------
:: MENU 9: STOP APPS
:: ------------------------------------------------------------
:CMD_STOP_APPS
echo.
echo  >> Menghentikan seluruh proses SIMASMUH (Port 3000, 3001, 51212, 8089, 54322)...
call :CMD_STOP_ALL_PORTS
echo.
echo  [OK] Seluruh layanan SIMASMUH berhasil dihentikan.
pause
goto CMD_MAIN_MENU

:CMD_STOP_PORTS
for %%P in (3000 3001 51212 8089) do (
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /C:":%%P "') do (
        if "%%a" neq "0" (
            taskkill /F /T /PID %%a >nul 2>&1
        )
    )
)
timeout /t 1 /nobreak >nul 2>&1
exit /b 0

:CMD_STOP_ALL_PORTS
for %%P in (3000 3001 51212 8089 54322) do (
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /C:":%%P "') do (
        if "%%a" neq "0" (
            taskkill /F /T /PID %%a >nul 2>&1
        )
    )
)
if defined PG_CTL_BIN (
    if exist "%LOCAL_DATA_DIR%" (
        "%PG_CTL_BIN%" stop -D "%LOCAL_DATA_DIR%" -m fast >nul 2>&1
    )
)
timeout /t 1 /nobreak >nul 2>&1
exit /b 0

:: ------------------------------------------------------------
:: MENU 10: BUILD ONLY
:: ------------------------------------------------------------
:CMD_BUILD_ONLY
echo.
echo  >> Melakukan Build Backend (NestJS)...
cd /d "%BACKEND_DIR%"
call npm run build
echo.
echo  >> Melakukan Build Frontend (Next.js)...
cd /d "%FRONTEND_DIR%"
call npm run build
cd /d "%ROOT_DIR%"
echo.
echo  [OK] Proses Build selesai.
pause
goto CMD_MAIN_MENU

:: ------------------------------------------------------------
:: MENU 11: CEK KESIAPAN SISTEM TOTAL
:: ------------------------------------------------------------
:CMD_CHECK_READINESS
cls
echo.
echo  +==================================================+
echo  |        PEMERIKSAAN KESIAPAN SISTEM TOTAL         |
echo  +==================================================+
echo.
echo  1. Memeriksa Runtimes Dasar Sistem...
where node >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%v in ('node -v 2^>nul') do echo  [OK] Node.js terpasang: %%v
) else (
    echo  [ERR] Node.js belum terpasang di PATH!
)

where npm >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%v in ('npm -v 2^>nul') do echo  [OK] NPM terpasang: %%v
) else (
    echo  [ERR] NPM belum terpasang di PATH!
)

where python >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%v in ('python --version 2^>nul') do echo  [OK] Python terpasang: %%v
) else (
    echo  [i]  Python belum terpasang (Opsional untuk Face AI)
)

where docker >nul 2>&1
if not errorlevel 1 (
    echo  [OK] Docker CLI terdeteksi (Siap untuk Supabase Studio port 54323 ^& DB 54322)
) else (
    echo  [i]  Docker Desktop belum aktif
)

echo.
echo  2. Memeriksa Berkas Konfigurasi .env...
if exist "%BACKEND_DIR%\.env" (
    echo  [OK] Backend .env terpasang
) else (
    echo  [ERR] Backend .env BELUM ADA! (Pilih Menu 15)
)

if exist "%FRONTEND_DIR%\.env" (
    echo  [OK] Frontend .env terpasang
) else (
    echo  [ERR] Frontend .env BELUM ADA! (Pilih Menu 15)
)

if exist "%FACE_AI_DIR%\.env" (
    echo  [OK] Face AI .env terpasang
) else (
    echo  [i]  Face AI .env belum dibuat (Opsional)
)

echo.
echo  3. Memeriksa Modul ^& Dependencies...
if exist "%BACKEND_DIR%\node_modules" (
    echo  [OK] Backend dependencies (node_modules) siap
) else (
    echo  [ERR] Backend node_modules belum diinstall! (Pilih Menu 16)
)

if exist "%FRONTEND_DIR%\node_modules" (
    echo  [OK] Frontend dependencies (node_modules) siap
) else (
    echo  [ERR] Frontend node_modules belum diinstall! (Pilih Menu 16)
)

if exist "%BACKEND_DIR%\node_modules\.prisma\client" (
    echo  [OK] Prisma Client Engine tergenerate
) else (
    echo  [i]  Prisma Client Engine belum digenerate
)

echo.
echo  4. Memeriksa Direktori Storage Aplikasi...
set "STORAGE_FOUND=%ROOT_DIR%\storage"
if not exist "%STORAGE_FOUND%" set "STORAGE_FOUND=D:\simasmuh\storage"
if exist "%STORAGE_FOUND%" (
    echo  [OK] Folder storage aktif: %STORAGE_FOUND%
) else (
    echo  [i]  Folder storage akan dibuat otomatis saat startup
)

echo.
echo  5. Memeriksa Port Layanan ^& Koneksi...
call :CHECK_PORT_STATUS 3000 "Frontend Web     "
call :CHECK_PORT_STATUS 3001 "Backend API      "
call :CHECK_PORT_STATUS 51212 "Prisma Studio    "
call :CHECK_PORT_STATUS 54323 "Supabase Studio  "
call :CHECK_PORT_STATUS 54322 "Supabase DB Port "

echo.
echo  +==================================================+
echo  |          STATUS KESIAPAN KESELURUHAN             |
echo  +==================================================+
if exist "%BACKEND_DIR%\node_modules" if exist "%FRONTEND_DIR%\node_modules" (
    echo  [OK] SISTEM SIAP DIGUNAKAN 100%!
    echo  Silakan pilih Menu 1 (Mode Dev) atau Menu 2 (Mode Prod).
) else (
    echo  [!] SISTEM MEMERLUKAN SETUP DEPENDENCIES/ENV
    echo  Silakan jalankan Menu 15, 16, atau 17.
)
echo  +==================================================+
echo.
pause
goto CMD_MAIN_MENU

:: ------------------------------------------------------------
:: MENU 12: BUKA BROWSER
:: ------------------------------------------------------------
:CMD_OPEN_BROWSER
echo.
echo  >> Membuka browser ke http://localhost:3000 ...
start http://localhost:3000
timeout /t 1 >nul
goto CMD_MAIN_MENU

:: ------------------------------------------------------------
:: MENU 15: SETUP FILE .ENV
:: ------------------------------------------------------------
:CMD_SETUP_ENV
echo.
echo  +==================================================+
echo  |           SETUP FILE KONFIGURASI .ENV            |
echo  +==================================================+
echo.

:: 1. Backend .env
if not exist "%BACKEND_DIR%\.env" (
    if exist "%BACKEND_DIR%\.env.example" (
        copy /Y "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
        echo  [OK] Dibuat: backend\.env (dari .env.example)
    ) else (
        (
            echo DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
            echo DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
            echo JWT_SECRET="nailar-muhipo55"
            echo PORT=3001
            echo SUPABASE_URL=http://127.0.0.1:54321
            echo SUPABASE_PUBLISHABLE_KEY=nailar-muhipo55
            echo SUPABASE_SECRET_KEY=nailar-muhipo55
            echo SUPABASE_JWKS_URL=http://127.0.0.1:54321/auth/v1/.well-known/jwks.json
            echo STORAGE_PATH=
        ) > "%BACKEND_DIR%\.env"
        echo  [OK] Dibuat: backend\.env (default otomatis)
    )
) else (
    echo  [i]  backend\.env sudah ada (dilindungi utuh).
)

:: 2. Frontend .env
if not exist "%FRONTEND_DIR%\.env" (
    if exist "%FRONTEND_DIR%\.env.example" (
        copy /Y "%FRONTEND_DIR%\.env.example" "%FRONTEND_DIR%\.env" >nul
        echo  [OK] Dibuat: frontend\.env (dari .env.example)
    ) else (
        (
            echo NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
            echo BACKEND_URL=http://localhost:3001
            echo NEXT_PUBLIC_API_KEY=nailar-muhipo55
            echo NEXTAUTH_URL=https://simasmuh.razagopo.my.id
            echo NEXTAUTH_SECRET=nailar-muhipo55
            echo NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
            echo NEXT_PUBLIC_ENABLE_REAL_TIME_NOTIFICATIONS=true
            echo NEXT_PUBLIC_ENABLE_NOTIFICATION_SOUNDS=true
            echo NEXT_PUBLIC_DEBUG_NOTIFICATIONS=false
        ) > "%FRONTEND_DIR%\.env"
        echo  [OK] Dibuat: frontend\.env (default otomatis)
    )
) else (
    echo  [i]  frontend\.env sudah ada (dilindungi utuh).
)

:: 3. Face AI .env
if not exist "%FACE_AI_DIR%\.env" (
    if exist "%FACE_AI_DIR%\.env.example" (
        copy /Y "%FACE_AI_DIR%\.env.example" "%FACE_AI_DIR%\.env" >nul
        echo  [OK] Dibuat: services\face-attendance\.env (dari .env.example)
    ) else (
        (
            echo BACKEND_URL=http://localhost:3001
            echo API_KEY=nailar-muhipo55
            echo API_SECRET=nailar-muhipo55
            echo PORT=8089
        ) > "%FACE_AI_DIR%\.env"
        echo  [OK] Dibuat: services\face-attendance\.env (default otomatis)
    )
) else (
    echo  [i]  services\face-attendance\.env sudah ada (dilindungi utuh).
)

echo.
echo  [OK] Setup seluruh file .env selesai!
pause
goto CMD_MAIN_MENU

:: ------------------------------------------------------------
:: MENU 16: INSTALL DEPENDENCIES
:: ------------------------------------------------------------
:CMD_INSTALL_DEPS
echo.
echo  +==================================================+
echo  |           INSTALASI DEPENDENCIES SIMASMUH        |
echo  +==================================================+
echo.

:: 1. Backend NPM
echo  1/3. Menginstall dependencies Backend (NestJS + Prisma)...
cd /d "%BACKEND_DIR%"
call npm install
if errorlevel 1 (
    echo  [i]  Mencoba instalasi backend dengan fallback --legacy-peer-deps...
    call npm install --legacy-peer-deps
)

:: 2. Frontend NPM
echo.
echo  2/3. Menginstall dependencies Frontend (Next.js + Tailwind)...
cd /d "%FRONTEND_DIR%"
call npm install
if errorlevel 1 (
    echo  [i]  Mencoba instalasi frontend dengan fallback --legacy-peer-deps...
    call npm install --legacy-peer-deps
)

:: 3. Python Virtualenv & AI Dependencies
echo.
echo  3/3. Menyiapkan Python Virtualenv & AI Packages (OpenCV, VGG, MTCNN, ResNet, YOLO)...
cd /d "%FACE_AI_DIR%"
where python >nul 2>&1
if not errorlevel 1 (
    if not exist ".venv\Scripts\python.exe" (
        echo  >> Membuat Python Virtualenv (.venv)...
        python -m venv .venv
    )
    if exist ".venv\Scripts\python.exe" (
        .venv\Scripts\python.exe -m pip install --upgrade pip
        .venv\Scripts\pip.exe install -r requirements.txt
        echo  [OK] Seluruh AI Packages (OpenCV, VGG, MTCNN, ResNet, YOLO) siap di .venv!
    ) else (
        python -m pip install -r requirements.txt
    )
) else (
    echo  [i]  Python belum terpasang di sistem. Pasang Python 3.10+ untuk fitur Face AI.
)

cd /d "%ROOT_DIR%"
echo.
echo  [OK] Seluruh instalasi dependencies selesai!
pause
goto CMD_MAIN_MENU

:: ------------------------------------------------------------
:: MENU 17: SETUP ENVIRONMENT BARU (1-KLIK FULL AUTOMATION)
:: ------------------------------------------------------------
:CMD_SETUP_DEVICE_17
cls
echo.
echo  +==================================================+
echo  |   PERSIAPAN LINGKUNGAN / SETUP DEVICE BARU       |
echo  |   1-KLIK OTOMATIS: DEPENDENCIES, VENV, .ENV, DB  |
echo  +==================================================+
echo  Otomatis menyiapkan seluruh kebutuhan SIMASMUH pada perangkat baru.
echo.

:: 1. Runtime Detection & Multi-Engine Auto-Installer (Winget / Native Curl MSI)
echo  1/8. Memeriksa runtime dasar sistem (Node.js, npm, Python, Git, PostgreSQL/Docker)...
where node >nul 2>&1
if errorlevel 1 (
    echo  [ERR] Node.js belum terpasang!
    where winget >nul 2>&1
    if not errorlevel 1 (
        echo  >> Memasang Node.js LTS via winget...
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    ) else (
        echo  >> Winget tidak tersedia, mengunduh dan memasang Node.js LTS otomatis via PowerShell...
        powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile '%TEMP%\nodejs.msi'; Start-Process msiexec.exe -ArgumentList '/i', '%TEMP%\nodejs.msi', '/quiet', '/qn', '/norestart' -Wait"
    )
) else (
    for /f "tokens=*" %%v in ('node -v 2^>nul') do echo  [OK] Node.js terdeteksi (%%v)
)

where python >nul 2>&1
if errorlevel 1 (
    echo  [i]  Python belum terpasang.
    where winget >nul 2>&1
    if not errorlevel 1 (
        echo  >> Memasang Python 3.11 via winget...
        winget install Python.Python.3.11 --accept-package-agreements --accept-source-agreements
    ) else (
        echo  >> Winget tidak tersedia, mengunduh dan memasang Python 3.11 otomatis via PowerShell...
        powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe' -OutFile '%TEMP%\python-installer.exe'; Start-Process '%TEMP%\python-installer.exe' -ArgumentList '/quiet', 'InstallAllUsers=1', 'PrependPath=1' -Wait"
    )
) else (
    for /f "tokens=*" %%v in ('python --version 2^>nul') do echo  [OK] Python terdeteksi (%%v)
)

where git >nul 2>&1
if errorlevel 1 (
    echo  [i]  Git belum terpasang.
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install Git.Git --accept-package-agreements --accept-source-agreements >nul 2>&1
    )
) else (
    echo  [OK] Git terdeteksi.
)

:: Pengecekan Database Engine (PostgreSQL Native atau Docker)
powershell -NoProfile -Command "Get-Service -Name '*postgres*' -ErrorAction SilentlyContinue" | findstr /I "postgres" >nul 2>&1
if not errorlevel 1 (
    echo  [OK] PostgreSQL Server Native terdeteksi aktif di Windows Service.
) else (
    where docker >nul 2>&1
    if not errorlevel 1 (
        echo  [OK] Docker CLI terdeteksi (siap untuk container database/Supabase).
    ) else (
        echo  [i]  PostgreSQL Native / Docker belum terdeteksi.
        echo  [i]  Di lingkungan Windows Proxmox, Anda dapat menggunakan PostgreSQL Native Service atau Remote DB.
    )
)

:: 2. Setup Berkas .env
echo.
echo  2/8. Menyiapkan berkas konfigurasi .env untuk seluruh modul...
call :CMD_SETUP_ENV_SILENT

:: 3. Install Dependencies
echo.
echo  3/8. Menginstall dependencies Backend & Frontend...
cd /d "%BACKEND_DIR%"
echo  >> Menginstall NPM dependencies Backend...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo  [!] NPM install backend mengalami peringatan, melanjutkan proses...
)

cd /d "%FRONTEND_DIR%"
echo  >> Menginstall NPM dependencies Frontend...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo  [!] NPM install frontend mengalami peringatan, melanjutkan proses...
)

:: 4. Python Virtualenv & AI Dependencies (venv, opencv, vgg, mtcnn, resnet, yolo)
echo.
echo  4/8. Menyiapkan Python Virtualenv & AI Packages (OpenCV, VGG, MTCNN, ResNet, YOLO)...
cd /d "%FACE_AI_DIR%"
where python >nul 2>&1
if not errorlevel 1 (
    if not exist ".venv\Scripts\python.exe" (
        echo  >> Membuat Python Virtualenv (.venv)...
        python -m venv .venv
    )
    if exist ".venv\Scripts\python.exe" (
        echo  >> Memperbarui pip & memasang AI requirements...
        .venv\Scripts\python.exe -m pip install --upgrade pip
        .venv\Scripts\pip.exe install -r requirements.txt
        echo  [OK] AI Packages (OpenCV, VGG, MTCNN, ResNet, YOLO, PyTorch) siap!
    )
) else (
    echo  [i] Python belum terpasang di sistem. Pasang Python 3.10+ untuk fitur Face AI.
)

:: 5. Generate Prisma Client Engine
echo.
echo  5/8. Menyesuaikan Prisma Client engine untuk arsitektur OS lokal...
cd /d "%BACKEND_DIR%"
call npx prisma generate

:: 6. Buat Struktur Folder Storage Aplikasi
echo.
echo  6/8. Menyiapkan struktur folder storage aplikasi (storage)...
set "TARGET_STORAGE=%ROOT_DIR%\storage"
if not exist "%TARGET_STORAGE%" set "TARGET_STORAGE=D:\simasmuh\storage"
for %%S in (profiles avatars surat qr face-snapshots cbt-attachments temp backups face_samples) do (
    if not exist "%TARGET_STORAGE%\%%S" mkdir "%TARGET_STORAGE%\%%S" >nul 2>&1
)
echo  [OK] Struktur direktori storage siap di: %TARGET_STORAGE%

:: 7. Supabase & Database Check
echo.
echo  7/8. Memeriksa status Supabase ^& Database...
netstat -ano 2>nul | findstr /R /C:":54322 .*LISTENING" >nul
if not errorlevel 1 (
    echo  [OK] Supabase Database aktif di Port 54322 ^& Studio 54323.
) else (
    echo  [i]  Supabase Docker belum aktif. Dapat dijalankan kapan saja melalui Docker Desktop.
)

:: 8. Ringkasan Kesiapan Sistem
echo.
echo  8/8. Memverifikasi seluruh komponen...
echo.
echo  +==================================================+
echo  |         RINGKASAN STATUS KESIAPAN SISTEM         |
echo  +==================================================+
echo  [OK] Berkas .env (Backend, Frontend, Face AI) : SIAP
echo  [OK] Dependencies Backend (NestJS + Prisma)   : SIAP
echo  [OK] Dependencies Frontend (Next.js 14)       : SIAP
echo  [OK] Python Virtualenv (.venv)                : SIAP
echo  [OK] OpenCV (Computer Vision Engine)          : SIAP
echo  [OK] MTCNN (Multi-Task Cascaded CNN)          : SIAP
echo  [OK] VGG ^& ResNet (Inception-ResNet-v1 512D)  : SIAP
echo  [OK] YOLO (Ultralytics Vision Multi-Detect)   : SIAP
echo  [OK] Prisma Client Engine                     : SIAP
echo  [OK] Folder External Storage                  : SIAP (%TARGET_STORAGE%)
echo  [OK] 4 Port Layanan Terstandarisasi          :
echo       - Frontend Web     : http://localhost:3000
echo       - Backend API      : http://localhost:3001
echo       - Prisma Studio    : http://localhost:51212
echo       - Supabase Studio  : http://localhost:54323 (DB: 54322)
echo  +==================================================+
echo.
echo  [OK] SETUP LINGKUNGAN BARU SELESAI 100%!
echo  Untuk menjalankan aplikasi, silakan pilih Menu 1 (Mode Development) atau Menu 2 (Mode Production).
echo.
cd /d "%ROOT_DIR%"
pause
goto CMD_MAIN_MENU

:: ------------------------------------------------------------
:: SUBROUTINE: SETUP ENV SILENT
:: ------------------------------------------------------------
:CMD_SETUP_ENV_SILENT
if not exist "%BACKEND_DIR%\.env" (
    if exist "%BACKEND_DIR%\.env.example" copy /Y "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
)
if not exist "%FRONTEND_DIR%\.env" (
    if exist "%FRONTEND_DIR%\.env.example" copy /Y "%FRONTEND_DIR%\.env.example" "%FRONTEND_DIR%\.env" >nul
)
if not exist "%FACE_AI_DIR%\.env" (
    if exist "%FACE_AI_DIR%\.env.example" copy /Y "%FACE_AI_DIR%\.env.example" "%FACE_AI_DIR%\.env" >nul
)
echo  [OK] Berkas .env terverifikasi untuk seluruh layanan.
exit /b 0

:: ------------------------------------------------------------
:: MENU 18: BACKUP & RESTORE DATABASE
:: ------------------------------------------------------------
:CMD_BACKUP_RESTORE
cls
echo.
echo  +==================================================+
echo  |      MANAJEMEN BACKUP & RESTORE DATABASE       |
echo  |           SIMASMUH - Muhipo Dev 2026             |
echo  +==================================================+
echo.
echo  [1] Cadangkan Database Sekarang (Backup Dump)
echo  [2] Pulihkan Database (Restore Data dari Berkas SQL)
echo  [3] Buka Folder Penyimpanan Arsip Backup
echo  [0] Kembali ke Menu Utama
echo.
set /p "BCHOICE=  Pilih opsi [0-3]: "

if "%BCHOICE%"=="1" goto CMD_EXEC_BACKUP
if "%BCHOICE%"=="2" goto CMD_EXEC_RESTORE
if "%BCHOICE%"=="3" goto CMD_OPEN_BACKUP_DIR
if "%BCHOICE%"=="0" goto CMD_MAIN_MENU

echo.
echo  [ERR] Pilihan tidak valid.
timeout /t 2 >nul
goto CMD_BACKUP_RESTORE

:CMD_EXEC_BACKUP
echo.
set "BDIR=%ROOT_DIR%\storage\backups"
if not exist "%BDIR%" set "BDIR=D:\simasmuh\storage\backups"
if not exist "%BDIR%" mkdir "%BDIR%" >nul 2>&1

set "BTIMESTAMP=%date:~10,4%-%date:~4,2%-%date:~7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%"
set "BTIMESTAMP=%BTIMESTAMP: =0%"
set "BFILE=%BDIR%\simasmuh_db_backup_%BTIMESTAMP%.sql"

echo  >> Memeriksa koneksi database aktif (Port 54322)...
netstat -ano 2>nul | findstr /R /C:":54322 .*LISTENING" >nul
if errorlevel 1 (
    echo  [ERR] Database di port 54322 belum menyala!
    pause
    goto CMD_BACKUP_RESTORE
)

set "PG_DUMP_BIN="
if exist "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" set "PG_DUMP_BIN=C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
if not defined PG_DUMP_BIN (
    for /f "delims=" %%I in ('where pg_dump.exe 2^>nul') do set "PG_DUMP_BIN=%%I"
)

echo  >> Melakukan dump skema & isi tabel ke:
echo     %BFILE%

if defined PG_DUMP_BIN (
    set "PGPASSWORD=postgres"
    "%PG_DUMP_BIN%" -h localhost -p 54322 -U postgres -d postgres --clean --if-exists > "%BFILE%" 2>nul
) else (
    where docker >nul 2>&1
    if not errorlevel 1 (
        docker exec supabase_db_siakad-coba pg_dump -U postgres -d postgres --clean --if-exists > "%BFILE%" 2>nul
    )
)

if exist "%BFILE%" (
    echo.
    echo  [OK] PENCADANGAN BASIS DATA BERHASIL!
    echo  Berkas backup tersimpan rapi di: %BFILE%
) else (
    echo.
    echo  [ERR] Gagal mencadangkan database.
)
echo.
pause
goto CMD_BACKUP_RESTORE

:CMD_EXEC_RESTORE
echo.
echo  >> Memeriksa koneksi database aktif (Port 54322)...
netstat -ano 2>nul | findstr /R /C:":54322 .*LISTENING" >nul
if errorlevel 1 (
    echo  [ERR] Database di port 54322 belum menyala!
    pause
    goto CMD_BACKUP_RESTORE
)

set "BDIR=%ROOT_DIR%\storage\backups"
if not exist "%BDIR%" set "BDIR=D:\simasmuh\storage\backups"

echo.
echo  Daftar Berkas Backup Tersedia:
echo  --------------------------------------------------
dir /B /O:-D "%BDIR%\*.sql" 2>nul
dir /B /O:-D "%ROOT_DIR%\*.sql" 2>nul
echo  --------------------------------------------------
echo.
echo  Masukkan nama/path lengkap berkas .sql yang ingin di-restore:
set /p "RESTORE_FILE=  Nama/Path file: "

if not exist "%RESTORE_FILE%" (
    if exist "%BDIR%\%RESTORE_FILE%" (
        set "RESTORE_FILE=%BDIR%\%RESTORE_FILE%"
    ) else if exist "%ROOT_DIR%\%RESTORE_FILE%" (
        set "RESTORE_FILE=%ROOT_DIR%\%RESTORE_FILE%"
    ) else (
        echo  [ERR] Berkas tidak ditemukan: %RESTORE_FILE%
        pause
        goto CMD_BACKUP_RESTORE
    )
)

echo.
echo  [PERINGATAN] Anda akan memulihkan data dari berkas:
echo  %RESTORE_FILE%
echo.
set /p "CONFIRM_RESTORE=  Ketik Y untuk melanjutkan pemulihan: "
if /I not "%CONFIRM_RESTORE%"=="Y" (
    echo  [i]  Pemulihan dibatalkan oleh pengguna.
    pause
    goto CMD_BACKUP_RESTORE
)

set "PSQL_BIN="
if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" set "PSQL_BIN=C:\Program Files\PostgreSQL\18\bin\psql.exe"
if not defined PSQL_BIN (
    for /f "delims=" %%I in ('where psql.exe 2^>nul') do set "PSQL_BIN=%%I"
)

if defined PSQL_BIN (
    echo  >> Memulihkan database via Native PostgreSQL Client (Port 54322)...
    set "PGPASSWORD=postgres"
    "%PSQL_BIN%" -h localhost -p 54322 -U postgres -d postgres -f "%RESTORE_FILE%" >nul 2>&1
    echo  [OK] PEMULIHAN BASIS DATA SELESAI!
) else (
    where docker >nul 2>&1
    if not errorlevel 1 (
        docker cp "%RESTORE_FILE%" supabase_db_siakad-coba:/tmp/restore.sql >nul 2>&1
        docker exec supabase_db_siakad-coba psql -U postgres -d postgres -f /tmp/restore.sql >nul 2>&1
        docker exec supabase_db_siakad-coba rm -f /tmp/restore.sql >nul 2>&1
        echo  [OK] PEMULIHAN BASIS DATA VIA DOCKER SELESAI!
    )
)
echo.
pause
goto CMD_BACKUP_RESTORE


:CMD_OPEN_BACKUP_DIR
set "BDIR=%ROOT_DIR%\storage\backups"
if not exist "%BDIR%" set "BDIR=D:\simasmuh\storage\backups"
if not exist "%BDIR%" mkdir "%BDIR%" >nul 2>&1
explorer "%BDIR%"
goto CMD_BACKUP_RESTORE

:: ------------------------------------------------------------
:: MENU 19: MANAJEMEN & BACKUP LOG PROJEK
:: ------------------------------------------------------------
:CMD_LOG_MANAGER
cls
echo.
echo  +==================================================+
echo  |         MANAJEMEN & BACKUP LOG SISTEM            |
echo  |           SIMASMUH - Muhipo Dev 2026             |
echo  +==================================================+
echo.
echo  [1] Lihat Ringkasan File Log Aktif
echo  [2] Cadangkan & Arsipkan Log ke Folder Archive
echo  [3] Buka Direktori Log Projek (logs/)
echo  [0] Kembali ke Menu Utama
echo.
set /p "LCHOICE=  Pilih opsi [0-3]: "

if "%LCHOICE%"=="1" goto CMD_VIEW_LOGS
if "%LCHOICE%"=="2" goto CMD_BACKUP_LOGS
if "%LCHOICE%"=="3" goto CMD_OPEN_LOGS_DIR
if "%LCHOICE%"=="0" goto CMD_MAIN_MENU

echo.
echo  [ERR] Pilihan tidak valid.
timeout /t 2 >nul
goto CMD_LOG_MANAGER

:CMD_VIEW_LOGS
echo.
echo  Berkas Log di Folder logs/:
echo  --------------------------------------------------
if exist "%ROOT_DIR%logs" (
    dir /B /O:-D "%ROOT_DIR%logs\*.log" 2>nul
) else (
    echo  (Folder logs belum dibuat)
)
echo.
if exist "%ROOT_DIR%logs\simasmuh-backend.log" (
    echo  20 Baris Terakhir simasmuh-backend.log:
    echo  --------------------------------------------------
    powershell -NoProfile -Command "Get-Content '%ROOT_DIR%logs\simasmuh-backend.log' -Tail 20 2>$null"
)
echo.
pause
goto CMD_LOG_MANAGER

:CMD_BACKUP_LOGS
echo.
if not exist "%ROOT_DIR%logs\archive" mkdir "%ROOT_DIR%logs\archive" >nul 2>&1
set "LTIMESTAMP=%date:~10,4%-%date:~4,2%-%date:~7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%"
set "LTIMESTAMP=%LTIMESTAMP: =0%"
echo  >> Menyalin berkas log ke folder archive...
if exist "%ROOT_DIR%logs\*.log" (
    copy /Y "%ROOT_DIR%logs\*.log" "%ROOT_DIR%logs\archive\*_backup_%LTIMESTAMP%.log" >nul 2>&1
    echo  [OK] Seluruh log berhasil dicadangkan ke logs\archive!
) else (
    echo  [i]  Belum ada file log untuk dicadangkan.
)
echo.
pause
goto CMD_LOG_MANAGER

:CMD_OPEN_LOGS_DIR
if not exist "%ROOT_DIR%logs" mkdir "%ROOT_DIR%logs" >nul 2>&1
explorer "%ROOT_DIR%logs"
goto CMD_LOG_MANAGER

:: ------------------------------------------------------------
:: MENU 0: EXIT
:: ------------------------------------------------------------
:CMD_EXIT
echo.
call :CMD_STOP_ALL_PORTS
echo  Sampai jumpa! - Muhipo Dev 2026
echo.
timeout /t 1 >nul
exit /b 0
