// Delta sync - only send changed data

import { Bundle, Flashcard, Playlist } from './storage';

interface ChangeLog {
  bundles: Map<string, number>; // id -> lastSyncedTimestamp
  flashcards: Map<string, number>;
  playlists: Map<string, number>;
}

const CHANGELOG_KEY = 'p2p_changelog';

export class DeltaSyncManager {
  private changelog: ChangeLog = {
    bundles: new Map(),
    flashcards: new Map(),
    playlists: new Map(),
  };
  
  constructor() {
    this.loadChangelog();
  }
  
  private loadChangelog() {
    try {
      const stored = localStorage.getItem(CHANGELOG_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.changelog = {
          bundles: new Map(data.bundles || []),
          flashcards: new Map(data.flashcards || []),
          playlists: new Map(data.playlists || []),
        };
      }
    } catch (error) {
      console.error('Failed to load changelog:', error);
    }
  }
  
  private saveChangelog() {
    try {
      const data = {
        bundles: Array.from(this.changelog.bundles.entries()),
        flashcards: Array.from(this.changelog.flashcards.entries()),
        playlists: Array.from(this.changelog.playlists.entries()),
      };
      localStorage.setItem(CHANGELOG_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save changelog:', error);
    }
  }
  
  // Filter items to only those that changed since last sync
  filterChanged(bundles: Bundle[], flashcards: Flashcard[], playlists: Playlist[]): {
    bundles: Bundle[];
    flashcards: Flashcard[];
    playlists: Playlist[];
  } {
    const changedBundles = bundles.filter(b => {
      const lastSync = this.changelog.bundles.get(b.id) || 0;
      const updated = new Date(b.updatedAt || b.createdAt).getTime();
      return updated > lastSync;
    });
    
    const changedFlashcards = flashcards.filter(f => {
      const lastSync = this.changelog.flashcards.get(f.id) || 0;
      const updated = new Date(f.updatedAt || f.createdAt).getTime();
      return updated > lastSync;
    });
    
    const changedPlaylists = playlists.filter(p => {
      const lastSync = this.changelog.playlists.get(p.id) || 0;
      const updated = new Date(p.updatedAt || p.createdAt).getTime();
      return updated > lastSync;
    });
    
    console.log(`[DeltaSync] Filtered changes: ${changedBundles.length} bundles, ${changedFlashcards.length} flashcards, ${changedPlaylists.length} playlists`);
    
    return {
      bundles: changedBundles,
      flashcards: changedFlashcards,
      playlists: changedPlaylists,
    };
  }
  
  // Mark items as synced
  markSynced(bundles: Bundle[], flashcards: Flashcard[], playlists: Playlist[]) {
    const now = Date.now();
    
    bundles.forEach(b => {
      this.changelog.bundles.set(b.id, now);
    });
    
    flashcards.forEach(f => {
      this.changelog.flashcards.set(f.id, now);
    });
    
    playlists.forEach(p => {
      this.changelog.playlists.set(p.id, now);
    });
    
    this.saveChangelog();
  }
  
  // Remove deleted items from changelog
  removeDeleted(type: 'bundle' | 'flashcard' | 'playlist', id: string) {
    switch (type) {
      case 'bundle':
        this.changelog.bundles.delete(id);
        break;
      case 'flashcard':
        this.changelog.flashcards.delete(id);
        break;
      case 'playlist':
        this.changelog.playlists.delete(id);
        break;
    }
    this.saveChangelog();
  }
}
