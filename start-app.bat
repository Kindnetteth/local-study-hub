@echo off
title Flashcard Study App
color 0A

echo.
echo ========================================
echo   Flashcard Study App Launcher
echo ========================================
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] npm is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Node.js includes npm which is required to run this app.
    echo.
    pause
    exit /b 1
)

echo [OK] npm is installed
echo.

REM Always ensure dependencies are installed
echo [INFO] Checking dependencies...
echo.
call npm install
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERROR] Failed to install dependencies!
    echo.
    pause
    exit /b 1
)
echo.
echo [OK] Dependencies ready!
echo.

echo [INFO] Starting the app...
echo.
echo The app will open automatically in your default browser.
echo Press Ctrl+C to stop the server when you're done.
echo.
echo ========================================
echo.

REM Start the development server on port 5174 and open browser
start "" http://localhost:5174
call npm run dev -- --port 5174

echo.
echo ========================================
echo Server stopped. You can close this window.
echo ========================================
pause
