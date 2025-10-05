export interface AppSettings {
  syncFrequency: 'always' | 'interval' | 'manual';
  syncIntervalMinutes: number;
  notificationsEnabled: boolean;
  desktopNotifications: boolean;
  autoSyncOnConnection: boolean;
  runInBackground: boolean;
  launchOnStartup: boolean;
  autoCheckUpdates: boolean;
  theme: 'light' | 'dark' | 'system';
}

const DEFAULT_SETTINGS: AppSettings = {
  syncFrequency: 'always',
  syncIntervalMinutes: 5,
  notificationsEnabled: true,
  desktopNotifications: true,
  autoSyncOnConnection: true,
  runInBackground: false,
  launchOnStartup: false,
  autoCheckUpdates: true,
  theme: 'system',
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
