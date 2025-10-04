import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PeerSyncService, SyncMessage } from '@/lib/peerSync';
import { getBundles, getFlashcards, getPlaylists, saveBundle, saveFlashcard, savePlaylist, Bundle, Flashcard, Playlist } from '@/lib/storage';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';

interface PeerContextType {
  isInitialized: boolean;
  myPeerId: string | null;
  connectedPeers: string[];
  connectToPeer: (peerId: string) => Promise<void>;
  disconnectFromPeer: (peerId: string) => void;
  syncData: () => void;
}

const PeerContext = createContext<PeerContextType | undefined>(undefined);

export const PeerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [peerService] = useState(() => new PeerSyncService());
  const [isInitialized, setIsInitialized] = useState(false);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  const handleIncomingData = useCallback((message: SyncMessage) => {
    console.log('Received message:', message);

    switch (message.type) {
      case 'sync-request':
        // Send all our data
        const bundles = getBundles();
        const flashcards = getFlashcards();
        const playlists = getPlaylists();
        peerService.sendSyncData(bundles, flashcards, playlists);
        toast({
          title: 'Sync Request Received',
          description: 'Sending your data to peer...',
        });
        break;

      case 'sync-response':
        // Receive and merge data
        const { bundles: remoteBundles, flashcards: remoteFlashcards, playlists: remotePlaylists } = message.data;
        
        remoteBundles.forEach((bundle: Bundle) => saveBundle(bundle));
        remoteFlashcards.forEach((flashcard: Flashcard) => saveFlashcard(flashcard));
        remotePlaylists.forEach((playlist: Playlist) => savePlaylist(playlist));

        toast({
          title: 'Data Synced',
          description: `Received ${remoteBundles.length} bundles, ${remoteFlashcards.length} flashcards, ${remotePlaylists.length} playlists`,
        });
        
        // Reload page to show new data
        window.location.reload();
        break;

      case 'bundle-update':
        saveBundle(message.data);
        toast({
          title: 'Bundle Updated',
          description: 'Received bundle update from peer',
        });
        break;

      case 'flashcard-update':
        saveFlashcard(message.data);
        toast({
          title: 'Flashcard Updated',
          description: 'Received flashcard update from peer',
        });
        break;

      case 'playlist-update':
        savePlaylist(message.data);
        toast({
          title: 'Playlist Updated',
          description: 'Received playlist update from peer',
        });
        break;
    }
  }, [peerService]);

  useEffect(() => {
    if (user && !isInitialized) {
      // Generate unique peer ID with random suffix to avoid conflicts
      const uniquePeerId = `${user.id}-${Math.random().toString(36).substring(2, 9)}`;
      
      peerService
        .initialize(uniquePeerId)
        .then((peerId) => {
          setMyPeerId(peerId);
          setIsInitialized(true);
          console.log('Peer service initialized:', peerId);

          peerService.onData(handleIncomingData);
          
          peerService.onConnection((peerId) => {
            setConnectedPeers(peerService.getConnectedPeers());
            toast({
              title: 'Peer Connected',
              description: `Connected to ${peerId}`,
            });
          });

          peerService.onDisconnect((peerId) => {
            setConnectedPeers(peerService.getConnectedPeers());
            toast({
              title: 'Peer Disconnected',
              description: `Disconnected from ${peerId}`,
            });
          });
        })
        .catch((error) => {
          console.error('Failed to initialize peer service:', error);
          toast({
            title: 'P2P Error',
            description: 'Failed to initialize peer connection',
            variant: 'destructive',
          });
        });
    }

    return () => {
      if (isInitialized) {
        peerService.destroy();
      }
    };
  }, [user, isInitialized, peerService, handleIncomingData]);

  const connectToPeer = async (peerId: string) => {
    try {
      await peerService.connectToPeer(peerId);
      setConnectedPeers(peerService.getConnectedPeers());
      toast({
        title: 'Connected',
        description: `Successfully connected to ${peerId}`,
      });
    } catch (error) {
      console.error('Failed to connect to peer:', error);
      toast({
        title: 'Connection Failed',
        description: 'Could not connect to peer',
        variant: 'destructive',
      });
    }
  };

  const disconnectFromPeer = (peerId: string) => {
    peerService.disconnect(peerId);
    setConnectedPeers(peerService.getConnectedPeers());
  };

  const syncData = () => {
    peerService.sendSyncRequest();
    toast({
      title: 'Sync Requested',
      description: 'Requesting data from connected peers...',
    });
  };

  return (
    <PeerContext.Provider
      value={{
        isInitialized,
        myPeerId,
        connectedPeers,
        connectToPeer,
        disconnectFromPeer,
        syncData,
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export const usePeer = () => {
  const context = useContext(PeerContext);
  if (context === undefined) {
    throw new Error('usePeer must be used within a PeerProvider');
  }
  return context;
};
