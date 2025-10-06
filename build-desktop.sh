#!/bin/bash

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "========================================"
echo "  Flashcard Study - Desktop Builder"
echo "========================================"
echo ""
echo "This will build a standalone app"
echo "that you can run without a browser!"
echo ""
read -p "Press Enter to continue..."

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] npm is not installed!${NC}"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

echo -e "${CYAN}[1/5] Installing dependencies...${NC}"
npm install || { echo -e "${RED}[ERROR] Failed to install dependencies!${NC}"; exit 1; }

echo ""
echo -e "${CYAN}[2/5] Installing Electron build tools...${NC}"
npm install --save-dev electron electron-builder || { echo -e "${RED}[ERROR] Failed to install Electron!${NC}"; exit 1; }

echo ""
echo -e "${CYAN}[3/5] Building web app...${NC}"
npm run build || { echo -e "${RED}[ERROR] Build failed!${NC}"; exit 1; }

echo ""
echo -e "${CYAN}[4/5] Creating application...${NC}"
# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    npx electron-builder --mac --config electron-builder.json || { echo -e "${RED}[ERROR] macOS build failed!${NC}"; exit 1; }
    APP_FILE="Flashcard Study.app"
else
    npx electron-builder --linux --config electron-builder.json || { echo -e "${RED}[ERROR] Linux build failed!${NC}"; exit 1; }
    APP_FILE="Flashcard Study AppImage"
fi

echo ""
echo -e "${CYAN}[5/5] Done!${NC}"
echo -e "${GREEN}"
echo "========================================"
echo "   SUCCESS! Your app is ready!"
echo "========================================"
echo -e "${NC}"
echo "Your app is in the 'release' folder"
echo "Look for: $APP_FILE"
echo ""
read -p "Press Enter to exit..."
