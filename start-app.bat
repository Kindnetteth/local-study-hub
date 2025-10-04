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

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    echo This may take a few minutes on first run.
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
    echo [OK] Dependencies installed successfully!
    echo.
)

echo [INFO] Starting the app...
echo.
echo The app will open in your default browser.
echo Press Ctrl+C to stop the server when you're done.
echo.
echo ========================================
echo.

REM Start the development server
call npm run dev

pause
