#!/bin/bash

# Set colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "  Flashcard Study App Launcher"
echo "========================================"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo -e "${RED}[ERROR] npm is not installed!${NC}"
    echo ""
    echo "Please install Node.js from: https://nodejs.org/"
    echo "Node.js includes npm which is required to run this app."
    echo ""
    read -p "Press any key to continue..."
    exit 1
fi

echo -e "${GREEN}[OK] npm is installed${NC}"
echo ""

# Always ensure dependencies are installed
echo -e "${CYAN}[INFO] Checking dependencies...${NC}"
echo ""
npm install
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}[ERROR] Failed to install dependencies!${NC}"
    echo ""
    read -p "Press any key to continue..."
    exit 1
fi
echo ""
echo -e "${GREEN}[OK] Dependencies ready!${NC}"
echo ""

echo -e "${CYAN}[INFO] Starting the app...${NC}"
echo ""
echo "The app will open automatically in your default browser."
echo "Press Ctrl+C to stop the server when you're done."
echo ""
echo "========================================"
echo ""

# Start the development server on port 5174 and open browser
open http://localhost:5174 2>/dev/null || xdg-open http://localhost:5174 2>/dev/null
npm run dev -- --port 5174

echo ""
echo "========================================"
echo "Server stopped. You can close this window."
echo "========================================"
read -p "Press any key to continue..."
