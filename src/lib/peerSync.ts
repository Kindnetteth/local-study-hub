import Peer, { DataConnection } from 'peerjs';
import { Bundle, Flashcard, Playlist } from './storage';

export interface SyncMessage {
  type: 'sync-request' | 'sync-response' | 'bundle-update' | 'flashcard-update' | 'playlist-update' | 'bundle-delete' | 'flashcard-delete' | 'playlist-delete';
  data: any;
  timestamp: number;
}

export class PeerSyncService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private onDataCallback?: (message: SyncMessage) => void;
  private onConnectionCallback?: (peerId: string) => void;
  private onDisconnectCallback?: (peerId: string) => void;

  constructor() {}

  async initialize(userId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Destroy any existing peer first
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }

      // Create peer with user ID as peer ID
      this.peer = new Peer(userId, {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        debug: 2,
      });

      this.peer.on('open', (id) => {
        console.log('Peer initialized with ID:', id);
        // Wait a bit longer to ensure peer server connection is stable
        setTimeout(() => resolve(id), 1000);
      });

      this.peer.on('error', (error) => {
        console.error('Peer error:', error);
        
        // If ID is taken, try reconnecting after a delay
        if (error.type === 'unavailable-id') {
          console.log('ID taken, retrying in 2 seconds...');
          setTimeout(() => {
            this.initialize(userId).then(resolve).catch(reject);
          }, 2000);
        } else {
          reject(error);
        }
      });

      this.peer.on('connection', (conn) => {
        this.handleConnection(conn);
      });
    });
  }

  connectToPeer(peerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        reject(new Error('Peer not initialized'));
        return;
      }

      // Check if already connected
      if (this.connections.has(peerId)) {
        console.log('Already connected to peer:', peerId);
        resolve();
        return;
      }

      const conn = this.peer.connect(peerId, {
        reliable: true,
      });

      // Add timeout for connection
      const timeout = setTimeout(() => {
        conn.close();
        reject(new Error('Connection timeout'));
      }, 10000); // 10 second timeout

      conn.on('open', () => {
        clearTimeout(timeout);
        console.log('Connected to peer:', peerId);
        this.handleConnection(conn);
        resolve();
      });

      conn.on('error', (error) => {
        clearTimeout(timeout);
        console.error('Connection error:', error);
        reject(error);
      });
    });
  }

  private handleConnection(conn: DataConnection) {
    this.connections.set(conn.peer, conn);

    conn.on('data', (data) => {
      if (this.onDataCallback) {
        this.onDataCallback(data as SyncMessage);
      }
    });

    conn.on('close', () => {
      console.log('Connection closed:', conn.peer);
      this.connections.delete(conn.peer);
      if (this.onDisconnectCallback) {
        this.onDisconnectCallback(conn.peer);
      }
    });

    if (this.onConnectionCallback) {
      this.onConnectionCallback(conn.peer);
    }
  }

  sendMessage(message: SyncMessage, targetPeerId?: string) {
    if (targetPeerId) {
      const conn = this.connections.get(targetPeerId);
      if (conn && conn.open) {
        conn.send(message);
      }
    } else {
      // Broadcast to all connections
      this.connections.forEach((conn) => {
        if (conn.open) {
          conn.send(message);
        }
      });
    }
  }

  sendSyncRequest(myData?: { bundles: Bundle[], flashcards: Flashcard[], playlists: Playlist[] }) {
    this.sendMessage({
      type: 'sync-request',
      data: myData || null,
      timestamp: Date.now(),
    });
  }

  sendSyncData(bundles: Bundle[], flashcards: Flashcard[], playlists: Playlist[], userInfo?: { id: string; username: string; peerId?: string }) {
    this.sendMessage({
      type: 'sync-response',
      data: { bundles, flashcards, playlists, userInfo },
      timestamp: Date.now(),
    });
  }

  onData(callback: (message: SyncMessage) => void) {
    this.onDataCallback = callback;
  }

  onConnection(callback: (peerId: string) => void) {
    this.onConnectionCallback = callback;
  }

  onDisconnect(callback: (peerId: string) => void) {
    this.onDisconnectCallback = callback;
  }

  getConnectedPeers(): string[] {
    return Array.from(this.connections.keys());
  }

  getPeerId(): string | null {
    return this.peer?.id || null;
  }

  disconnect(peerId: string) {
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.close();
      this.connections.delete(peerId);
    }
  }

  destroy() {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
