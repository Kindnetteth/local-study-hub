# FlashLearn

A powerful, feature-rich flashcard study application designed to help you learn faster and retain more. Built with modern web technologies and available as both a desktop app and web platform.

## 🎯 Features

### Study Tools
- **Smart Flashcard System** - Create, organize, and study flashcards with ease
- **Bundle Organization** - Group related flashcards into bundles for structured learning
- **Playlist Mode** - Create custom study playlists mixing cards from multiple bundles
- **Progress Tracking** - Monitor your learning progress with detailed statistics and achievements
- **Multiple Study Modes** - Flip cards, shuffle, and customize your study experience

### Customization
- **Theme Support** - Light and dark modes with custom color schemes
- **Background Options** - Solid colors, gradients, or image backgrounds
- **Sound Effects** - Audio feedback for correct/incorrect answers (customizable)
- **Keyboard Shortcuts** - Fully customizable keybindings for power users

### Data Management
- **Local Storage** - All your data stays on your device
- **Import/Export** - Backup and share your flashcard bundles
- **Peer-to-Peer Sync** - Connect devices directly to sync data without cloud servers
- **Multi-User Support** - Separate profiles for different learners

### Desktop Features (Electron)
- **Auto-Updates** - Automatic updates through GitHub releases
- **Cross-Platform** - Available for Windows, macOS, and Linux
- **Offline Access** - Full functionality without internet connection
- **System Integration** - Native desktop experience with taskbar integration

## 🚀 Getting Started

### Web Version
Visit the deployed web app and start studying immediately.

### Desktop Version
Download the latest release for your platform:
- **Windows**: `FlashLearn Setup.exe`
- **macOS**: `FlashLearn.dmg`
- **Linux**: `FlashLearn.AppImage`

## 💻 Development

### Prerequisites
- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Local Development

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm i

# Start development server
npm run dev
```

### Building Desktop Apps

```sh
# Build for Windows
npm run electron:build:win

# Build for macOS
npm run electron:build:mac

# Build for Linux
npm run electron:build:linux
```

Built applications will be in the `release/` folder.

## 🛠️ Technologies

- **Frontend**: React + TypeScript + Vite
- **UI Framework**: shadcn-ui + Tailwind CSS
- **Desktop**: Electron
- **P2P Sync**: PeerJS
- **Routing**: React Router
- **State Management**: React Context API

## 📱 Architecture

- **Electron Main Process** (`electron/main.cjs`) - Desktop app initialization and auto-updates
- **React Frontend** (`src/`) - Cross-platform UI components
- **Local Storage** (`src/lib/storage.ts`) - IndexedDB-based data persistence
- **P2P Networking** (`src/lib/peerSync.ts`) - Peer-to-peer data synchronization

## 🔐 Privacy & Security

- **Local-First** - Your data never leaves your device unless you explicitly sync
- **No Account Required** - Use the app without creating an account
- **P2P Encryption** - Peer connections use WebRTC encryption
- **Open Source** - Review the code yourself

## 📄 License

This project was built with [Lovable](https://lovable.dev) - AI-powered full-stack development platform.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📞 Support

For issues or questions, please contact: OvrKind@gmail.com
