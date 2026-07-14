@echo off
title NP Land - Khoi dong
echo ================================
echo   NP LAND - Kho BDS Nguyen Phat
echo ================================
echo.
echo Dang khoi dong backend (cong 5001)...
start "NP Land - Backend" /min cmd /k "cd /d %~dp0backend && python run_local.py"
timeout /t 3 /nobreak >nul
echo Dang khoi dong giao dien (cong 5173)...
start "NP Land - Frontend" /min cmd /k "cd /d %~dp0frontend && npx vite --port 5173 --host"
timeout /t 4 /nobreak >nul
echo.
echo XONG! Dang mo trinh duyet...
start http://localhost:5173
echo.
echo - Dong cua so nay KHONG tat app.
echo - Muon TAT app: dong 2 cua so "NP Land - Backend" va "NP Land - Frontend" o thanh taskbar.
pause
