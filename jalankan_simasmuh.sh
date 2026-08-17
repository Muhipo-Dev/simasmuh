#!/usr/bin/env bash
# ============================================================
#   SIMASMUH - Script Manajemen Aplikasi (Linux / Debian / Ubuntu)
#   Copyright (C) 2026 - Muhipo Dev
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
FACE_AI_DIR="$ROOT/services/face-attendance"

BACKEND_LOG="$ROOT/backend.log"
FRONTEND_LOG="$ROOT/frontend.log"
PRISMA_STUDIO_LOG="$ROOT/prisma-studio.log"
FACE_AI_LOG="$ROOT/face-ai.log"

BACKEND_PID_FILE="$ROOT/.backend.pid"
FRONTEND_PID_FILE="$ROOT/.frontend.pid"
PRISMA_STUDIO_PID_FILE="$ROOT/.prisma-studio.pid"
FACE_AI_PID_FILE="$ROOT/.face-ai.pid"

# Colors
C_RESET="\033[0m"
C_CYAN="\033[1;36m"
C_GREEN="\033[1;32m"
C_RED="\033[1;31m"
C_YELLOW="\033[1;33m"
C_MAGENTA="\033[1;35m"
C_WHITE="\033[1;37m"
C_GRAY="\033[0;90m"

write_banner() {
    clear 2>/dev/null || true
    echo -e "${C_CYAN}"
    echo "  +==================================================+"
    echo "  |           SIMASMUH - Muhipo Dev 2026             |"
    echo "  |     Sistem Informasi Manajemen SMA MUHIPO        |"
    echo "  |            (Debian / Ubuntu / Linux)             |"
    echo "  +==================================================+"
    echo -e "${C_RESET}"
}

write_status() { echo -e "  ${C_CYAN}>> $1${C_RESET}"; }
write_ok()     { echo -e "  ${C_GREEN}[OK] $1${C_RESET}"; }
write_err()    { echo -e "  ${C_RED}[ERR] $1${C_RESET}"; }
write_info()   { echo -e "  ${C_YELLOW}[i]  $1${C_RESET}"; }

get_stored_pid() {
    local pid_file="$1"
    if [ -f "$pid_file" ]; then
        local pid_val
        pid_val=$(cat "$pid_file" 2>/dev/null | tr -d ' \r\n')
        if [[ "$pid_val" =~ ^[0-9]+$ ]]; then
            echo "$pid_val"
            return
        fi
    fi
    echo ""
}

test_process_running() {
    local pid="$1"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        return 0
    fi
    return 1
}

stop_process_by_pid() {
    local pid="$1"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        kill -15 "$pid" 2>/dev/null || true
        sleep 1
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi
    fi
}

stop_port_process() {
    local port="$1"
    if command -v fuser >/dev/null 2>&1; then
        fuser -k -n tcp "$port" >/dev/null 2>&1 || true
    elif command -v lsof >/dev/null 2>&1; then
        local pids
        pids=$(lsof -t -i :"$port" 2>/dev/null || true)
        if [ -n "$pids" ]; then
            kill -9 $pids 2>/dev/null || true
        fi
    elif command -v ss >/dev/null 2>&1; then
        local pids
        pids=$(ss -lptn "sport = :$port" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2)
        if [ -n "$pids" ]; then
            kill -9 $pids 2>/dev/null || true
        fi
    fi
}

test_port_listening() {
    local port="$1"
    if command -v nc >/dev/null 2>&1; then
        nc -z 127.0.0.1 "$port" 2>/dev/null && return 0
    fi
    if command -v ss >/dev/null 2>&1; then
        ss -lptn "sport = :$port" 2>/dev/null | grep -q "LISTEN" && return 0
    fi
    if command -v lsof >/dev/null 2>&1; then
        lsof -i :"$port" -sTCP:LISTEN >/dev/null 2>&1 && return 0
    fi
    return 1
}

test_database_connection() {
    local env_file="$BACKEND_DIR/.env"
    if [ ! -f "$env_file" ]; then
        return 1
    fi
    if (cd "$BACKEND_DIR" && node -e "
        require('dotenv').config();
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
        pool.query('SELECT 1').then(() => { process.exit(0); }).catch(() => { process.exit(1); });
    " >/dev/null 2>&1); then
        return 0
    fi
    return 1
}

get_app_status() {
    local b_pid
    local f_pid
    local p_pid
    b_pid=$(get_stored_pid "$BACKEND_PID_FILE")
    f_pid=$(get_stored_pid "$FRONTEND_PID_FILE")
    p_pid=$(get_stored_pid "$PRISMA_STUDIO_PID_FILE")

    local b_running=false
    local f_running=false
    local a_running=false
    local s_running=false
    local p_running=false

    test_port_listening 3001 && b_running=true
    test_port_listening 3000 && f_running=true
    test_port_listening 8005 && a_running=true
    test_port_listening 54322 && s_running=true
    test_port_listening 51212 && p_running=true

    echo "  +--------------------+--------------------------+"
    echo "  |   STATUS LAYANAN SIMASMUH                     |"
    echo "  +--------------------+--------------------------+"
    echo -n "  | Frontend (Web)     | "
    if [ "$f_running" = true ]; then
        echo -e "${C_GREEN}AKTIF :3000${C_RESET}               |"
    else
        echo -e "${C_RED}MATI${C_RESET}                      |"
    fi

    echo -n "  | Backend (API)      | "
    if [ "$b_running" = true ]; then
        echo -e "${C_GREEN}AKTIF :3001${C_RESET}               |"
    else
        echo -e "${C_RED}MATI${C_RESET}                      |"
    fi

    echo -n "  | AI Face Attendance | "
    if [ "$a_running" = true ]; then
        echo -e "${C_GREEN}AKTIF (YOLOv11) :8005${C_RESET}     |"
    else
        echo -e "${C_GRAY}MATI${C_RESET}                      |"
    fi

    echo -n "  | Supabase (Docker)  | "
    if [ "$s_running" = true ]; then
        echo -e "${C_GREEN}AKTIF (Docker) :54323${C_RESET}     |"
    else
        echo -e "${C_YELLOW}MATI${C_RESET}                      |"
    fi

    echo -n "  | Prisma Studio (ERD)| "
    if [ "$p_running" = true ]; then
        echo -e "${C_GREEN}AKTIF :51212${C_RESET}             |"
    else
        echo -e "${C_GRAY}MATI${C_RESET}                      |"
    fi

    echo -n "  | Database Ping (DB) | "
    if test_database_connection; then
        echo -e "${C_GREEN}TERHUBUNG${C_RESET}                 |"
    else
        echo -e "${C_RED}TERPUTUS${C_RESET}                  |"
    fi
    echo "  +--------------------+--------------------------+"
    echo ""
}

start_supabase_docker() {
    write_status "Memeriksa status Supabase (Docker)..."
    if test_port_listening 54322; then
        write_ok "Supabase (Docker) aktif di port 54322 (DB) & 54323 (Studio)"
        return 0
    fi

    if ! command -v docker >/dev/null 2>&1; then
        write_info "Docker CLI tidak terdeteksi. Lewati startup otomatis Supabase."
        return 1
    fi

    write_status "Menjalankan Supabase di Docker (npx supabase start)..."
    (cd "$ROOT" && npx supabase start) || true

    if test_port_listening 54322; then
        write_ok "Supabase (Docker) berhasil dijalankan!"
        return 0
    fi
    write_info "Supabase Docker belum aktif atau sedang proses startup."
    return 1
}

start_prisma_studio() {
    write_status "Menjalankan Prisma Studio (port 51212)..."
    if test_port_listening 51212; then
        write_ok "Prisma Studio sudah aktif -> http://localhost:51212"
        return 0
    fi

    local p_pid
    p_pid=$(get_stored_pid "$PRISMA_STUDIO_PID_FILE")
    stop_process_by_pid "$p_pid"
    stop_port_process 51212
    rm -f "$PRISMA_STUDIO_PID_FILE" "$PRISMA_STUDIO_LOG"

    cd "$BACKEND_DIR"
    nohup npx prisma studio --port 51212 --browser none > "$PRISMA_STUDIO_LOG" 2>&1 &
    local new_pid=$!
    echo "$new_pid" > "$PRISMA_STUDIO_PID_FILE"

    sleep 2
    if test_port_listening 51212; then
        write_ok "Prisma Studio aktif -> http://localhost:51212"
        return 0
    fi
    write_info "Prisma Studio berjalan di latar belakang (port 51212)."
    return 0
}

stop_prisma_studio() {
    write_status "Menonaktifkan Prisma Studio (port 51212)..."
    local p_pid
    p_pid=$(get_stored_pid "$PRISMA_STUDIO_PID_FILE")
    stop_process_by_pid "$p_pid"
    stop_port_process 51212
    rm -f "$PRISMA_STUDIO_PID_FILE"
    write_ok "Prisma Studio dinonaktifkan."
}

start_backend() {
    local mode="${1:-Production}"
    write_status "Menjalankan Backend ($mode) di port 3001..."

    local b_pid
    b_pid=$(get_stored_pid "$BACKEND_PID_FILE")
    stop_process_by_pid "$b_pid"
    stop_port_process 3001
    rm -f "$BACKEND_PID_FILE" "$BACKEND_LOG"

    cd "$BACKEND_DIR"
    if [ "$mode" = "Development" ]; then
        nohup npm run start:dev > "$BACKEND_LOG" 2>&1 &
    elif [ "$mode" = "Debug" ]; then
        nohup npm run start:debug > "$BACKEND_LOG" 2>&1 &
    else
        if [ ! -f "$BACKEND_DIR/dist/main.js" ]; then
            write_info "Build backend belum ada. Mem-build..."
            npm run build
        fi
        nohup npm run start:prod > "$BACKEND_LOG" 2>&1 &
    fi

    local new_pid=$!
    echo "$new_pid" > "$BACKEND_PID_FILE"

    # Wait for ready
    echo -n "  "
    for i in {1..45}; do
        sleep 1
        echo -n "."
        if grep -qE "Nest application successfully started|Application is running on" "$BACKEND_LOG" 2>/dev/null || test_port_listening 3001; then
            echo ""
            write_ok "Backend aktif di port 3001"
            return 0
        fi
        if ! test_process_running "$new_pid"; then
            echo ""
            write_err "Backend berhenti tiba-tiba. Periksa: $BACKEND_LOG"
            return 1
        fi
    done
    echo ""
    if test_port_listening 3001; then
        write_ok "Backend aktif di port 3001"
        return 0
    fi
    write_err "Backend gagal dimulai. Periksa log: $BACKEND_LOG"
    return 1
}

start_frontend() {
    local mode="${1:-Production}"
    write_status "Menjalankan Frontend ($mode) di port 3000..."

    local f_pid
    f_pid=$(get_stored_pid "$FRONTEND_PID_FILE")
    stop_process_by_pid "$f_pid"
    stop_port_process 3000
    rm -f "$FRONTEND_PID_FILE" "$FRONTEND_LOG"

    cd "$FRONTEND_DIR"
    if [ "$mode" = "Development" ] || [ "$mode" = "Fallback" ]; then
        nohup npm run dev -- -p 3000 -H 0.0.0.0 > "$FRONTEND_LOG" 2>&1 &
    elif [ "$mode" = "Preview" ]; then
        NODE_ENV=preview nohup npm run dev -- -p 3000 -H 0.0.0.0 > "$FRONTEND_LOG" 2>&1 &
    elif [ "$mode" = "Staging" ]; then
        NODE_ENV=staging nohup npm run dev -- -p 3000 -H 0.0.0.0 > "$FRONTEND_LOG" 2>&1 &
    else
        if [ ! -d "$FRONTEND_DIR/.next" ]; then
            write_info "Build frontend belum ada. Mem-build..."
            npm run build
        fi
        nohup npm run start -- -p 3000 -H 0.0.0.0 > "$FRONTEND_LOG" 2>&1 &
    fi

    local new_pid=$!
    echo "$new_pid" > "$FRONTEND_PID_FILE"

    echo -n "  "
    for i in {1..45}; do
        sleep 1
        echo -n "."
        if grep -qE "Ready in|started server on|Listening on" "$FRONTEND_LOG" 2>/dev/null || test_port_listening 3000; then
            echo ""
            write_ok "Frontend aktif di port 3000"
            return 0
        fi
        if ! test_process_running "$new_pid"; then
            echo ""
            write_err "Frontend berhenti tiba-tiba. Periksa: $FRONTEND_LOG"
            return 1
        fi
    done
    echo ""
    if test_port_listening 3000; then
        write_ok "Frontend aktif di port 3000"
        return 0
    fi
    write_err "Frontend gagal dimulai. Periksa log: $FRONTEND_LOG"
    return 1
}

start_face_ai() {
    write_status "Menjalankan Face Attendance AI Service (Python YOLOv11 di port 8005)..."
    if test_port_listening 8005; then
        write_ok "Face AI Service sudah aktif -> http://localhost:8005"
        return 0
    fi

    if ! command -v python3 >/dev/null 2>&1 && ! command -v python >/dev/null 2>&1; then
        write_info "Python runtime tidak terdeteksi. Lewati startup otomatis Face AI."
        return 1
    fi

    local py_cmd="python3"
    command -v python3 >/dev/null 2>&1 || py_cmd="python"

    local a_pid
    a_pid=$(get_stored_pid "$FACE_AI_PID_FILE")
    stop_process_by_pid "$a_pid"
    stop_port_process 8005
    rm -f "$FACE_AI_PID_FILE" "$FACE_AI_LOG"

    cd "$FACE_AI_DIR"
    nohup $py_cmd main.py > "$FACE_AI_LOG" 2>&1 &
    local new_pid=$!
    echo "$new_pid" > "$FACE_AI_PID_FILE"

    sleep 2
    if test_port_listening 8005; then
        write_ok "Face AI Service aktif -> http://localhost:8005"
        return 0
    fi
    write_info "Face AI Service berjalan di latar belakang (port 8005)."
    return 0
}

start_apps() {
    local mode="${1:-Production}"
    write_status "Memulai SIMASMUH + SUPABASE + PRISMA STUDIO + AI FACE ($mode)..."
    start_supabase_docker || true
    echo ""
    start_backend "$mode" && start_frontend "$mode" && start_face_ai || true
    start_prisma_studio || true
    echo ""
    echo -e "${C_GREEN}  +==========================================================+"
    echo -e "  | SIMASMUH + SUPABASE + PRISMA STUDIO + AI FACE AKTIF!     |"
    echo -e "  | - Aplikasi Web     : http://localhost:3000               |"
    echo -e "  | - Backend API      : http://localhost:3001               |"
    echo -e "  | - Face AI Service  : http://localhost:8005               |"
    echo -e "  | - Prisma Studio    : http://localhost:51212              |"
    echo -e "  | - Supabase Studio  : http://localhost:54323              |"
    echo -e "  +==========================================================+${C_RESET}"
}

stop_apps() {
    write_status "Menghentikan semua proses SIMASMUH..."
    local b_pid
    local f_pid
    local p_pid
    local a_pid
    b_pid=$(get_stored_pid "$BACKEND_PID_FILE")
    f_pid=$(get_stored_pid "$FRONTEND_PID_FILE")
    p_pid=$(get_stored_pid "$PRISMA_STUDIO_PID_FILE")
    a_pid=$(get_stored_pid "$FACE_AI_PID_FILE")

    stop_process_by_pid "$b_pid"
    stop_process_by_pid "$f_pid"
    stop_process_by_pid "$p_pid"
    stop_process_by_pid "$a_pid"
    stop_port_process 3001
    stop_port_process 3000
    stop_port_process 8005
    stop_port_process 51212

    rm -f "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE" "$PRISMA_STUDIO_PID_FILE" "$FACE_AI_PID_FILE"
    write_ok "Semua layanan berhasil dihentikan."
}

start_setup_env() {
    write_banner
    write_status "Menyiapkan file .env..."

    if [ ! -f "$BACKEND_DIR/.env" ] && [ -f "$BACKEND_DIR/.env.example" ]; then
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
        write_ok "Dibuat: backend/.env (dari .env.example)"
    else
        write_info "backend/.env sudah ada, tidak ditimpa."
    fi

    if [ ! -f "$FRONTEND_DIR/.env" ] && [ -f "$FRONTEND_DIR/.env.example" ]; then
        cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
        write_ok "Dibuat: frontend/.env (dari .env.example)"
    else
        write_info "frontend/.env sudah ada, tidak ditimpa."
    fi

    write_ok "Setup .env selesai."
}

start_install_dependencies() {
    write_banner
    write_status "Menginstall dependencies Backend (npm)..."
    (cd "$BACKEND_DIR" && npm install)

    write_status "Menginstall dependencies Frontend (npm)..."
    (cd "$FRONTEND_DIR" && npm install)

    write_status "Menginstall dependencies Face Attendance AI YOLOv11 (pip)..."
    if command -v pip3 >/dev/null 2>&1; then
        (cd "$FACE_AI_DIR" && pip3 install -r requirements.txt) || true
    elif command -v pip >/dev/null 2>&1; then
        (cd "$FACE_AI_DIR" && pip install -r requirements.txt) || true
    fi

    write_ok "Instalasi dependencies selesai!"
}

start_environment_setup() {
    write_banner
    echo -e "${C_CYAN}  +==================================================+"
    echo -e "  |   PERSIAPAN LINGKUNGAN / SETUP SERVER BARU       |"
    echo -e "  +==================================================+${C_RESET}"
    echo "  Otomatis menyiapkan SIMASMUH pada Linux (Debian/Ubuntu/Server)."
    echo ""

    write_status "1/6. Menyiapkan berkas konfigurasi .env..."
    start_setup_env

    write_status "2/6. Memeriksa runtime Node.js & npm..."
    local node_v
    local npm_v
    node_v=$(node -v 2>/dev/null || echo "N/A")
    npm_v=$(npm -v 2>/dev/null || echo "N/A")
    write_ok "Node.js: $node_v | npm: $npm_v"

    write_status "3/6. Menginstall/memperbarui Dependencies..."
    start_install_dependencies

    write_status "4/6. Menyesuaikan Prisma Client engine untuk Linux..."
    (cd "$BACKEND_DIR" && npx prisma generate)
    write_ok "Prisma Client siap digunakan!"

    write_status "5/6. Menyiapkan folder penyimpanan foto terisolasi (simasmuh_storage)..."
    (cd "$BACKEND_DIR" && npx ts-node -e "import { initStorageDirectories, STORAGE_ROOT } from './src/modules/core/config/storage.config'; initStorageDirectories(); console.log('Storage initialized at:', STORAGE_ROOT);") || true
    write_ok "Direktori external storage siap!"

    write_status "6/6. Memeriksa koneksi database..."
    if test_database_connection; then
        write_ok "Database terhubung dengan sukses!"
    else
        write_info "Database belum dapat dijangkau. Pastikan DATABASE_URL di backend/.env sudah sesuai."
    fi

    echo ""
    write_ok "Persiapan lingkungan selesai! Anda kini siap menjalankan aplikasi."
}

show_logs() {
    write_banner
    echo "  Log Backend:"
    tail -n 20 "$BACKEND_LOG" 2>/dev/null || echo "  (Belum ada log)"
    echo ""
    echo "  Log Frontend:"
    tail -n 20 "$FRONTEND_LOG" 2>/dev/null || echo "  (Belum ada log)"
    echo ""
    echo "  Log Prisma Studio:"
    tail -n 20 "$PRISMA_STUDIO_LOG" 2>/dev/null || echo "  (Belum ada log)"
    echo ""
}

# ─── DIRECT CLI ───────────────────────────────────────────────
if [ -n "$1" ]; then
    case "$(echo "$1" | tr '[:upper:]' '[:lower:]')" in
        *setup*)
            start_environment_setup
            exit 0
            ;;
        *dev*)
            start_apps "Development"
            exit 0
            ;;
        *prod*)
            start_apps "Production"
            exit 0
            ;;
        *debug*)
            start_apps "Debug"
            exit 0
            ;;
        *stop*)
            stop_apps
            exit 0
            ;;
        *restart*)
            stop_apps
            sleep 1
            start_apps "Production"
            exit 0
            ;;
    esac
fi

# ─── MAIN MENU ────────────────────────────────────────────────
while true; do
    write_banner
    get_app_status

    echo -e "${C_CYAN}  +=========================================+"
    echo -e "  |               MENU UTAMA                |"
    echo -e "  +=========================================+${C_RESET}"
    echo "  |  [1] Mulai Aplikasi (Mode Development)  |"
    echo "  |  [2] Mulai Aplikasi (Mode Production)   |"
    echo "  |  [3] Mulai Aplikasi (Testing/Debugging) |"
    echo "  |  [4] Mulai Aplikasi (Mode Preview)      |"
    echo "  |  [5] Mulai Aplikasi (Mode Staging)      |"
    echo "  |  [6] Mulai Aplikasi (Mode Fallback)     |"
    echo "  |  [7] Restart Aplikasi                   |"
    echo "  |  [8] Rebuild & Restart (Full)           |"
    echo "  |  [9] Stop Aplikasi                      |"
    echo "  |  [10] Build Aplikasi                    |"
    echo "  |  [11] Lihat Log Server                  |"
    echo "  |  [12] Setup File .env                   |"
    echo "  |  [13] Install Dependencies              |"
    echo -e "  |  ${C_GREEN}[14] Setup Lingkungan Baru / Server${C_RESET}    |"
    echo "  |  [0] Keluar dari Script                 |"
    echo -e "${C_CYAN}  +=========================================+${C_RESET}"
    echo ""

    read -rp "  Pilih menu: " choice

    case "$choice" in
        1)  start_apps "Development"; read -rp "  Tekan ENTER untuk kembali" ;;
        2)  start_apps "Production"; read -rp "  Tekan ENTER untuk kembali" ;;
        3)  start_apps "Debug"; read -rp "  Tekan ENTER untuk kembali" ;;
        4)  start_apps "Preview"; read -rp "  Tekan ENTER untuk kembali" ;;
        5)  start_apps "Staging"; read -rp "  Tekan ENTER untuk kembali" ;;
        6)  start_apps "Fallback"; read -rp "  Tekan ENTER untuk kembali" ;;
        7)  stop_apps; sleep 1; start_apps "Production"; read -rp "  Tekan ENTER untuk kembali" ;;
        8)  stop_apps; (cd "$BACKEND_DIR" && npm run build); (cd "$FRONTEND_DIR" && npm run build); start_apps "Production"; read -rp "  Tekan ENTER untuk kembali" ;;
        9)  stop_apps; read -rp "  Tekan ENTER untuk kembali" ;;
        10) (cd "$BACKEND_DIR" && npm run build); (cd "$FRONTEND_DIR" && npm run build); read -rp "  Tekan ENTER untuk kembali" ;;
        11) show_logs; read -rp "  Tekan ENTER untuk kembali" ;;
        12) start_setup_env; read -rp "  Tekan ENTER untuk kembali" ;;
        13) start_install_dependencies; read -rp "  Tekan ENTER untuk kembali" ;;
        14) start_environment_setup; read -rp "  Tekan ENTER untuk kembali" ;;
        0)  echo "Sampai jumpa!"; break ;;
        *)  write_err "Pilihan tidak valid."; sleep 1 ;;
    esac
done
