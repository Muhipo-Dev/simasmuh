@echo off
:: ============================================================
::   SIMASMUH - Fix Port Database Reservation (Admin)
::   Muhipo Dev (C) 2026
:: ============================================================
echo [1/3] Merestart Windows NAT Service untuk melepaskan port yang terblokir...
net stop winnat
net start winnat

echo [2/3] Mengatur TCP Dynamic Port Range ke standar IANA...
netsh int ipv4 set dynamicport tcp start=49152 num=16384

echo [3/3] Selesai! Sekarang port 54321-54324 sudah bebas dan Supabase dapat dijalankan.
pause
