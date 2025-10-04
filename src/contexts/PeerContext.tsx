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
        // Get only PUBLIC data to send
        const allBundles = getBundles();
        const allFlashcards = getFlashcards();
        const allPlaylists = getPlaylists();
        
        // Filter to only public bundles
        const publicBundles = allBundles.filter(b => b.isPublic);
        const publicBundleIds = new Set(publicBundles.map(b => b.id));
        
        // Only send flashcards that belong to public bundles
        const publicFlashcards = allFlashcards.filter(f => publicBundleIds.has(f.bundleId));
        
        // Only send public playlists
        const publicPlaylists = allPlaylists.filter(p => p.isPublic);
        
        peerService.sendSyncData(publicBundles, publicFlashcards, publicPlaylists);
        
        // If the peer sent their data too, merge it
        if (message.data) {
          mergeIncomingData(message.data.bundles, message.data.flashcards, message.data.playlists);
        }
        
        toast({
          title: 'Sync Request Received',
          description: 'Sending your public data to peer...',
        });
        break;

      case 'sync-response':
        // Receive and merge data
        const { bundles: remoteBundles, flashcards: remoteFlashcards, playlists: remotePlaylists } = message.data;
        mergeIncomingData(remoteBundles, remoteFlashcards, remotePlaylists);
        break;

      case 'bundle-update':
        if (message.data.isPublic) {
          saveBundle(message.data);
          toast({
            title: 'Bundle Updated',
            description: 'Received bundle update from peer',
          });
        }
        break;

      case 'flashcard-update':
        saveFlashcard(message.data);
        toast({
          title: 'Flashcard Updated',
          description: 'Received flashcard update from peer',
        });
        break;

      case 'playlist-update':
        if (message.data.isPublic) {
          savePlaylist(message.data);
          toast({
            title: 'Playlist Updated',
            description: 'Received playlist update from peer',
          });
        }
        break;
    }
  }, [peerService]);

  const mergeIncomingData = useCallback((
    remoteBundles: Bundle[], 
    remoteFlashcards: Flashcard[], 
    remotePlaylists: Playlist[]
  ) => {
    if (!user) return;
    
    const localBundles = getBundles();
    const localFlashcards = getFlashcards();
    const localPlaylists = getPlaylists();
    
    let bundlesAdded = 0;
    let bundlesUpdated = 0;
    let bundlesRemoved = 0;
    
    // Merge bundles - only accept public bundles
    remoteBundles.forEach((remoteBundle: Bundle) => {
      if (!remoteBundle.isPublic) return; // Skip private bundles
      
      const localBundle = localBundles.find(b => b.id === remoteBundle.id);
      
      if (!localBundle) {
        // New bundle from peer - only add if it's public
        saveBundle({ ...remoteBundle, updatedAt: remoteBundle.updatedAt || remoteBundle.createdAt });
        bundlesAdded++;
      } else if (localBundle.userId !== user.id) {
        // Bundle owned by peer - update if remote is newer
        const remoteUpdated = new Date(remoteBundle.updatedAt || remoteBundle.createdAt).getTime();
        const localUpdated = new Date(localBundle.updatedAt || localBundle.createdAt).getTime();
        
        if (remoteUpdated > localUpdated) {
          saveBundle({ ...remoteBundle, updatedAt: remoteBundle.updatedAt || remoteBundle.createdAt });
          bundlesUpdated++;
        }
      }
    });
    
    // Remove bundles that are no longer public (owned by others)
    const remoteBundleIds = new Set(remoteBundles.filter(b => b.isPublic).map(b => b.id));
    localBundles.forEach(localBundle => {
      if (localBundle.userId !== user.id && !remoteBundleIds.has(localBundle.id)) {
        // This bundle was from a peer and is no longer in their public list
        const remoteBundle = remoteBundles.find(b => b.id === localBundle.id);
        if (remoteBundle && !remoteBundle.isPublic) {
          // Bundle was made private, remove it
          const bundleFlashcards = localFlashcards.filter(f => f.bundleId === localBundle.id);
          bundleFlashcards.forEach(f => {
            const flashcardElement = document.querySelector(`[data-flashcard-id="${f.id}"]`);
            if (flashcardElement) flashcardElement.remove();
          });
          localStorage.removeItem(`flashcard_bundle_${localBundle.id}`);
          bundlesRemoved++;
        }
      }
    });
    
    // Merge flashcards - only for public bundles
    const publicBundleIds = new Set(getBundles().filter(b => b.isPublic).map(b => b.id));
    remoteFlashcards.forEach((remoteCard: Flashcard) => {
      if (!publicBundleIds.has(remoteCard.bundleId)) return; // Skip cards from private bundles
      
      const localCard = localFlashcards.find(c => c.id === remoteCard.id);
      const bundle = localBundles.find(b => b.id === remoteCard.bundleId);
      
      if (!localCard) {
        saveFlashcard({ ...remoteCard, updatedAt: remoteCard.updatedAt || remoteCard.createdAt });
      } else if (bundle && bundle.userId !== user.id) {
        const remoteUpdated = new Date(remoteCard.updatedAt || remoteCard.createdAt).getTime();
        const localUpdated = new Date(localCard.updatedAt || localCard.createdAt).getTime();
        
        if (remoteUpdated > localUpdated) {
          saveFlashcard({ ...remoteCard, updatedAt: remoteCard.updatedAt || remoteCard.createdAt });
        }
      }
    });
    
    // Merge playlists - only public ones
    remotePlaylists.forEach((remotePlaylist: Playlist) => {
      if (!remotePlaylist.isPublic) return; // Skip private playlists
      
      const localPlaylist = localPlaylists.find(p => p.id === remotePlaylist.id);
      
      if (!localPlaylist) {
        savePlaylist({ ...remotePlaylist, updatedAt: remotePlaylist.updatedAt || remotePlaylist.createdAt });
      } else if (localPlaylist.userId !== user.id) {
        const remoteUpdated = new Date(remotePlaylist.updatedAt || remotePlaylist.createdAt).getTime();
        const localUpdated = new Date(localPlaylist.updatedAt || localPlaylist.createdAt).getTime();
        
        if (remoteUpdated > localUpdated) {
          savePlaylist({ ...remotePlaylist, updatedAt: remotePlaylist.updatedAt || remotePlaylist.createdAt });
        }
      }
    });
    
    toast({
      title: 'Data Synced',
      description: `${bundlesAdded} new, ${bundlesUpdated} updated, ${bundlesRemoved} removed. Refresh to see changes.`,
      duration: 5000,
    });
  }, [user]);

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
            
            // Auto-sync when peer connects - bidirectional
            setTimeout(() => {
              const allBundles = getBundles();
              const allFlashcards = getFlashcards();
              const allPlaylists = getPlaylists();
              
              const publicBundles = allBundles.filter(b => b.isPublic);
              const publicBundleIds = new Set(publicBundles.map(b => b.id));
              const publicFlashcards = allFlashcards.filter(f => publicBundleIds.has(f.bundleId));
              const publicPlaylists = allPlaylists.filter(p => p.isPublic);
              
              peerService.sendSyncRequest({
                bundles: publicBundles,
                flashcards: publicFlashcards,
                playlists: publicPlaylists
              });
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
    
    // Try to get username from users list if not provided
    if (!username) {
      const users = getUsers();
      const peerUser = users.find(u => u.peerId === peerId);
      username = peerUser?.username;
    }
    
    // Update status to connecting
    setKnownPeers(prev => {
      const existingIndex = prev.findIndex(p => p.peerId === peerId);
      if (existingIndex >= 0) {
        return prev.map(p => 
          p.peerId === peerId 
            ? { ...p, username: username || p.username, status: 'connecting' as const }
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
    // Get public data to send
    const allBundles = getBundles();
    const allFlashcards = getFlashcards();
    const allPlaylists = getPlaylists();
    
    const publicBundles = allBundles.filter(b => b.isPublic);
    const publicBundleIds = new Set(publicBundles.map(b => b.id));
    const publicFlashcards = allFlashcards.filter(f => publicBundleIds.has(f.bundleId));
    const publicPlaylists = allPlaylists.filter(p => p.isPublic);
    
    // Send sync request with our data (bidirectional)
    peerService.sendSyncRequest({
      bundles: publicBundles,
      flashcards: publicFlashcards,
      playlists: publicPlaylists
    });
    
    toast({
      title: 'Syncing...',
      description: 'Exchanging data with connected peers...',
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
