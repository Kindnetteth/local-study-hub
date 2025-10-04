import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PeerSyncService, SyncMessage } from '@/lib/peerSync';
import { getBundles, getFlashcards, getPlaylists, saveBundle, saveFlashcard, savePlaylist, Bundle, Flashcard, Playlist, PeerInfo, updateUser, getCurrentUser, getUsers } from '@/lib/storage';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';

interface PeerContextType {
  isInitialized: boolean;
  myPeerId: string | null;
  knownPeers: PeerInfo[];
  connectToPeer: (peerId: string, username?: string) => Promise<void>;
  disconnectFromPeer: (peerId: string) => void;
  syncData: () => void;
  removePeer: (peerId: string) => void;
}

const PeerContext = createContext<PeerContextType | undefined>(undefined);

export const PeerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, refreshUser } = useAuth();
  const [peerService] = useState(() => new PeerSyncService());
  const [isInitialized, setIsInitialized] = useState(false);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [knownPeers, setKnownPeers] = useState<PeerInfo[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
          description: `Received ${remoteBundles.length} bundles, ${remoteFlashcards.length} flashcards, ${remotePlaylists.length} playlists. Refresh the page to see new data.`,
          duration: 5000,
        });
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
    // Reset everything if user changed
    if (user?.id !== currentUserId) {
      if (isInitialized) {
        console.log('User changed, resetting peer service');
        peerService.destroy();
        setIsInitialized(false);
        setMyPeerId(null);
        setKnownPeers([]);
      }
      setCurrentUserId(user?.id || null);
    }

    if (user && !isInitialized) {
      // Get or generate stable peer ID
      let stablePeerId = user.peerId;
      if (!stablePeerId) {
        // Generate a long, unique ID (like Syncthing)
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        stablePeerId = `${user.id}-${timestamp}-${random}`.toUpperCase();
        
        // Save it to user profile immediately (synchronous)
        updateUser(user.id, { peerId: stablePeerId });
        // Refresh the user in AuthContext
        refreshUser();
        console.log('Generated and saved new peer ID:', stablePeerId);
      }
      
      // Load known peers from user profile
      const savedPeers = user.knownPeers || [];
      setKnownPeers(savedPeers.map(p => ({ ...p, status: 'disconnected' as const })));
      
      peerService
        .initialize(stablePeerId)
        .then((peerId) => {
          setMyPeerId(peerId);
          setIsInitialized(true);
          console.log('Peer service initialized:', peerId);

          peerService.onData(handleIncomingData);
          
          peerService.onConnection((connectedPeerId) => {
            console.log('Peer connected, updating known peers:', connectedPeerId);
            
            // Get current user and users list for username lookup
            const currentUser = getCurrentUser();
            if (!currentUser) return;
            
            const users = getUsers();
            const peerUser = users.find(u => u.peerId === connectedPeerId);
            
            // Update state
            setKnownPeers(prev => {
              const updated = prev.map(p => 
                p.peerId === connectedPeerId 
                  ? { ...p, status: 'connected' as const, lastConnected: new Date().toISOString(), username: peerUser?.username || p.username }
                  : p
              );
              
              // Add if not exists
              const finalPeers = updated.some(p => p.peerId === connectedPeerId) 
                ? updated 
                : [...updated, { 
                    peerId: connectedPeerId, 
                    username: peerUser?.username,
                    status: 'connected' as const,
                    lastConnected: new Date().toISOString() 
                  }];
              
              // Save immediately to localStorage (synchronous)
              updateUser(currentUser.id, { knownPeers: finalPeers });
              refreshUser(); // Refresh user in AuthContext
              console.log('Saved known peers to storage:', finalPeers.length);
              
              return finalPeers;
            });
            
            // Auto-sync when peer connects
            setTimeout(() => {
              peerService.sendSyncRequest();
            }, 1000);
            
            toast({
              title: 'Peer Connected',
              description: `Connected to peer`,
            });
          });

          peerService.onDisconnect((disconnectedPeerId) => {
            console.log('Peer disconnected:', disconnectedPeerId);
            
            // Update peer status to disconnected
            setKnownPeers(prev => {
              const updated = prev.map(p => 
                p.peerId === disconnectedPeerId 
                  ? { ...p, status: 'disconnected' as const }
                  : p
              );
              
              // Save immediately to localStorage
              const currentUser = getCurrentUser();
              if (currentUser) {
                updateUser(currentUser.id, { knownPeers: updated });
                refreshUser(); // Refresh user in AuthContext
              }
              
              return updated;
            });
            
            toast({
              title: 'Peer Disconnected',
              description: `Peer disconnected`,
            });
          });
          
          // Auto-reconnect to all known peers
          if (savedPeers.length > 0) {
            console.log('Auto-reconnecting to known peers:', savedPeers.length);
            savedPeers.forEach((peerInfo, index) => {
              // Update status to connecting
              setKnownPeers(prev => prev.map(p => 
                p.peerId === peerInfo.peerId 
                  ? { ...p, status: 'connecting' as const }
                  : p
              ));
              
              // Stagger reconnection attempts
              setTimeout(() => {
                peerService.connectToPeer(peerInfo.peerId).catch((error) => {
                  console.log('Failed to reconnect to peer:', peerInfo.peerId, error);
                  
                  // Update status to error, but keep in list
                  setKnownPeers(prev => prev.map(p => 
                    p.peerId === peerInfo.peerId 
                      ? { ...p, status: 'disconnected' as const }
                      : p
                  ));
                });
              }, 2000 + (index * 1500)); // Stagger connections
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

    // Add window unload handler to properly destroy peer
    const handleUnload = () => {
      if (isInitialized) {
        console.log('Page unloading, destroying peer...');
        peerService.destroy();
      }
    };
    
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      // Don't destroy on unmount, only when user changes or page unloads
    };
  }, [user, isInitialized, peerService, handleIncomingData, currentUserId]);

  const connectToPeer = async (peerId: string, username?: string) => {
    // Check if already connected or in list
    const existing = knownPeers.find(p => p.peerId === peerId);
    if (existing?.status === 'connected') {
      toast({
        title: 'Already Connected',
        description: 'Already connected to this peer',
      });
      return;
    }
    
    // Update status to connecting
    setKnownPeers(prev => {
      const existingIndex = prev.findIndex(p => p.peerId === peerId);
      if (existingIndex >= 0) {
        return prev.map(p => 
          p.peerId === peerId 
            ? { ...p, status: 'connecting' as const }
            : p
        );
      }
      return [...prev, { peerId, username, status: 'connecting' as const }];
    });
    
    try {
      await peerService.connectToPeer(peerId);
      toast({
        title: 'Connected',
        description: `Successfully connected to peer`,
      });
    } catch (error) {
      console.error('Failed to connect to peer:', error);
      
      // Update status to error
      setKnownPeers(prev => prev.map(p => 
        p.peerId === peerId 
          ? { ...p, status: 'error' as const }
          : p
      ));
      
      toast({
        title: 'Connection Failed',
        description: 'Could not connect to peer',
        variant: 'destructive',
      });
    }
  };

  const disconnectFromPeer = (peerId: string) => {
    peerService.disconnect(peerId);
    
    // Update status to disconnected
    setKnownPeers(prev => prev.map(p => 
      p.peerId === peerId 
        ? { ...p, status: 'disconnected' as const }
        : p
    ));
  };
  
  const removePeer = (peerId: string) => {
    peerService.disconnect(peerId);
    
    // Remove from list and save immediately
    setKnownPeers(prev => {
      const updated = prev.filter(p => p.peerId !== peerId);
      
      // Save immediately to localStorage
      const currentUser = getCurrentUser();
      if (currentUser) {
        updateUser(currentUser.id, { knownPeers: updated });
        refreshUser(); // Refresh user in AuthContext
        console.log('Removed peer and saved:', peerId);
      }
      
      return updated;
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
        knownPeers,
        connectToPeer,
        disconnectFromPeer,
        syncData,
        removePeer,
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
