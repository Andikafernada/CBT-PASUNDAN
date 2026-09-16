@echo off
title PASANG CBT EXAMBROWSER - LAB KOMPUTER
color 0b

echo ================================================================
echo    MEMASANG CBT EXAMBROWSER DARI SERVER KE DESKTOP PC LAB
echo ================================================================
echo.
echo [1/2] Mengunduh CBT_EXAMBROWSER.exe dari Server (172.16.0.210)...
curl -s -o "C:\Users\Public\Desktop\CBT_EXAMBROWSER.exe" "http://172.16.0.210/download/CBT_EXAMBROWSER.exe"
if not exist "C:\Users\Public\Desktop\CBT_EXAMBROWSER.exe" (
    echo [Mencoba via PowerShell...]
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('http://172.16.0.210/download/CBT_EXAMBROWSER.exe', 'C:\Users\Public\Desktop\CBT_EXAMBROWSER.exe')"
)

echo [2/2] Mengunduh config.json...
curl -s -o "C:\Users\Public\Desktop\config.json" "http://172.16.0.210/download/config.json"
if not exist "C:\Users\Public\Desktop\config.json" (
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('http://172.16.0.210/download/config.json', 'C:\Users\Public\Desktop\config.json')"
)

echo.
if exist "C:\Users\Public\Desktop\CBT_EXAMBROWSER.exe" (
    echo ================================================================
    echo   [BERHASIL] CBT EXAMBROWSER TELAH TERPASANG DI DESKTOP!
    echo ================================================================
    echo Ikon CBT_EXAMBROWSER.exe sudah muncul di Desktop komputer ini.
) else (
    echo [ERROR] Gagal mengunduh file dari server 172.16.0.210.
    echo Pastikan komputer ini terhubung ke jaringan lab/server CBT.
    pause
    exit /b 1
)

timeout /t 3 >nul
exit /b 0
