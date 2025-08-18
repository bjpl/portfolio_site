@echo off
echo ========================================
echo    Hugo Dev Portfolio Admin System
echo ========================================
echo.

REM Kill any existing Node processes on port 3000
echo Stopping any existing servers...
for /f "tokens=5" %%a in ("netstat -aon ^| findstr :3000 ^| findstr LISTENING") do (
    taskkill /F /PID %%a 2>nul
)

echo Starting backend server...
start /B cmd /c "cd backend && npm run dev"

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo    Admin Panel Ready\!
echo ========================================
echo.
echo Backend API:  http://localhost:3000
echo Admin Panel:  http://localhost:3000/admin/dashboard.html
echo System Check: http://localhost:3000/admin/system-check.html
echo.
echo Default Login:
echo   Username: admin
echo   Password: admin123
echo.
echo Press Ctrl+C to stop the server
echo ========================================

REM Open the admin panel in default browser
start http://localhost:3000/admin/dashboard.html

REM Keep the window open
pause >nul
