@echo off
title Build Desktop App
color 0B

echo.
echo ========================================
echo   Flashcard Study - Desktop Builder
echo ========================================
echo.
echo This will build a standalone .exe file
echo that you can run without a browser!
echo.
pause

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] npm is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo [2/5] Installing Electron build tools...
call npm install --save-dev electron electron-builder
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Failed to install Electron!
    pause
    exit /b 1
)

echo.
echo [3/5] Building web app...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo [4/5] Creating Windows executable...
call npx electron-builder --win --config electron-builder.json
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Electron build failed!
    pause
    exit /b 1
)

echo.
echo [5/5] Done!
color 0A
echo.
echo ========================================
echo   SUCCESS! Your app is ready!
echo ========================================
echo.
echo Your .exe file is in the "release" folder
echo Look for: Flashcard Study Setup X.X.X.exe
echo.
echo Double-click it to install the app!
echo.
pause
