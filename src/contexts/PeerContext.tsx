import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { PeerSyncService, SyncMessage } from '@/lib/peerSync';
import { getBundles, getFlashcards, getPlaylists, saveBundle, saveFlashcard, savePlaylist, deleteBundle, deleteFlashcard, Bundle, Flashcard, Playlist, PeerInfo, updateUser, getCurrentUser, getUsers, getStats } from '@/lib/storage';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { toast } from '@/hooks/use-toast';
import { getSettings } from '@/lib/settings';
import { OfflineQueue } from '@/lib/offlineQueue';
import { DeltaSyncManager } from '@/lib/deltaSync';

interface PeerContextType {
  isInitialized: boolean;
  myPeerId: string | null;
  knownPeers: PeerInfo[];
  connectToPeer: (peerId: string, username?: string) => Promise<void>;
  disconnectFromPeer: (peerId: string) => void;
  syncData: () => void;
  removePeer: (peerId: string) => void;
  broadcastUpdate: (type: 'bundle' | 'flashcard' | 'playlist', data: any) => void;
  broadcastDelete: (type: 'bundle' | 'flashcard' | 'playlist', id: string) => void;
  broadcastProfileUpdate: (userId: string, username: string, profilePicture?: string) => void;
  broadcastStatsUpdate: (userId: string, bundleId: string, stats: any) => void;
  pendingConnectionRequest: { peerId: string; username: string; userId?: string } | null;
  approvePeerConnection: () => void;
  rejectPeerConnection: () => void;
  sameNameRequest: { peerId: string; username: string; userId?: string } | null;
  handleSameNameChoice: (isSameDevice: boolean) => void;
}

const PeerContext = createContext<PeerContextType | undefined>(undefined);

export const PeerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, refreshUser } = useAuth();
  const { addNotification } = useNotifications();
  const [peerService] = useState(() => new PeerSyncService());
  const [offlineQueue] = useState(() => new OfflineQueue());
  const [deltaSync] = useState(() => new DeltaSyncManager());
  const [isInitialized, setIsInitialized] = useState(false);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [knownPeers, setKnownPeers] = useState<PeerInfo[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dataChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [pendingConnectionRequest, setPendingConnectionRequest] = useState<{ peerId: string; username: string; userId?: string } | null>(null);
  const [sameNameRequest, setSameNameRequest] = useState<{ peerId: string; username: string; userId?: string } | null>(null);

  // Helper function to save peer user info - MUST be declared before handleIncomingData
  const savePeerUserInfo = useCallback((userInfo: { id: string; username: string; peerId?: string; profilePicture?: string }) => {
    if (!userInfo || !userInfo.id) {
      console.warn('[PeerContext] savePeerUserInfo called with invalid userInfo:', userInfo);
      return;
    }
    
    console.log('[PeerContext] Saving peer user info:', {
      id: userInfo.id,
      username: userInfo.username,
      peerId: userInfo.peerId,
      hasProfilePicture: !!userInfo.profilePicture
    });
    
    // Update knownPeers with username, userId, and profilePicture
    setKnownPeers(prev => {
      const updated = prev.map(p => {
        // Match by peerId OR userId
        if (p.peerId === userInfo.peerId || p.userId === userInfo.id) {
          console.log(`[PeerContext] Updating existing peer entry:`, {
            oldUserId: p.userId,
            newUserId: userInfo.id,
            username: userInfo.username
          });
          return { 
            ...p, 
            username: userInfo.username, 
            userId: userInfo.id,  // CRITICAL: Set userId from userInfo.id
            peerId: userInfo.peerId || p.peerId,
            profilePicture: userInfo.profilePicture 
          };
        }
        return p;
      });
      
      // If no peer was updated, add a new entry
      const wasUpdated = updated.some(p => p.userId === userInfo.id || p.peerId === userInfo.peerId);
      if (!wasUpdated && userInfo.peerId) {
        console.log(`[PeerContext] Adding new peer entry for:`, {
          userId: userInfo.id,
          username: userInfo.username,
          peerId: userInfo.peerId
        });
        updated.push({
          peerId: userInfo.peerId,
          userId: userInfo.id,  // CRITICAL: Set userId from userInfo.id
          username: userInfo.username,
          profilePicture: userInfo.profilePicture,
          status: 'disconnected'
        });
      }
      
      // Save to storage
      const currentUser = getCurrentUser();
      if (currentUser) {
        updateUser(currentUser.id, { knownPeers: updated });
        console.log('[PeerContext] Saved knownPeers to storage:', updated.length, 'peers with userIds:', 
          updated.map(p => ({ userId: p.userId, username: p.username }))
        );
        
        // CRITICAL: Refresh user in AuthContext so Home.tsx gets updated knownPeers
        refreshUser();
      }
      
      return updated;
    });
  }, [refreshUser]);

  const handleIncomingData = useCallback((message: SyncMessage) => {
    console.log('Received message:', message);
    
    // Dispatch custom event for real-time UI updates
    window.dispatchEvent(new CustomEvent('p2p-update', { 
      detail: { type: message.type, data: message.data } 
    }));

    // Handle peer removal notification
    if (message.type === 'peer-removed') {
      const removedBy = message.data?.removedBy;
      if (removedBy) {
        console.log('Peer removed us:', removedBy);
        
        // Remove the peer and their bundles
        const currentUser = getCurrentUser();
        if (currentUser) {
          // Remove from known peers
          const updatedPeers = (currentUser.knownPeers || []).filter(p => p.peerId !== removedBy);
          updateUser(currentUser.id, { knownPeers: updatedPeers });
          setKnownPeers(updatedPeers);
          refreshUser();
          
          // Remove their bundles
          const allBundles = getBundles();
          const bundlesToRemove = allBundles.filter(b => b.originPeerId === removedBy);
          bundlesToRemove.forEach(bundle => {
            deleteBundle(bundle.id);
            const bundleCards = getFlashcards().filter(c => c.bundleId === bundle.id);
            bundleCards.forEach(card => deleteFlashcard(card.id));
          });
          
          toast({
            title: 'Peer Removed',
            description: `You were removed by a peer and ${bundlesToRemove.length} shared bundle(s) deleted.`,
          });
        }
      }
      return;
    }

    switch (message.type) {
      case 'sync-request':
        // Get only PUBLIC data to send, and include current user info
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
        
        // Get stats for public bundles only
        const { getStats } = require('@/lib/storage');
        const allStats = getStats();
        const publicStats = allStats.filter((s: any) => 
          publicBundleIds.has(s.bundleId) && s.userId === user?.id
        );
        
        // Include user info in sync with profile picture
        const currentUserInfo = user ? { 
          id: user.id, 
          username: user.username, 
          peerId: user.peerId,
          profilePicture: user.profilePicture 
        } : null;
        peerService.sendSyncData(publicBundles, publicFlashcards, publicPlaylists, publicStats, currentUserInfo);
        
        // If the peer sent their data too, merge it
        if (message.data) {
          // Store peer user info if provided
          if (message.data.userInfo) {
            savePeerUserInfo(message.data.userInfo);
          }
          mergeIncomingData(
            message.data.bundles, 
            message.data.flashcards, 
            message.data.playlists,
            message.data.stats || []
          );
        }
        
        const settings = getSettings();
        if (settings.notificationsEnabled) {
          toast({
            title: 'Sync Request Received',
            description: 'Sending your public data to peer...',
          });
        }
        break;

      case 'sync-response':
        // Receive and merge data, store peer user info if provided
        const { bundles: remoteBundles, flashcards: remoteFlashcards, playlists: remotePlaylists, stats: remoteStats, userInfo } = message.data;
        if (userInfo) {
          savePeerUserInfo(userInfo);
        }
        mergeIncomingData(remoteBundles, remoteFlashcards, remotePlaylists, remoteStats || []);
        break;

      case 'bundle-update': {
        const bundle = message.data.bundle || message.data;
        const creatorInfo = message.data.userInfo;
        
        // Save creator info if provided
        if (creatorInfo) {
          console.log('[PeerContext] Saving creator info from bundle-update:', creatorInfo);
          savePeerUserInfo(creatorInfo);
        }
        
        if (bundle.isPublic) {
          // Bundle is now public, save/update it
          saveBundle(bundle);
          const bundleSettings = getSettings();
          if (bundleSettings.notificationsEnabled && bundleSettings.peerSyncAlerts !== 'none') {
            toast({
              title: 'Bundle Updated',
              description: `"${bundle.title}" was updated`,
            });
          }
        } else {
          // Bundle is now private, remove it if we had it
          const localBundles = getBundles();
          const existingBundle = localBundles.find(b => b.id === bundle.id);
          if (existingBundle && existingBundle.userId !== user?.id) {
            // Remove bundle and its flashcards
            const flashcards = getFlashcards();
            const updatedFlashcards = flashcards.filter(f => f.bundleId !== bundle.id);
            localStorage.setItem('flashcard_flashcards', JSON.stringify(updatedFlashcards));
            
            const updatedBundles = localBundles.filter(b => b.id !== bundle.id);
            localStorage.setItem('flashcard_bundles', JSON.stringify(updatedBundles));
            
            const bundleSettings = getSettings();
            if (bundleSettings.notificationsEnabled && bundleSettings.peerSyncAlerts !== 'none') {
              toast({
                title: 'Bundle Removed',
                description: `"${bundle.title}" is now private`,
              });
            }
            
            // Trigger page refresh for UI updates
            window.dispatchEvent(new Event('storage'));
          }
        }
        break;
      }

      case 'flashcard-update': {
        const flashcard = message.data.flashcard || message.data;
        const creatorInfo = message.data.userInfo;
        
        // Save creator info if provided
        if (creatorInfo) {
          console.log('[PeerContext] Saving creator info from flashcard-update:', creatorInfo);
          savePeerUserInfo(creatorInfo);
        }
        
        // Check if the bundle is public before saving
        const bundles = getBundles();
        const bundle = bundles.find(b => b.id === flashcard.bundleId);
        if (bundle?.isPublic || bundle?.collaborators?.includes(user?.id || '')) {
          saveFlashcard(flashcard);
          const flashcardSettings = getSettings();
          if (flashcardSettings.notificationsEnabled && flashcardSettings.peerSyncAlerts === 'all') {
            toast({
              title: 'Card Updated',
              description: 'Received flashcard update',
            });
          }
        }
        break;
      }

      case 'playlist-update': {
        const playlist = message.data.playlist || message.data;
        const creatorInfo = message.data.userInfo;
        
        // Save creator info if provided
        if (creatorInfo) {
          console.log('[PeerContext] Saving creator info from playlist-update:', creatorInfo);
          savePeerUserInfo(creatorInfo);
        }
        
        if (playlist.isPublic) {
          savePlaylist(playlist);
          const playlistSettings = getSettings();
          if (playlistSettings.notificationsEnabled && playlistSettings.peerSyncAlerts === 'all') {
            toast({
              title: 'Playlist Updated',
              description: `"${playlist.title}" was updated`,
            });
          }
        } else {
          // Playlist is now private, remove it if we had it
          const localPlaylists = getPlaylists();
          const existingPlaylist = localPlaylists.find(p => p.id === playlist.id);
          if (existingPlaylist && existingPlaylist.userId !== user?.id) {
            const updatedPlaylists = localPlaylists.filter(p => p.id !== playlist.id);
            localStorage.setItem('flashcard_playlists', JSON.stringify(updatedPlaylists));
            
            const playlistSettings = getSettings();
            if (playlistSettings.notificationsEnabled && playlistSettings.peerSyncAlerts !== 'none') {
              toast({
                title: 'Playlist Removed',
                description: `"${playlist.title}" is now private`,
              });
            }
            
            window.dispatchEvent(new Event('storage'));
          }
        }
        break;
      }

      case 'bundle-delete': {
        const bundleId = message.data.id;
        const localBundles = getBundles();
        const bundle = localBundles.find(b => b.id === bundleId);
        
        // Only delete if we don't own it
        if (bundle && bundle.userId !== user?.id) {
          // Remove bundle and its flashcards
          const flashcards = getFlashcards();
          const updatedFlashcards = flashcards.filter(f => f.bundleId !== bundleId);
          localStorage.setItem('flashcard_flashcards', JSON.stringify(updatedFlashcards));
          
          const updatedBundles = localBundles.filter(b => b.id !== bundleId);
          localStorage.setItem('flashcard_bundles', JSON.stringify(updatedBundles));
          
          const deleteSettings = getSettings();
          if (deleteSettings.notificationsEnabled && deleteSettings.peerSyncAlerts !== 'none') {
            addNotification({
              title: 'Bundle Deleted',
              description: `"${bundle.title}" was deleted by owner`,
              type: 'warning'
            });
            toast({
              title: 'Bundle Deleted',
              description: `"${bundle.title}" was deleted by owner`,
            });
          }
          
          window.dispatchEvent(new Event('storage'));
        }
        break;
      }

      case 'flashcard-delete': {
        const flashcardId = message.data.id;
        const localFlashcards = getFlashcards();
        const flashcard = localFlashcards.find(f => f.id === flashcardId);
        
        if (flashcard) {
          const bundles = getBundles();
          const bundle = bundles.find(b => b.id === flashcard.bundleId);
          
          // Only delete if we don't own the bundle or are a collaborator
          if (bundle && bundle.userId !== user?.id) {
            const updatedFlashcards = localFlashcards.filter(f => f.id !== flashcardId);
            localStorage.setItem('flashcard_flashcards', JSON.stringify(updatedFlashcards));
            
            const deleteSettings = getSettings();
            if (deleteSettings.notificationsEnabled && deleteSettings.peerSyncAlerts === 'all') {
              toast({
                title: 'Card Deleted',
                description: 'A flashcard was deleted',
              });
            }
            
            window.dispatchEvent(new Event('storage'));
          }
        }
        break;
      }

      case 'playlist-delete': {
        const playlistId = message.data.id;
        const localPlaylists = getPlaylists();
        const playlist = localPlaylists.find(p => p.id === playlistId);
        
        // Only delete if we don't own it
        if (playlist && playlist.userId !== user?.id) {
          const updatedPlaylists = localPlaylists.filter(p => p.id !== playlistId);
          localStorage.setItem('flashcard_playlists', JSON.stringify(updatedPlaylists));
          
          const deleteSettings = getSettings();
          if (deleteSettings.notificationsEnabled && deleteSettings.peerSyncAlerts !== 'none') {
            toast({
              title: 'Playlist Deleted',
              description: `"${playlist.title}" was deleted by owner`,
            });
          }
          
          window.dispatchEvent(new Event('storage'));
        }
        break;
      }

      case 'profile-update': {
        const { userId, username, profilePicture } = message.data;
        
        console.log('[PeerContext] Received profile update:', { userId, username, profilePicture: !!profilePicture });
        
        // Save the updated profile info
        savePeerUserInfo({
          id: userId,
          username,
          profilePicture,
          peerId: message.data.peerId
        });
        
        const settings = getSettings();
        if (settings.notificationsEnabled && settings.peerSyncAlerts === 'all') {
          toast({
            title: 'Profile Updated',
            description: `${username} updated their profile`,
          });
        }
        
        // Trigger UI update
        window.dispatchEvent(new Event('storage'));
        break;
      }

      case 'stats-update': {
        const { userId, bundleId, stats } = message.data;
        
        console.log('[PeerContext] Received stats update:', { 
          userId, 
          bundleId, 
          statsData: stats 
        });
        
        // Only save stats for public bundles
        const bundles = getBundles();
        const bundle = bundles.find(b => b.id === bundleId);
        
        if (bundle?.isPublic) {
          // Import and save stats
          const { updateStats } = require('@/lib/storage');
          updateStats(stats);
          
          console.log('[PeerContext] Saved stats for public bundle:', {
            userId,
            bundleId,
            bestScore: stats.bestScore,
            bestMedal: stats.bestMedal,
            practiceCount: stats.practiceCount
          });
          
          // Trigger UI update
          window.dispatchEvent(new Event('storage'));
          
          const statsSettings = getSettings();
          if (statsSettings.notificationsEnabled && statsSettings.peerSyncAlerts === 'all') {
            // Get username from known peers
            const peerInfo = user?.knownPeers?.find(p => p.userId === userId);
            const username = peerInfo?.username || 'Someone';
            toast({
              title: 'Stats Updated',
              description: `${username} completed a study session`,
            });
          }
        } else {
          console.log('[PeerContext] Ignoring stats for non-public bundle');
        }
        break;
      }
    }
  }, [peerService, user, savePeerUserInfo]);

  const mergeIncomingData = useCallback((
    remoteBundles: Bundle[], 
    remoteFlashcards: Flashcard[], 
    remotePlaylists: Playlist[],
    remoteStats: any[]
  ) => {
    if (!user) return;
    
    const localBundles = getBundles();
    const localFlashcards = getFlashcards();
    const localPlaylists = getPlaylists();
    
    let bundlesAdded = 0;
    let bundlesUpdated = 0;
    let bundlesRemoved = 0;
    let conflicts = 0;
    
    console.log('[PeerContext] Merging incoming data:', {
      bundles: remoteBundles.length,
      flashcards: remoteFlashcards.length,
      playlists: remotePlaylists.length,
      stats: remoteStats.length
    });
    
    // Merge bundles - only accept public bundles with conflict detection
    remoteBundles.forEach((remoteBundle: Bundle) => {
      if (!remoteBundle.isPublic) return; // Skip private bundles
      
      const localBundle = localBundles.find(b => b.id === remoteBundle.id);
      
      // Check for title conflicts (different bundles with same title)
      const titleConflict = localBundles.find(
        b => b.title === remoteBundle.title && 
        b.id !== remoteBundle.id && 
        b.userId === user.id
      );
      
      if (titleConflict) {
        // Append peer username to avoid conflict - check knownPeers first
        const peerInfo = user.knownPeers?.find(p => p.userId === remoteBundle.userId);
        const peerName = peerInfo?.username || 'peer';
        remoteBundle.title = `${remoteBundle.title} (from ${peerName})`;
        conflicts++;
        console.log(`[PeerContext] Title conflict resolved: ${remoteBundle.title}`);
      }
      
      if (!localBundle) {
        // New bundle from peer - only add if it's public
        saveBundle({ ...remoteBundle, updatedAt: remoteBundle.updatedAt || remoteBundle.createdAt });
        bundlesAdded++;
      } else if (localBundle.userId !== user.id) {
        // Bundle owned by peer - update if remote is newer or merge strategy
        const remoteUpdated = new Date(remoteBundle.updatedAt || remoteBundle.createdAt).getTime();
        const localUpdated = new Date(localBundle.updatedAt || localBundle.createdAt).getTime();
        
        // Conflict resolution: newer timestamp wins
        if (remoteUpdated > localUpdated) {
          saveBundle({ ...remoteBundle, updatedAt: remoteBundle.updatedAt || remoteBundle.createdAt });
          bundlesUpdated++;
        }
      } else {
        // Bundle owned by current user - check if peer has collaborator access
        const hasCollaboratorAccess = localBundle.collaborators?.includes(remoteBundle.userId);
        
        if (hasCollaboratorAccess) {
          const remoteUpdated = new Date(remoteBundle.updatedAt || remoteBundle.createdAt).getTime();
          const localUpdated = new Date(localBundle.updatedAt || localBundle.createdAt).getTime();
          
          if (remoteUpdated > localUpdated) {
            // Collaborator made changes - merge them
            saveBundle({ ...remoteBundle, updatedAt: remoteBundle.updatedAt || remoteBundle.createdAt });
            bundlesUpdated++;
          }
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
    
    // Merge stats - only for public bundles
    const { updateStats } = require('@/lib/storage');
    let statsAdded = 0;
    let statsUpdated = 0;
    
    console.log('[PeerContext] Processing stats merge:', {
      receivedStatsCount: remoteStats.length,
      sampleStat: remoteStats[0]
    });
    
    remoteStats.forEach((remoteStat: any) => {
      // Check if this stat belongs to a public bundle
      const bundle = localBundles.find(b => b.id === remoteStat.bundleId);
      if (!bundle || !bundle.isPublic) {
        console.log('[PeerContext] Skipping stat for non-public/missing bundle:', remoteStat.bundleId);
        return;
      }
      
      // Don't overwrite own stats
      if (remoteStat.userId === user.id) {
        console.log('[PeerContext] Skipping own stat:', remoteStat.userId);
        return;
      }
      
      const localStats = getStats();
      const existingStat = localStats.find((s: any) => 
        s.userId === remoteStat.userId && s.bundleId === remoteStat.bundleId
      );
      
      if (!existingStat) {
        updateStats(remoteStat);
        statsAdded++;
        console.log('[PeerContext] Added new stat:', { 
          userId: remoteStat.userId, 
          bundleId: remoteStat.bundleId,
          practiceCount: remoteStat.practiceCount,
          bestScore: remoteStat.bestScore
        });
      } else {
        // Update if remote has more recent data or better score
        const shouldUpdate = remoteStat.practiceCount > existingStat.practiceCount ||
          remoteStat.bestScore > existingStat.bestScore ||
          (remoteStat.lastStudied && existingStat.lastStudied && 
           new Date(remoteStat.lastStudied).getTime() > new Date(existingStat.lastStudied).getTime());
           
        if (shouldUpdate) {
          updateStats(remoteStat);
          statsUpdated++;
          console.log('[PeerContext] Updated stat:', { 
            userId: remoteStat.userId, 
            bundleId: remoteStat.bundleId,
            oldPracticeCount: existingStat.practiceCount,
            newPracticeCount: remoteStat.practiceCount
          });
        }
      }
    });
    
    console.log('[PeerContext] Stats merge complete:', { 
      statsAdded, 
      statsUpdated,
      totalProcessed: remoteStats.length 
    });
    
    const settings = getSettings();
    const shouldShowAlert = settings.peerSyncAlerts === 'all' || 
      (settings.peerSyncAlerts === 'important' && (conflicts > 0 || bundlesRemoved > 0));
      
    if (settings.notificationsEnabled && shouldShowAlert) {
      const message = conflicts > 0 
        ? `${bundlesAdded} new, ${bundlesUpdated} updated, ${bundlesRemoved} removed, ${conflicts} conflicts resolved`
        : `${bundlesAdded} new, ${bundlesUpdated} updated, ${bundlesRemoved} removed. Refresh to see changes.`;
        
      toast({
        title: conflicts > 0 ? 'Data Synced (with conflicts)' : 'Data Synced',
        description: message,
        duration: 5000,
        variant: conflicts > 0 ? 'default' : 'default',
      });
      
      // Add to notification center for important events
      if (conflicts > 0 || bundlesRemoved > 0) {
        addNotification({
          title: conflicts > 0 ? 'Data Synced (with conflicts)' : 'Data Synced',
          description: message,
          type: conflicts > 0 ? 'warning' : 'success'
        });
      }
    }
  }, [user, addNotification]);

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
          
          // Handle connection requests
          peerService.onConnectionRequest((requesterId, conn, data) => {
            console.log('Connection request from:', requesterId, data);
            
            // Check if this peer is already in knownPeers
            const currentUser = getCurrentUser();
            const isKnownPeer = currentUser?.knownPeers?.some(p => p.peerId === requesterId);
            
            if (isKnownPeer) {
              // Auto-approve known peers without showing dialog
              console.log('Auto-approving known peer:', requesterId);
              peerService.approveConnection(requesterId);
              return;
            }
            
            // Get username from connection data
            const requesterUsername = data?.username || 'Unknown User';
            const requesterUserId = data?.userId;
            
            // Update peer info immediately so username shows up right away
            if (requesterUsername && requesterUsername !== 'Unknown User') {
              const updatedPeers = [...(currentUser?.knownPeers || [])];
              const existingPeerIndex = updatedPeers.findIndex(p => p.peerId === requesterId);
              
              if (existingPeerIndex >= 0) {
                updatedPeers[existingPeerIndex] = {
                  ...updatedPeers[existingPeerIndex],
                  username: requesterUsername,
                  userId: requesterUserId,
                  status: 'connecting'
                };
              } else {
                updatedPeers.push({
                  peerId: requesterId,
                  username: requesterUsername,
                  userId: requesterUserId,
                  status: 'connecting'
                });
              }
              
              updateUser(currentUser!.id, { knownPeers: updatedPeers });
              setKnownPeers(updatedPeers);
            }
            
            // Check if same username (same user, different device?)
            if (user && requesterUsername === user.username) {
              console.log('Same username detected, showing same-name dialog');
              setSameNameRequest({
                peerId: requesterId,
                username: requesterUsername,
                userId: requesterUserId
              });
            } else {
              console.log('Different username, showing approval dialog');
              setPendingConnectionRequest({
                peerId: requesterId,
                username: requesterUsername,
                userId: requesterUserId
              });
            }
          });
          
          peerService.onConnection((connectedPeerId) => {
            console.log('Peer connected, updating known peers:', connectedPeerId);
            
            // Get current user and users list for username lookup
              const currentUser = getCurrentUser();
              if (!currentUser) return;
              
              const users = getUsers();
              const peerUser = users.find(u => u.peerId === connectedPeerId);
              
              // Update state with sync status
              setKnownPeers(prev => {
                const updated = prev.map(p => 
                  p.peerId === connectedPeerId 
                    ? { 
                        ...p, 
                        status: 'connected' as const, 
                        lastConnected: new Date().toISOString(), 
                        username: peerUser?.username || p.username, 
                        userId: peerUser?.id,
                        profilePicture: peerUser?.profilePicture,
                        syncStatus: 'syncing' 
                      }
                    : p
                );
                
                // Add if not exists
                const finalPeers = updated.some(p => p.peerId === connectedPeerId) 
                  ? updated 
                  : [...updated, { 
                      peerId: connectedPeerId, 
                      username: peerUser?.username,
                      userId: peerUser?.id,
                      profilePicture: peerUser?.profilePicture,
                      status: 'connected' as const,
                      lastConnected: new Date().toISOString(),
                      syncStatus: 'syncing' 
                    }];
                
                // Save immediately to localStorage (synchronous)
                updateUser(currentUser.id, { knownPeers: finalPeers });
                refreshUser(); // Refresh user in AuthContext
                console.log('Saved known peers to storage:', finalPeers.length);
                
                return finalPeers;
              });
            
            // Auto-sync when peer connects - check settings
            const connectionSettings = getSettings();
            if (connectionSettings.autoSyncOnConnection) {
              setTimeout(() => {
                const allBundles = getBundles();
                const allFlashcards = getFlashcards();
                const allPlaylists = getPlaylists();
                
                const publicBundles = allBundles.filter(b => b.isPublic);
                const publicBundleIds = new Set(publicBundles.map(b => b.id));
                const publicFlashcards = allFlashcards.filter(f => publicBundleIds.has(f.bundleId));
                const publicPlaylists = allPlaylists.filter(p => p.isPublic);
                
                // Get stats for public bundles
                const allStats = getStats();
                const publicStats = allStats.filter((s: any) => 
                  publicBundleIds.has(s.bundleId)
                );
                
                console.log('[PeerContext] Auto-sync on connection, sending data:', {
                  bundles: publicBundles.length,
                  flashcards: publicFlashcards.length,
                  playlists: publicPlaylists.length,
                  stats: publicStats.length
                });
                
                // Send sync-response (not request) with our data
                const currentUserInfo = currentUser ? { 
                  id: currentUser.id, 
                  username: currentUser.username, 
                  peerId: currentUser.peerId,
                  profilePicture: currentUser.profilePicture 
                } : null;
                
                peerService.sendSyncData(
                  publicBundles, 
                  publicFlashcards, 
                  publicPlaylists,
                  publicStats,
                  currentUserInfo
                );
              }, 1000);
            }
            if (connectionSettings.notificationsEnabled) {
              addNotification({
                title: 'Peer Connected',
                description: `Connected to peer`,
                type: 'success'
              });
              toast({
                title: 'Peer Connected',
                description: `Connected to peer`,
              });
            }
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
            
            const settings = getSettings();
            if (settings.notificationsEnabled) {
              addNotification({
                title: 'Peer Disconnected',
                description: `Peer disconnected`,
                type: 'warning'
              });
              toast({
                title: 'Peer Disconnected',
                description: `Peer disconnected`,
              });
            }
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
          addNotification({
            title: 'P2P Error',
            description: 'Failed to initialize peer connection',
            type: 'error'
          });
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

    // Online/offline detection and queue processing
    const handleOnline = () => {
      console.log('[PeerContext] Network online, processing offline queue...');
      setIsOnline(true);
      
      // Process offline queue
      const queuedOps = offlineQueue.getAll();
      if (queuedOps.length > 0) {
        addNotification({
          title: 'Back Online',
          description: `Processing ${queuedOps.length} queued operation(s)`,
          type: 'info'
        });
        
        queuedOps.forEach(op => {
          // Try to send the queued operation
          peerService.sendMessage({
            type: op.type as any,
            data: op.data,
            timestamp: Date.now()
          });
          
          offlineQueue.remove(op.id);
        });
      }
    };
    
    const handleOffline = () => {
      console.log('[PeerContext] Network offline');
      setIsOnline(false);
      addNotification({
        title: 'Offline',
        description: 'Changes will be queued and synced when you\'re back online',
        type: 'warning'
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Don't destroy on unmount, only when user changes or page unloads
    };
  }, [user, isInitialized, peerService, handleIncomingData, currentUserId, offlineQueue, addNotification]);

  const syncData = useCallback(() => {
    // Get public data to send
    const allBundles = getBundles();
    const allFlashcards = getFlashcards();
    const allPlaylists = getPlaylists();
    
    const publicBundles = allBundles.filter(b => b.isPublic);
    const publicBundleIds = new Set(publicBundles.map(b => b.id));
    const publicFlashcards = allFlashcards.filter(f => publicBundleIds.has(f.bundleId));
    const publicPlaylists = allPlaylists.filter(p => p.isPublic);
    
    // Use delta sync to only send changes
    const changes = deltaSync.filterChanged(publicBundles, publicFlashcards, publicPlaylists);
    
    console.log('[PeerContext] Syncing delta changes:', changes);
    
    // Send sync request with our data (bidirectional)
    peerService.sendSyncRequest({
      bundles: changes.bundles.length > 0 ? changes.bundles : publicBundles, // Fallback to full sync if no changes
      flashcards: changes.flashcards.length > 0 ? changes.flashcards : publicFlashcards,
      playlists: changes.playlists.length > 0 ? changes.playlists : publicPlaylists
    });
    
    // Mark as synced
    deltaSync.markSynced(publicBundles, publicFlashcards, publicPlaylists);
    
    const settings = getSettings();
    if (settings.notificationsEnabled) {
      const changedCount = changes.bundles.length + changes.flashcards.length + changes.playlists.length;
      toast({
        title: 'Syncing...',
        description: changedCount > 0 
          ? `Sending ${changedCount} change(s) to connected peers...`
          : 'Exchanging data with connected peers...',
      });
    }
  }, [peerService, deltaSync]);

  // Setup automatic sync based on settings
  useEffect(() => {
    if (!isInitialized || knownPeers.filter(p => p.status === 'connected').length === 0) {
      return;
    }

    const settings = getSettings();

    // Clear existing interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    if (settings.syncFrequency === 'interval') {
      // Setup interval-based sync
      syncIntervalRef.current = setInterval(() => {
        console.log('Auto-syncing based on interval...');
        syncData();
      }, settings.syncIntervalMinutes * 60 * 1000);
    } else if (settings.syncFrequency === 'always') {
      // Setup change detection (debounced)
      const detectChanges = () => {
        if (dataChangeTimeoutRef.current) {
          clearTimeout(dataChangeTimeoutRef.current);
        }
        
        dataChangeTimeoutRef.current = setTimeout(() => {
          console.log('Auto-syncing due to detected changes...');
          syncData();
        }, 2000); // Debounce for 2 seconds
      };

      // Listen for storage changes
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key?.startsWith('flashcard_bundle_') || 
            e.key === 'bundles' || 
            e.key === 'playlists' ||
            e.key === 'flashcards') {
          detectChanges();
        }
      };

      window.addEventListener('storage', handleStorageChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        if (dataChangeTimeoutRef.current) {
          clearTimeout(dataChangeTimeoutRef.current);
        }
      };
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isInitialized, knownPeers, syncData]);

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
      await peerService.connectToPeer(peerId, username, user?.id);
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
      
      // Auto-retry logic
      const retryCount = (retryTimeoutsRef.current.get(peerId) as any)?.retryCount || 0;
      if (retryCount < 3) {
        const timeout = setTimeout(() => {
          console.log(`Auto-retrying connection to ${peerId} (attempt ${retryCount + 1}/3)`);
          connectToPeer(peerId, username);
        }, Math.pow(2, retryCount) * 2000); // Exponential backoff: 2s, 4s, 8s
        
        (timeout as any).retryCount = retryCount + 1;
        retryTimeoutsRef.current.set(peerId, timeout);
      } else {
        addNotification({
          title: 'Connection Failed',
          description: `Could not connect to peer after 3 attempts`,
          type: 'error'
        });
      }
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
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Remove from known peers
    const updatedPeers = (currentUser.knownPeers || []).filter(p => p.peerId !== peerId);
    updateUser(currentUser.id, { knownPeers: updatedPeers });
    setKnownPeers(updatedPeers);
    refreshUser();

    // Remove their bundles
    const allBundles = getBundles();
    const bundlesToRemove = allBundles.filter(b => b.originPeerId === peerId);
    bundlesToRemove.forEach(bundle => {
      deleteBundle(bundle.id);
      const bundleCards = getFlashcards().filter(c => c.bundleId === bundle.id);
      bundleCards.forEach(card => deleteFlashcard(card.id));
    });

    // Notify the peer and disconnect
    peerService.removePeer(peerId);

    toast({
      title: 'Peer Removed',
      description: `Peer removed and ${bundlesToRemove.length} shared bundle(s) deleted`,
    });
  };

  const approvePeerConnection = () => {
    if (pendingConnectionRequest) {
      peerService.approveConnection(pendingConnectionRequest.peerId);
      toast({ 
        title: 'Connection Approved', 
        description: `Connected to ${pendingConnectionRequest.username}` 
      });
      setPendingConnectionRequest(null);
    }
  };

  const rejectPeerConnection = () => {
    if (pendingConnectionRequest) {
      peerService.rejectConnection(pendingConnectionRequest.peerId);
      toast({ 
        title: 'Connection Rejected', 
        description: `Rejected connection from ${pendingConnectionRequest.username}` 
      });
      setPendingConnectionRequest(null);
    }
  };

  const handleSameNameChoice = (isSameDevice: boolean) => {
    if (sameNameRequest) {
      if (isSameDevice) {
        // Approve and merge devices
        peerService.approveConnection(sameNameRequest.peerId);
        toast({ 
          title: 'Devices Merged', 
          description: 'Your devices are now syncing' 
        });
      } else {
        // Different person, reject
        peerService.rejectConnection(sameNameRequest.peerId);
        toast({ 
          title: 'Connection Rejected', 
          description: 'Connection rejected - different user' 
        });
      }
      setSameNameRequest(null);
    }
  };
  
  // Broadcast updates to all connected peers in real-time
  const broadcastUpdate = useCallback((type: 'bundle' | 'flashcard' | 'playlist', data: any) => {
    const connectedPeers = knownPeers.filter(p => p.status === 'connected');
    
    // If offline, queue the operation
    if (!isOnline || connectedPeers.length === 0) {
      console.log(`[PeerContext] ${isOnline ? 'No peers connected' : 'Offline'}, queuing ${type} update`);
      offlineQueue.add(`${type}-update`, data);
      return;
    }
    
    // Include user info with the update so peers can identify the creator
    const messageData = {
      [type]: data,
      userInfo: user ? {
        id: user.id,
        username: user.username,
        peerId: user.peerId,
        profilePicture: user.profilePicture
      } : null
    };
    
    // Only broadcast public items
    if ('isPublic' in data && !data.isPublic) {
      // If item became private, send update to remove it from peers
      peerService.sendMessage({
        type: `${type}-update`,
        data: messageData,
        timestamp: Date.now()
      });
      deltaSync.removeDeleted(type, data.id);
      return;
    }
    
    // Broadcast the update
    peerService.sendMessage({
      type: `${type}-update`,
      data: messageData,
      timestamp: Date.now()
    });
    
    console.log(`[PeerContext] Broadcasted ${type} update to ${connectedPeers.length} peers with user info`);
  }, [knownPeers, peerService, isOnline, offlineQueue, deltaSync, user]);

  const broadcastDelete = useCallback((type: 'bundle' | 'flashcard' | 'playlist', id: string) => {
    const connectedPeers = knownPeers.filter(p => p.status === 'connected');
    
    // If offline, queue the operation
    if (!isOnline || connectedPeers.length === 0) {
      console.log(`[PeerContext] ${isOnline ? 'No peers connected' : 'Offline'}, queuing ${type} deletion`);
      offlineQueue.add(`${type}-delete`, { id });
      return;
    }
    
    // Broadcast the deletion
    peerService.sendMessage({
      type: `${type}-delete`,
      data: { id },
      timestamp: Date.now()
    });
    
    // Remove from delta sync
    deltaSync.removeDeleted(type, id);
    
    console.log(`[PeerContext] Broadcasted ${type} deletion to ${connectedPeers.length} peers`);
  }, [knownPeers, peerService, isOnline, offlineQueue, deltaSync]);

  // Broadcast profile updates
  const broadcastProfileUpdate = useCallback((userId: string, username: string, profilePicture?: string) => {
    const connectedPeers = knownPeers.filter(p => p.status === 'connected');
    
    if (!isOnline || connectedPeers.length === 0) {
      console.log(`[PeerContext] ${isOnline ? 'No peers connected' : 'Offline'}, queuing profile update`);
      offlineQueue.add('profile-update', { userId, username, profilePicture, peerId: myPeerId });
      return;
    }
    
    peerService.sendMessage({
      type: 'profile-update',
      data: { userId, username, profilePicture, peerId: myPeerId },
      timestamp: Date.now()
    });
    
    console.log(`[PeerContext] Broadcasted profile update to ${connectedPeers.length} peers`);
  }, [knownPeers, peerService, isOnline, offlineQueue, myPeerId]);

  // Broadcast stats updates (only for public bundles)
  const broadcastStatsUpdate = useCallback((userId: string, bundleId: string, stats: any) => {
    // Check if bundle is public
    const bundles = getBundles();
    const bundle = bundles.find(b => b.id === bundleId);
    
    if (!bundle?.isPublic) {
      console.log(`[PeerContext] Not broadcasting stats for private bundle`);
      return;
    }
    
    const connectedPeers = knownPeers.filter(p => p.status === 'connected');
    
    if (!isOnline || connectedPeers.length === 0) {
      console.log(`[PeerContext] ${isOnline ? 'No peers connected' : 'Offline'}, queuing stats update`);
      offlineQueue.add('stats-update', { userId, bundleId, stats });
      return;
    }
    
    const message = {
      type: 'stats-update' as const,
      data: { userId, bundleId, stats },
      timestamp: Date.now()
    };
    
    peerService.sendMessage(message);
    
    console.log(`[PeerContext] Broadcasted stats update to ${connectedPeers.length} peers:`, {
      userId,
      bundleId,
      stats: {
        bestScore: stats.bestScore,
        bestMedal: stats.bestMedal,
        practiceCount: stats.practiceCount
      }
    });
  }, [knownPeers, peerService, isOnline, offlineQueue]);

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
        broadcastUpdate,
        broadcastDelete,
        broadcastProfileUpdate,
        broadcastStatsUpdate,
        pendingConnectionRequest,
        approvePeerConnection,
        rejectPeerConnection,
        sameNameRequest,
        handleSameNameChoice,
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
