@echo off
echo =====================================
echo Portfolio Site Deployment Script
echo =====================================
echo.

REM Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

REM Check git status
echo Checking repository status...
git status --short

REM Ask user to continue
echo.
set /p confirm="Do you want to commit and deploy these changes? (y/n): "
if /i not "%confirm%"=="y" (
    echo Deployment cancelled.
    pause
    exit /b 0
)

REM Get commit message
echo.
set /p message="Enter commit message: "
if "%message%"=="" set message=Update portfolio content

REM Stage all changes
echo.
echo Staging changes...
git add .

REM Commit changes
echo Committing changes...
git commit -m "%message%"
if %errorlevel% neq 0 (
    echo No changes to commit or commit failed.
    pause
    exit /b 1
)

REM Push to GitHub
echo.
echo Pushing to GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo ERROR: Failed to push to GitHub
    echo Please check your internet connection and GitHub credentials
    pause
    exit /b 1
)

echo.
echo =====================================
echo SUCCESS! Your changes have been deployed!
echo =====================================
echo.
echo GitHub: https://github.com/bjpl/portfolio_site
echo.
echo If you have Netlify connected, your site will auto-deploy in ~30 seconds
echo.
pause