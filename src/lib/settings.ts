export interface AppSettings {
  // P2P Sync
  syncFrequency: 'always' | 'interval' | 'manual';
  syncIntervalMinutes: number;
  notificationsEnabled: boolean;
  desktopNotifications: boolean;
  autoSyncOnConnection: boolean;
  runInBackground: boolean;
  launchOnStartup: boolean;
  autoCheckUpdates: boolean;
  
  // Visual & UI
  theme: 'light' | 'dark' | 'system';
  accentColor: 'default' | 'purple' | 'blue' | 'green';
  fontSize: 'small' | 'medium' | 'large';
  animationSpeed: 'fast' | 'normal' | 'slow' | 'off';
  compactMode: boolean;
  showConfetti: boolean;
  cardCorners: 'rounded' | 'sharp';
  reduceMotion: boolean;
  customBackground: string;
  
  // Study Preferences
  autoAdvanceCards: boolean;
  autoAdvanceDelay: number;
  shuffleByDefault: boolean;
  showStudyTimer: boolean;
  studyStreakReminders: boolean;
  soundEffects: boolean;
  dailyStudyGoal: number;
  
  // Shortcuts & Controls
  keyboardShortcuts: {
    flip: string;
    correct: string;
    wrong: string;
  };
  swipeSensitivity: 'low' | 'medium' | 'high';
  doubleTapToFlip: boolean;
  
  // Smart Notifications
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  streakAlerts: boolean;
  weeklyDigest: boolean;
  peerSyncAlerts: 'all' | 'important' | 'none';
  
  // Performance
  offlineMode: boolean;
  imageQuality: 'high' | 'medium' | 'low';
  preloadImages: boolean;
  cacheLimit: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  // P2P Sync
  syncFrequency: 'always',
  syncIntervalMinutes: 5,
  notificationsEnabled: true,
  desktopNotifications: true,
  autoSyncOnConnection: true,
  runInBackground: false,
  launchOnStartup: false,
  autoCheckUpdates: true,
  
  // Visual & UI
  theme: 'system',
  accentColor: 'default',
  fontSize: 'medium',
  animationSpeed: 'normal',
  compactMode: false,
  showConfetti: true,
  cardCorners: 'rounded',
  reduceMotion: false,
  customBackground: '',
  
  // Study Preferences
  autoAdvanceCards: false,
  autoAdvanceDelay: 3,
  shuffleByDefault: false,
  showStudyTimer: true,
  studyStreakReminders: true,
  soundEffects: true,
  dailyStudyGoal: 20,
  
  // Shortcuts & Controls
  keyboardShortcuts: {
    flip: 'Space',
    correct: 'ArrowRight',
    wrong: 'ArrowLeft',
  },
  swipeSensitivity: 'medium',
  doubleTapToFlip: false,
  
  // Smart Notifications
  dailyReminderEnabled: false,
  dailyReminderTime: '19:00',
  streakAlerts: true,
  weeklyDigest: false,
  peerSyncAlerts: 'important',
  
  // Performance
  offlineMode: false,
  imageQuality: 'high',
  preloadImages: true,
  cacheLimit: 100,
};

const SETTINGS_KEY = 'app_settings';

export function getSettings(): AppSettings {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) return DEFAULT_SETTINGS;
  
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<AppSettings>): void {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  
  // Apply electron-specific settings
  if ((window as any).electronAPI) {
    if (settings.launchOnStartup !== undefined) {
      (window as any).electronAPI.setAutoLaunch?.(settings.launchOnStartup);
    }
  }
}

export function resetSettings(): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
}
