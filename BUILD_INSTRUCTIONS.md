# Building Desktop Apps with Electron

This project now supports building standalone desktop applications for Windows (.exe) and macOS (.app) with P2P syncing capabilities.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Development Mode

Run the app in development mode (browser):

```bash
npm install
npm run dev
```

## Building for Desktop

### Step 1: Build the Web App

First, build the production version of your React app:

```bash
npm run build
```

### Step 2: Update package.json Scripts

Add these scripts to your `package.json` (manual step required since package.json is read-only in this environment):

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron:dev": "NODE_ENV=development electron electron/main.cjs",
    "electron:build": "npm run build && electron-builder",
    "electron:build:win": "npm run build && electron-builder --win",
    "electron:build:mac": "npm run build && electron-builder --mac",
    "electron:build:linux": "npm run build && electron-builder --linux"
  },
  "main": "electron/main.cjs"
}
```

### Step 3: Build Desktop Apps

#### For Windows (.exe):
```bash
npm run electron:build:win
```

Output: `release/Flashcard Study Setup X.X.X.exe`

#### For macOS (.app):
```bash
npm run electron:build:mac
```

Output: `release/Flashcard Study-X.X.X.dmg`

#### For Linux (AppImage):
```bash
npm run electron:build:linux
```

Output: `release/Flashcard Study-X.X.X.AppImage`

## Testing Electron in Development

To test the Electron app during development:

```bash
# Terminal 1 - Run Vite dev server
npm run dev

# Terminal 2 - Run Electron
npm run electron:dev
```

## P2P Sync Features

The desktop app includes built-in P2P syncing:

1. **Peer ID**: Each user gets a unique peer ID automatically
2. **Connect**: Share your peer ID with others to connect
3. **Sync**: Click "Sync Now" to request data from connected peers
4. **Auto-Sync**: Data updates are automatically shared when connected

### How P2P Works:

- Uses **PeerJS** with a free signaling server (`0.peerjs.com`)
- Signaling server only handles initial handshake
- All actual data flows **directly peer-to-peer** (no server storage)
- Works across different networks (NAT traversal via WebRTC)

## Distribution

### Windows
- Distribute the `.exe` installer from the `release` folder
- Users double-click to install
- App appears in Start Menu and Desktop

### macOS
- Distribute the `.dmg` file
- Users drag the app to Applications folder
- May need to allow in System Preferences > Security

### Linux
- Distribute the `.AppImage` file
- Users make it executable: `chmod +x *.AppImage`
- Run directly: `./Flashcard\ Study-X.X.X.AppImage`

## App Size

Expect the final app to be:
- **Windows**: ~100-150MB
- **macOS**: ~120-180MB  
- **Linux**: ~110-160MB

This is normal for Electron apps as they bundle Chromium browser.

## Troubleshooting

### Build Fails
- Make sure you ran `npm install` first
- Check that `dist` folder exists after `npm run build`

### P2P Not Connecting
- Check internet connection
- Ensure firewall isn't blocking WebRTC
- Try using a different network

### App Won't Start
- Check console for errors with `npm run electron:dev`
- Verify all dependencies are installed

## Security Notes

- All data is stored locally in the app
- P2P connections use WebRTC (encrypted by default)
- Only users with your Peer ID can connect
- No data is sent to external servers (except signaling handshake)

## Support

For issues or questions, check the console logs in development mode or contact support.
