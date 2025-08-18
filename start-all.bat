@echo off
echo ========================================
echo Starting Portfolio Site System
echo ========================================
echo.

REM Kill any existing processes on our ports
echo Cleaning up old processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

REM Start Hugo server in development mode
echo Starting Hugo server on http://localhost:1313
start "Hugo Server" cmd /k "hugo server -D --disableFastRender"

REM Wait for Hugo to start
timeout /t 3 /nobreak >nul

REM Start the CMS backend server
echo Starting CMS backend on http://localhost:3334
start "CMS Backend" cmd /k "cd backend && PORT=3334 node src/simple-cms-server.js"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo SYSTEM READY!
echo ========================================
echo.
echo Live Site:    http://localhost:1313
echo Admin Panel:  http://localhost:3334/admin
echo.
echo Portfolio:    http://localhost:1313/portfolio/
echo Admin Editor: http://localhost:3334/admin/simple-editor.html
echo.
echo ========================================
echo.
echo Press Ctrl+C in each window to stop servers
echo.

REM Open the admin dashboard in browser
timeout /t 2 /nobreak >nul
start chrome http://localhost:3334/admin/dashboard.html
start chrome http://localhost:1313