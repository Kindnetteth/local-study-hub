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
      // Get or generate stable peer ID
      let stablePeerId = user.peerId;
      if (!stablePeerId) {
        // Generate a long, unique ID (like Syncthing)
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        stablePeerId = `${user.id}-${timestamp}-${random}`.toUpperCase();
        
        // Save it to user profile
        import('@/lib/storage').then(({ updateUser }) => {
          updateUser(user.id, { peerId: stablePeerId });
        });
      }
      
      peerService
        .initialize(stablePeerId)
        .then((peerId) => {
          setMyPeerId(peerId);
          setIsInitialized(true);
          console.log('Peer service initialized:', peerId);

          peerService.onData(handleIncomingData);
          
          peerService.onConnection((peerId) => {
            setConnectedPeers(peerService.getConnectedPeers());
            
            // Save connected peers to user profile
            import('@/lib/storage').then(({ getCurrentUser, updateUser }) => {
              const currentUser = getCurrentUser();
              if (currentUser) {
                const updatedPeers = Array.from(new Set([...(currentUser.connectedPeers || []), peerId]));
                updateUser(currentUser.id, { connectedPeers: updatedPeers });
              }
            });
            
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
          
          // Reconnect to saved peers with extended delay to ensure peer is fully ready
          if (user.connectedPeers && user.connectedPeers.length > 0) {
            console.log('Reconnecting to saved peers:', user.connectedPeers);
            user.connectedPeers.forEach((savedPeerId, index) => {
              setTimeout(() => {
                peerService.connectToPeer(savedPeerId).catch((error) => {
                  console.log('Failed to reconnect to peer:', savedPeerId, error);
                  // Retry once after 3 seconds
                  setTimeout(() => {
                    peerService.connectToPeer(savedPeerId).catch((finalError) => {
                      console.log('All retries failed for peer:', savedPeerId, finalError);
                      // Remove this peer from saved list since it's not reachable
                      import('@/lib/storage').then(({ getCurrentUser, updateUser }) => {
                        const currentUser = getCurrentUser();
                        if (currentUser && currentUser.connectedPeers) {
                          const updatedPeers = currentUser.connectedPeers.filter(p => p !== savedPeerId);
                          updateUser(currentUser.id, { connectedPeers: updatedPeers });
                          console.log('Removed unreachable peer from saved list:', savedPeerId);
                        }
                      });
                    });
                  }, 3000);
                });
              }, 2000 + (index * 1000)); // Stagger connections
            });
          }
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
    
    // Remove from saved peers
    import('@/lib/storage').then(({ getCurrentUser, updateUser }) => {
      const currentUser = getCurrentUser();
      if (currentUser) {
        const updatedPeers = (currentUser.connectedPeers || []).filter(p => p !== peerId);
        updateUser(currentUser.id, { connectedPeers: updatedPeers });
      }
    });
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
