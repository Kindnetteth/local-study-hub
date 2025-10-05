import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings, resetSettings, AppSettings } from '@/lib/settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { ArrowLeft, RotateCcw, Palette, BookOpen, Keyboard, Bell, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const isElectron = !!(window as any).electron?.isElectron;

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings({ [key]: value });
    
    toast({
      title: 'Settings Updated',
      description: 'Your preferences have been saved.',
    });
  };

  const handleReset = () => {
    resetSettings();
    setSettings(getSettings());
    toast({
      title: 'Settings Reset',
      description: 'All settings have been reset to defaults.',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* P2P Sync Settings */}
          <Card>
            <CardHeader>
              <CardTitle>P2P Sync Settings</CardTitle>
              <CardDescription>
                Configure how your data syncs with connected peers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-sync on Connection</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync when a peer connects
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoSyncOnConnection}
                    onCheckedChange={(checked) => updateSetting('autoSyncOnConnection', checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Sync Frequency</Label>
                  <Select
                    value={settings.syncFrequency}
                    onValueChange={(value: AppSettings['syncFrequency']) => 
                      updateSetting('syncFrequency', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="always">Always (Real-time)</SelectItem>
                      <SelectItem value="interval">Interval</SelectItem>
                      <SelectItem value="manual">Manual Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {settings.syncFrequency === 'always' && 'Data syncs automatically when changes are detected'}
                    {settings.syncFrequency === 'interval' && 'Data syncs at regular intervals'}
                    {settings.syncFrequency === 'manual' && 'Data only syncs when you manually trigger it'}
                  </p>
                </div>

                {settings.syncFrequency === 'interval' && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Sync Interval: {settings.syncIntervalMinutes} minutes</Label>
                      <Slider
                        value={[settings.syncIntervalMinutes]}
                        onValueChange={([value]) => updateSetting('syncIntervalMinutes', value)}
                        min={1}
                        max={60}
                        step={1}
                      />
                      <p className="text-sm text-muted-foreground">
                        How often to sync with connected peers
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Manage notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show in-app notifications for sync events
                  </p>
                </div>
                <Switch
                  checked={settings.notificationsEnabled}
                  onCheckedChange={(checked) => updateSetting('notificationsEnabled', checked)}
                />
              </div>

              {isElectron && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Desktop Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Show system tray notifications
                      </p>
                    </div>
                    <Switch
                      checked={settings.desktopNotifications}
                      onCheckedChange={(checked) => updateSetting('desktopNotifications', checked)}
                      disabled={!settings.notificationsEnabled}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Electron-specific Settings */}
          {isElectron && (
            <Card>
              <CardHeader>
                <CardTitle>Application Behavior</CardTitle>
                <CardDescription>
                  Desktop application preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Launch on Startup</Label>
                    <p className="text-sm text-muted-foreground">
                      Start FlashLearn when your computer starts
                    </p>
                  </div>
                  <Switch
                    checked={settings.launchOnStartup}
                    onCheckedChange={(checked) => updateSetting('launchOnStartup', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Run in Background</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimize to system tray instead of closing
                    </p>
                  </div>
                  <Switch
                    checked={settings.runInBackground}
                    onCheckedChange={(checked) => updateSetting('runInBackground', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-check for Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically check for updates on launch
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoCheckUpdates}
                    onCheckedChange={(checked) => updateSetting('autoCheckUpdates', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Visual & UI */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                <CardTitle>Visual & UI</CardTitle>
              </div>
              <CardDescription>
                Customize the appearance of your app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Accent Color</Label>
                <Select
                  value={settings.accentColor}
                  onValueChange={(value: AppSettings['accentColor']) => 
                    updateSetting('accentColor', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Font Size</Label>
                <Select
                  value={settings.fontSize}
                  onValueChange={(value: AppSettings['fontSize']) => 
                    updateSetting('fontSize', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Animation Speed</Label>
                <Select
                  value={settings.animationSpeed}
                  onValueChange={(value: AppSettings['animationSpeed']) => 
                    updateSetting('animationSpeed', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fast">Fast</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="slow">Slow</SelectItem>
                    <SelectItem value="off">Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Card Corners</Label>
                <Select
                  value={settings.cardCorners}
                  onValueChange={(value: AppSettings['cardCorners']) => 
                    updateSetting('cardCorners', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rounded">Rounded</SelectItem>
                    <SelectItem value="sharp">Sharp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Denser layout for power users
                  </p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(checked) => updateSetting('compactMode', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Confetti</Label>
                  <p className="text-sm text-muted-foreground">
                    Celebrate achievements with confetti
                  </p>
                </div>
                <Switch
                  checked={settings.showConfetti}
                  onCheckedChange={(checked) => updateSetting('showConfetti', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Reduce Motion</Label>
                  <p className="text-sm text-muted-foreground">
                    Minimize animations for accessibility
                  </p>
                </div>
                <Switch
                  checked={settings.reduceMotion}
                  onCheckedChange={(checked) => updateSetting('reduceMotion', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Study Preferences */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <CardTitle>Study Preferences</CardTitle>
              </div>
              <CardDescription>
                Customize your study experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-advance Cards</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically flip to next card
                  </p>
                </div>
                <Switch
                  checked={settings.autoAdvanceCards}
                  onCheckedChange={(checked) => updateSetting('autoAdvanceCards', checked)}
                />
              </div>

              {settings.autoAdvanceCards && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Auto-advance Delay: {settings.autoAdvanceDelay} seconds</Label>
                    <Slider
                      value={[settings.autoAdvanceDelay]}
                      onValueChange={([value]) => updateSetting('autoAdvanceDelay', value)}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Shuffle by Default</Label>
                  <p className="text-sm text-muted-foreground">
                    Always randomize card order
                  </p>
                </div>
                <Switch
                  checked={settings.shuffleByDefault}
                  onCheckedChange={(checked) => updateSetting('shuffleByDefault', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Timer</Label>
                  <p className="text-sm text-muted-foreground">
                    Display study session timer
                  </p>
                </div>
                <Switch
                  checked={settings.showStudyTimer}
                  onCheckedChange={(checked) => updateSetting('showStudyTimer', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sound Effects</Label>
                  <p className="text-sm text-muted-foreground">
                    Play sounds for flips and answers
                  </p>
                </div>
                <Switch
                  checked={settings.soundEffects}
                  onCheckedChange={(checked) => updateSetting('soundEffects', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Daily Study Goal: {settings.dailyStudyGoal} cards</Label>
                <Slider
                  value={[settings.dailyStudyGoal]}
                  onValueChange={([value]) => updateSetting('dailyStudyGoal', value)}
                  min={5}
                  max={100}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Shortcuts & Controls */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                <CardTitle>Shortcuts & Controls</CardTitle>
              </div>
              <CardDescription>
                Customize keyboard shortcuts and input behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Flip Card</Label>
                  <Input
                    value={settings.keyboardShortcuts.flip}
                    onChange={(e) => updateSetting('keyboardShortcuts', {
                      ...settings.keyboardShortcuts,
                      flip: e.target.value
                    })}
                    placeholder="Space"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mark Correct</Label>
                  <Input
                    value={settings.keyboardShortcuts.correct}
                    onChange={(e) => updateSetting('keyboardShortcuts', {
                      ...settings.keyboardShortcuts,
                      correct: e.target.value
                    })}
                    placeholder="ArrowRight"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mark Wrong</Label>
                  <Input
                    value={settings.keyboardShortcuts.wrong}
                    onChange={(e) => updateSetting('keyboardShortcuts', {
                      ...settings.keyboardShortcuts,
                      wrong: e.target.value
                    })}
                    placeholder="ArrowLeft"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Swipe Sensitivity</Label>
                <Select
                  value={settings.swipeSensitivity}
                  onValueChange={(value: AppSettings['swipeSensitivity']) => 
                    updateSetting('swipeSensitivity', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Double-tap to Flip</Label>
                  <p className="text-sm text-muted-foreground">
                    Require double-tap instead of single tap
                  </p>
                </div>
                <Switch
                  checked={settings.doubleTapToFlip}
                  onCheckedChange={(checked) => updateSetting('doubleTapToFlip', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Smart Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <CardTitle>Smart Notifications</CardTitle>
              </div>
              <CardDescription>
                Manage reminders and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Daily Study Reminder</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded to study daily
                  </p>
                </div>
                <Switch
                  checked={settings.dailyReminderEnabled}
                  onCheckedChange={(checked) => updateSetting('dailyReminderEnabled', checked)}
                />
              </div>

              {settings.dailyReminderEnabled && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Reminder Time</Label>
                    <Input
                      type="time"
                      value={settings.dailyReminderTime}
                      onChange={(e) => updateSetting('dailyReminderTime', e.target.value)}
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Study Streak Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when about to lose streak
                  </p>
                </div>
                <Switch
                  checked={settings.streakAlerts}
                  onCheckedChange={(checked) => updateSetting('streakAlerts', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Progress Digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Weekly summary of your study progress
                  </p>
                </div>
                <Switch
                  checked={settings.weeklyDigest}
                  onCheckedChange={(checked) => updateSetting('weeklyDigest', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>P2P Sync Alerts</Label>
                <Select
                  value={settings.peerSyncAlerts}
                  onValueChange={(value: AppSettings['peerSyncAlerts']) => 
                    updateSetting('peerSyncAlerts', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="important">Important Only</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <CardTitle>Performance</CardTitle>
              </div>
              <CardDescription>
                Optimize app performance and storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Offline Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Work without P2P connections
                  </p>
                </div>
                <Switch
                  checked={settings.offlineMode}
                  onCheckedChange={(checked) => updateSetting('offlineMode', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Image Quality</Label>
                <Select
                  value={settings.imageQuality}
                  onValueChange={(value: AppSettings['imageQuality']) => 
                    updateSetting('imageQuality', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Preload Images</Label>
                  <p className="text-sm text-muted-foreground">
                    Load all images when opening bundle
                  </p>
                </div>
                <Switch
                  checked={settings.preloadImages}
                  onCheckedChange={(checked) => updateSetting('preloadImages', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Cache Limit: {settings.cacheLimit} MB</Label>
                <Slider
                  value={[settings.cacheLimit]}
                  onValueChange={([value]) => updateSetting('cacheLimit', value)}
                  min={50}
                  max={500}
                  step={10}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum storage for cached data
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Reset Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Reset Settings</CardTitle>
              <CardDescription>
                Restore all settings to their default values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
