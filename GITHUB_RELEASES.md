# Creating GitHub Releases for Auto-Updates

This guide explains how to create GitHub releases that will automatically update your Electron app.

## Prerequisites

1. Your code is already synced to GitHub (via Lovable's integration)
2. You've built your Electron app using the build scripts
3. You have the built executables ready

## Steps to Create a Release

### 1. Update Version Number

In `package.json`, increment the version number:
```json
{
  "version": "1.0.1"  // Change from 1.0.0 to 1.0.1
}
```

### 2. Build Your App

Run the appropriate build command:
- Windows: `npm run electron:build:win`
- macOS: `npm run electron:build:mac`
- Linux: `npm run electron:build:linux`

The built files will be in the `release/` folder.

### 3. Create a GitHub Release

1. Go to your GitHub repository
2. Click on "Releases" (in the right sidebar)
3. Click "Create a new release"
4. Tag version: Use the same version from package.json (e.g., `v1.0.1`)
5. Release title: Something descriptive (e.g., "Version 1.0.1 - Bug fixes")
6. Description: Add release notes describing what changed

### 4. Upload Build Files

Drag and drop these files from your `release/` folder:

**Windows:**
- `Flashcard Study Setup 1.0.1.exe`
- `latest.yml` (important for auto-updates!)

**macOS:**
- `Flashcard Study-1.0.1.dmg`
- `Flashcard Study-1.0.1-mac.zip` (if available)
- `latest-mac.yml` (important for auto-updates!)

**Linux:**
- `Flashcard Study-1.0.1.AppImage`
- `latest-linux.yml` (important for auto-updates!)

### 5. Publish the Release

Click "Publish release"

## How Auto-Updates Work

1. When a user launches the app, it checks GitHub for new releases (after 5 seconds)
2. If a newer version is found, it downloads automatically
3. User sees a notification in the bottom-right corner with download progress
4. Once downloaded, user can click "Restart and Install" to update
5. If they close the notification, update will install on next app quit

## Important Notes

- **The `latest.yml` files are critical** - they tell the app about available updates
- Version in `package.json` MUST match the GitHub release tag
- Only works in production builds (not in development mode)
- Updates are checked on app launch
- Users must be connected to the internet

## Troubleshooting

**Updates not appearing?**
- Check that version in package.json is higher than the current version
- Ensure latest.yml file is uploaded to the release
- Check the Electron console for error messages

**Build files not found?**
- Make sure electron-builder completed successfully
- Check the `release/` folder for generated files

## Example Workflow

1. Make code changes in Lovable (syncs to GitHub automatically)
2. Update version in package.json: `1.0.0` → `1.0.1`
3. Build: `npm run electron:build:win`
4. Create GitHub release tagged `v1.0.1`
5. Upload `Flashcard Study Setup 1.0.1.exe` and `latest.yml`
6. Publish release
7. All users running `1.0.0` will auto-update to `1.0.1` on next launch!
