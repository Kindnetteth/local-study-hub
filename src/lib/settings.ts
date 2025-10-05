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
  customPrimaryColor: string;
  customBackgroundType: 'solid' | 'gradient' | 'none';
  customBackgroundColor: string;
  customBackgroundGradient: { start: string; end: string; angle: number };
  cardOpacity: number;
  glossLevel: number;
  fontSize: 'small' | 'medium' | 'large';
  animationSpeed: 'fast' | 'normal' | 'slow' | 'off';
  compactMode: boolean;
  showConfetti: boolean;
  cardCorners: 'rounded' | 'sharp';
  reduceMotion: boolean;
  
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
  customPrimaryColor: '#a855f7',
  customBackgroundType: 'none',
  customBackgroundColor: '#ffffff',
  customBackgroundGradient: { start: '#a855f7', end: '#3b82f6', angle: 135 },
  cardOpacity: 100,
  glossLevel: 0,
  fontSize: 'medium',
  animationSpeed: 'normal',
  compactMode: false,
  showConfetti: true,
  cardCorners: 'rounded',
  reduceMotion: false,
  
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
  
  // Apply visual settings immediately
  applySettingsToDOM(updated);
  
  // Apply electron-specific settings
  if ((window as any).electronAPI) {
    if (settings.launchOnStartup !== undefined) {
      (window as any).electronAPI.setAutoLaunch?.(settings.launchOnStartup);
    }
  }
  
  // Dispatch event for other components to react
  window.dispatchEvent(new CustomEvent('settingsChanged', { detail: updated }));
}

export function applySettingsToDOM(settings: AppSettings): void {
  const root = document.documentElement;
  
  // Apply theme
  if (settings.theme === 'dark') {
    root.classList.add('dark');
  } else if (settings.theme === 'light') {
    root.classList.remove('dark');
  } else {
    // System theme
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', isDark);
  }
  
  // Apply custom primary color
  if (settings.customPrimaryColor) {
    const hsl = hexToHSL(settings.customPrimaryColor);
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--ring', hsl);
  }
  
  // Apply custom background
  if (settings.customBackgroundType === 'solid' && settings.customBackgroundColor) {
    const hsl = hexToHSL(settings.customBackgroundColor);
    root.style.setProperty('--background', hsl);
    document.body.style.backgroundImage = 'none';
  } else if (settings.customBackgroundType === 'gradient') {
    const { start, end, angle } = settings.customBackgroundGradient;
    document.body.style.backgroundImage = `linear-gradient(${angle}deg, ${start}, ${end})`;
  } else {
    document.body.style.backgroundImage = 'none';
  }
  
  // Apply font size
  const fontSizes = { small: '14px', medium: '16px', large: '18px' };
  root.style.setProperty('--base-font-size', fontSizes[settings.fontSize]);
  document.body.style.fontSize = fontSizes[settings.fontSize];
  
  // Apply animation speed
  const animationSpeeds = { fast: '0.15s', normal: '0.3s', slow: '0.6s', off: '0s' };
  root.style.setProperty('--animation-duration', animationSpeeds[settings.animationSpeed]);
  
  // Apply reduce motion
  if (settings.reduceMotion) {
    root.style.setProperty('--animation-duration', '0s');
  }
}

function hexToHSL(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function resetSettings(): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
}
