// Local storage utilities for offline data persistence

export interface User {
  id: string;
  username: string;
  password: string;
  profilePicture?: string;
  createdAt: string;
  peerId?: string;
  connectedPeers?: string[];
}

export interface Flashcard {
  id: string;
  bundleId: string;
  questionText?: string;
  questionImage?: string;
  answerText?: string;
  answerImage?: string;
  hints: Array<{ text?: string; image?: string }>;
  createdAt: string;
}

export interface Bundle {
  id: string;
  userId: string;
  title: string;
  thumbnail?: string;
  label?: string;
  isPublic: boolean;
  collaborators: string[]; // Array of user IDs who can edit
  createdAt: string;
}

export interface Playlist {
  id: string;
  userId: string;
  title: string;
  cardIds: string[]; // Array of flashcard IDs from any bundle
  isPublic: boolean;
  createdAt: string;
}

export interface UserStats {
  userId: string;
  bundleId: string;
  cardStats: Record<string, {
    correct: number;
    incorrect: number;
    lastStudied?: string;
  }>;
  totalCorrect: number;
  totalIncorrect: number;
  lastStudied?: string;
  bestScore: number;
  bestMedal: 'none' | 'bronze' | 'silver' | 'gold';
  practiceCount: number;
  completionCount: number;
}

const STORAGE_KEYS = {
  USERS: 'flashcard_users',
  CURRENT_USER: 'flashcard_current_user',
  BUNDLES: 'flashcard_bundles',
  FLASHCARDS: 'flashcard_flashcards',
  STATS: 'flashcard_stats',
  THEME: 'flashcard_theme',
  PLAYLISTS: 'flashcard_playlists',
};

// Theme
export const getTheme = (): 'light' | 'dark' => {
  const theme = localStorage.getItem(STORAGE_KEYS.THEME);
  return (theme as 'light' | 'dark') || 'light';
};

export const setTheme = (theme: 'light' | 'dark') => {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
};

// Initialize admin account
export const initializeStorage = () => {
  const users = getUsers();
  if (!users.find(u => u.username === 'Kind')) {
    const adminUser: User = {
      id: 'admin',
      username: 'Kind',
      password: '999',
      createdAt: new Date().toISOString(),
    };
    users.push(adminUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }
};

// Users
export const getUsers = (): User[] => {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  return data ? JSON.parse(data) : [];
};

export const saveUser = (user: User) => {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

export const updateUser = (userId: string, updates: Partial<User>) => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }
};

export const deleteUser = (userId: string) => {
  const users = getUsers().filter(u => u.id !== userId);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

// Current user session
export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
};

export const setCurrentUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};

// Bundles
export const getBundles = (): Bundle[] => {
  const data = localStorage.getItem(STORAGE_KEYS.BUNDLES);
  return data ? JSON.parse(data) : [];
};

export const saveBundle = (bundle: Bundle) => {
  const bundles = getBundles();
  bundles.push(bundle);
  localStorage.setItem(STORAGE_KEYS.BUNDLES, JSON.stringify(bundles));
};

export const updateBundle = (bundleId: string, updates: Partial<Bundle>) => {
  const bundles = getBundles();
  const index = bundles.findIndex(b => b.id === bundleId);
  if (index !== -1) {
    bundles[index] = { ...bundles[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.BUNDLES, JSON.stringify(bundles));
  }
};

export const deleteBundle = (bundleId: string) => {
  const bundles = getBundles().filter(b => b.id !== bundleId);
  localStorage.setItem(STORAGE_KEYS.BUNDLES, JSON.stringify(bundles));
  
  // Also delete associated flashcards
  const flashcards = getFlashcards().filter(f => f.bundleId !== bundleId);
  localStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify(flashcards));
};

// Flashcards
export const getFlashcards = (): Flashcard[] => {
  const data = localStorage.getItem(STORAGE_KEYS.FLASHCARDS);
  return data ? JSON.parse(data) : [];
};

export const saveFlashcard = (flashcard: Flashcard) => {
  const flashcards = getFlashcards();
  flashcards.push(flashcard);
  localStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify(flashcards));
};

export const updateFlashcard = (flashcardId: string, updates: Partial<Flashcard>) => {
  const flashcards = getFlashcards();
  const index = flashcards.findIndex(f => f.id === flashcardId);
  if (index !== -1) {
    flashcards[index] = { ...flashcards[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify(flashcards));
  }
};

export const deleteFlashcard = (flashcardId: string) => {
  const flashcards = getFlashcards().filter(f => f.id !== flashcardId);
  localStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify(flashcards));
};

// Stats
export const getStats = (): UserStats[] => {
  const data = localStorage.getItem(STORAGE_KEYS.STATS);
  return data ? JSON.parse(data) : [];
};

export const getUserBundleStats = (userId: string, bundleId: string): UserStats | null => {
  const stats = getStats();
  return stats.find(s => s.userId === userId && s.bundleId === bundleId) || null;
};

export const updateStats = (stats: UserStats) => {
  const allStats = getStats();
  const index = allStats.findIndex(s => s.userId === stats.userId && s.bundleId === stats.bundleId);
  
  if (index !== -1) {
    allStats[index] = stats;
  } else {
    allStats.push(stats);
  }
  
  localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(allStats));
};

export const getUserStats = (userId: string): UserStats[] => {
  const stats = getStats();
  return stats.filter(s => s.userId === userId);
};

// Playlists
export const getPlaylists = (): Playlist[] => {
  const data = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
  return data ? JSON.parse(data) : [];
};

export const savePlaylist = (playlist: Playlist) => {
  const playlists = getPlaylists();
  playlists.push(playlist);
  localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
};

export const updatePlaylist = (playlistId: string, updates: Partial<Playlist>) => {
  const playlists = getPlaylists();
  const index = playlists.findIndex(p => p.id === playlistId);
  if (index !== -1) {
    playlists[index] = { ...playlists[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
  }
};

export const deletePlaylist = (playlistId: string) => {
  const playlists = getPlaylists().filter(p => p.id !== playlistId);
  localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
};
