@echo off
echo Starting Portfolio Site Services...
echo ================================

REM Start Hugo in a new window
start "Hugo Server" /D "%~dp0" cmd /k hugo server

REM Wait a moment for Hugo to start
timeout /t 3 /nobreak > nul

REM Start Backend API in a new window
start "Backend API" /D "%~dp0backend" cmd /k "npm run start:simple"

echo.
echo Services Started!
echo ================
echo Hugo:    http://localhost:1313
echo API:     http://localhost:3335
echo Admin:   http://localhost:1313/admin/login.html
echo.
echo Login: admin / password123
echo.
echo Press any key to open the site...
pause > nul
start http://localhost:1313