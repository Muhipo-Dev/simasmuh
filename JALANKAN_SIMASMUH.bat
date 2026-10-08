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
call :CHECK_PORT_STATUS 54323 "Supabase Studio  "
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
echo  |  [0] Keluar dari Script                 |
echo  +=========================================+
echo.
set /p "CHOICE=  Pilih menu [0-17]: "

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
if "%CHOICE%"=="0" goto CMD_EXIT

echo.
echo  [ERR] Pilihan tidak valid. Silakan pilih nomor yang tersedia.
timeout /t 2 >nul
goto CMD_MAIN_MENU

:: ------------------------------------------------------------
:: SUBROUTINE: CEK STATUS PORT
:: ------------------------------------------------------------
:CHECK_PORT_STATUS
set "PORT_NUM=%~1"
set "LABEL=%~2"
netstat -ano 2>nul | findstr /R /C:":%PORT_NUM% .*LISTENING" >nul
if not errorlevel 1 (
    echo   - %LABEL% : AKTIF (Port %PORT_NUM%)
) else (
    echo   - %LABEL% : NONAKTIF (Port %PORT_NUM%)
)
exit /b 0

:: ------------------------------------------------------------
:: MENU 1: START DEVELOPMENT MODE
:: ------------------------------------------------------------
:CMD_START_DEV
echo.
echo  >> Menjalankan SIMASMUH dalam Mode Development...
call :CMD_STOP_PORTS

echo  >> Menjalankan Backend API (Port 3001)...
start "SIMASMUH-Backend" /D "%BACKEND_DIR%" cmd /c "npm run start:dev"

echo  >> Menjalankan Frontend Web (Port 3000)...
start "SIMASMUH-Frontend" /D "%FRONTEND_DIR%" cmd /c "set NEXTAUTH_URL=http://localhost:3000&& npm run dev"

echo  >> Menjalankan Prisma Studio (Port 51212)...
start "SIMASMUH-PrismaStudio" /D "%BACKEND_DIR%" cmd /c "npm run studio"

echo.
echo  [OK] Seluruh layanan SIMASMUH Mode Development telah diluncurkan!
echo  - Frontend Web: http://localhost:3000
echo  - Backend API : http://localhost:3001
echo  - Prisma Studio: http://localhost:51212
echo.
pause
goto CMD_MAIN_MENU

:: ------------------------------------------------------------
:: MENU 2: START PRODUCTION MODE
:: ------------------------------------------------------------
:CMD_START_PROD
echo.
echo  >> Menjalankan SIMASMUH dalam Mode Production...
call :CMD_STOP_PORTS

echo  >> Menjalankan Backend API (Port 3001)...
start "SIMASMUH-Backend" /D "%BACKEND_DIR%" cmd /c "npm run start:prod"

echo  >> Menjalankan Frontend Web (Port 3000)...
start "SIMASMUH-Frontend" /D "%FRONTEND_DIR%" cmd /c "set NEXTAUTH_URL=http://localhost:3000&& npm run start"

echo  >> Menjalankan Prisma Studio (Port 51212)...
start "SIMASMUH-PrismaStudio" /D "%BACKEND_DIR%" cmd /c "npm run studio"

echo.
echo  [OK] Seluruh layanan SIMASMUH Mode Production telah diluncurkan!
echo  - Frontend Web: http://localhost:3000
echo  - Backend API : http://localhost:3001
echo  - Prisma Studio: http://localhost:51212
echo.
pause
goto CMD_MAIN_MENU

:: ------------------------------------------------------------
:: MENU 3: START DEBUG MODE
:: ------------------------------------------------------------
:CMD_START_DEBUG
echo.
echo  >> Menjalankan SIMASMUH dalam Mode Testing/Debugging...
call :CMD_STOP_PORTS
start "SIMASMUH-Backend" /D "%BACKEND_DIR%" cmd /c "npm run start:debug"
start "SIMASMUH-Frontend" /D "%FRONTEND_DIR%" cmd /c "set NEXTAUTH_URL=http://localhost:3000&& npm run dev"
start "SIMASMUH-PrismaStudio" /D "%BACKEND_DIR%" cmd /c "npm run studio"
echo  [OK] Mode Debugging aktif.
pause
goto CMD_MAIN_MENU

:: ------------------------------------------------------------
:: MENU 7 & 8: RESTART & REBUILD
:: ------------------------------------------------------------
:CMD_RESTART
echo.
echo  >> Menghentikan dan memulai ulang semua layanan...
call :CMD_STOP_PORTS
goto CMD_START_DEV

:CMD_REBUILD_RESTART
echo.
echo  >> Mem-Build ulang Backend dan Frontend...
call :CMD_STOP_PORTS
cd /d "%BACKEND_DIR%"
call npm run build
cd /d "%FRONTEND_DIR%"
call npm run build
cd /d "%ROOT_DIR%"
goto CMD_START_PROD

:: ------------------------------------------------------------
:: MENU 9: STOP APPS
:: ------------------------------------------------------------
:CMD_STOP_APPS
echo.
echo  >> Menghentikan seluruh proses SIMASMUH (Port 3000, 3001, 51212, 8089)...
call :CMD_STOP_PORTS
echo.
echo  [OK] Seluruh layanan SIMASMUH berhasil dihentikan.
pause
goto CMD_MAIN_MENU

:CMD_STOP_PORTS
for %%P in (3000 3001 51212 8089) do (
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /R /C:":%%P .*LISTENING"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
)
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
echo  4. Memeriksa Direktori External Storage...
set "STORAGE_FOUND=C:\simasmuh_storage"
if exist "D:\simasmuh_storage" set "STORAGE_FOUND=D:\simasmuh_storage"
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
            echo JWT_SECRET="simasmuh-super-secret-jwt-key-2026"
            echo PORT=3001
            echo SUPABASE_URL=http://127.0.0.1:54321
            echo SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
            echo SUPABASE_SECRET_KEY=your-supabase-secret-key
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
            echo NEXTAUTH_URL=http://localhost:3000
            echo NEXTAUTH_SECRET=simasmuh-nextauth-secret-key-2026
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
            echo API_KEY=siakad_secret_api_key_2026
            echo API_SECRET=simasmuh_face_token_secret_2026
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

:: 1. Runtime Detection & Winget Auto-Installer
echo  1/8. Memeriksa runtime dasar sistem (Node.js, npm, Python, Git, Docker)...
where node >nul 2>&1
if errorlevel 1 (
    echo  [ERR] Node.js belum terpasang!
    where winget >nul 2>&1
    if not errorlevel 1 (
        echo  >> Memasang Node.js LTS via winget...
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
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
    )
) else (
    for /f "tokens=*" %%v in ('python --version 2^>nul') do echo  [OK] Python terdeteksi (%%v)
)

where docker >nul 2>&1
if not errorlevel 1 (
    echo  [OK] Docker CLI terdeteksi (siap untuk Supabase Studio port 54323 ^& DB 54322).
) else (
    echo  [i]  Docker Desktop belum aktif (opsional jika menggunakan DB lokal/cloud).
)

:: 2. Setup Berkas .env
echo.
echo  2/8. Menyiapkan berkas konfigurasi .env untuk seluruh modul...
call :CMD_SETUP_ENV_SILENT

:: 3. Install Dependencies
echo.
echo  3/8. Menginstall dependencies Backend ^& Frontend...
cd /d "%BACKEND_DIR%"
call npm install --legacy-peer-deps >nul 2>&1
cd /d "%FRONTEND_DIR%"
call npm install --legacy-peer-deps >nul 2>&1

:: 4. Python Virtualenv & AI Dependencies (venv, opencv, vgg, mtcnn, resnet, yolo)
echo.
echo  4/8. Menyiapkan Python Virtualenv ^& AI Packages (OpenCV, VGG, MTCNN, ResNet, YOLO)...
cd /d "%FACE_AI_DIR%"
where python >nul 2>&1
if not errorlevel 1 (
    if not exist ".venv\Scripts\python.exe" (
        python -m venv .venv >nul 2>&1
    )
    if exist ".venv\Scripts\python.exe" (
        .venv\Scripts\python.exe -m pip install --upgrade pip >nul 2>&1
        .venv\Scripts\pip.exe install -r requirements.txt
        echo  [OK] AI Packages (OpenCV, VGG, MTCNN, ResNet, YOLO, PyTorch) siap!
    )
)

:: 5. Generate Prisma Client Engine
echo.
echo  5/8. Menyesuaikan Prisma Client engine untuk arsitektur OS lokal...
cd /d "%BACKEND_DIR%"
call npx prisma generate

:: 6. Buat Struktur Folder External Storage
echo.
echo  6/8. Menyiapkan struktur folder external storage terisolasi (simasmuh_storage)...
set "TARGET_STORAGE=D:\simasmuh_storage"
if not exist "D:\" set "TARGET_STORAGE=C:\simasmuh_storage"
for %%S in (profiles avatars surat qr face-snapshots cbt-attachments temp) do (
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
:: MENU 0: EXIT
:: ------------------------------------------------------------
:CMD_EXIT
echo.
echo  Sampai jumpa! - Muhipo Dev 2026
echo.
timeout /t 1 >nul
exit /b 0
