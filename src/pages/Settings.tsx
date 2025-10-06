import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings, resetSettings, applySettingsToDOM, AppSettings } from '@/lib/settings';
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
import { ColorPicker } from '@/components/ColorPicker';
import { KeybindInput } from '@/components/KeybindInput';

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [previewText, setPreviewText] = useState('This is how your text will look');
  const isElectron = !!(window as any).electron?.isElectron;

  useEffect(() => {
    // Apply settings on mount and ensure they're in sync with what's saved
    const currentSettings = getSettings();
    setSettings(currentSettings);
    
    // Re-apply settings to DOM to ensure consistency
    applySettingsToDOM(currentSettings);
  }, []);
  
  // Also reapply when leaving the page to ensure persistence
  useEffect(() => {
    return () => {
      const finalSettings = getSettings();
      applySettingsToDOM(finalSettings);
    };
  }, []);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    // Validate keyboard shortcuts for duplicates
    if (key === 'keyboardShortcuts') {
      const shortcuts = value as AppSettings['keyboardShortcuts'];
      const values = Object.values(shortcuts);
      const duplicates = values.filter((v, i) => values.indexOf(v) !== i);
      
      if (duplicates.length > 0) {
        toast({
          title: 'Duplicate Shortcut',
          description: 'This key is already assigned to another action.',
          variant: 'destructive',
        });
        return;
      }
    }
    
    // Validate cache limit
    if (key === 'cacheLimit' && typeof value === 'number') {
      if (value < 10 || value > 1000) {
        toast({
          title: 'Invalid Cache Limit',
          description: 'Cache limit must be between 10 and 1000 MB.',
          variant: 'destructive',
        });
        return;
      }
    }
    
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings({ [key]: value });
    
    toast({
      title: 'Settings Updated',
      description: 'Your preferences have been saved.',
    });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings(); // This now handles everything including DOM updates
      const defaultSettings = getSettings();
      setSettings(defaultSettings);
      toast({
        title: 'Settings Reset',
        description: 'All settings have been reset to defaults.',
      });
      
      // Force page reload to ensure clean slate
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Settings</h1>
          <div className="ml-auto">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Visual & UI */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                <CardTitle>Visual & UI</CardTitle>
              </div>
              <CardDescription>Customize the appearance of your app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select
                  value={settings.theme}
                  onValueChange={(value: AppSettings['theme']) => updateSetting('theme', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <ColorPicker
                label="Primary Color"
                color={settings.customPrimaryColor}
                onChange={(color) => updateSetting('customPrimaryColor', color)}
              />

              <Separator />

              <div className="space-y-4">
                <Label>Custom Background</Label>
                <Select
                  value={settings.customBackgroundType}
                  onValueChange={(value: AppSettings['customBackgroundType']) => 
                    updateSetting('customBackgroundType', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Default)</SelectItem>
                    <SelectItem value="solid">Solid Color</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                  </SelectContent>
                </Select>

                {settings.customBackgroundType === 'solid' && (
                  <>
                    <ColorPicker
                      label="Background Color"
                      color={settings.customBackgroundColor}
                      onChange={(color) => updateSetting('customBackgroundColor', color)}
                    />
                    <div 
                      className="h-24 rounded-lg border-2 border-border"
                      style={{ backgroundColor: settings.customBackgroundColor }}
                    >
                      <div className="h-full flex items-center justify-center text-sm text-foreground/80">
                        Background Preview
                      </div>
                    </div>
                  </>
                )}

                {settings.customBackgroundType === 'gradient' && (
                  <div className="space-y-2">
                    <Label>Gradient Colors</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <ColorPicker
                        label="Start"
                        color={settings.customBackgroundGradient.start}
                        onChange={(color) => updateSetting('customBackgroundGradient', {
                          ...settings.customBackgroundGradient,
                          start: color
                        })}
                      />
                      <ColorPicker
                        label="End"
                        color={settings.customBackgroundGradient.end}
                        onChange={(color) => updateSetting('customBackgroundGradient', {
                          ...settings.customBackgroundGradient,
                          end: color
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Angle: {settings.customBackgroundGradient.angle}°</Label>
                      <Slider
                        value={[settings.customBackgroundGradient.angle]}
                        onValueChange={([value]) => updateSetting('customBackgroundGradient', {
                          ...settings.customBackgroundGradient,
                          angle: value
                        })}
                        min={0}
                        max={360}
                        step={15}
                      />
                    </div>
                    <div 
                      className="h-24 rounded-lg border-2 border-border"
                      style={{ 
                        background: `linear-gradient(${settings.customBackgroundGradient.angle}deg, ${settings.customBackgroundGradient.start}, ${settings.customBackgroundGradient.end})` 
                      }}
                    >
                      <div className="h-full flex items-center justify-center text-sm text-white/90 font-medium drop-shadow">
                        Gradient Preview
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Card Opacity: {settings.cardOpacity}%</Label>
                <Slider
                  value={[settings.cardOpacity]}
                  onValueChange={([value]) => updateSetting('cardOpacity', value)}
                  min={50}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Gloss Level: {settings.glossLevel}%</Label>
                <Slider
                  value={[settings.glossLevel]}
                  onValueChange={([value]) => updateSetting('glossLevel', value)}
                  min={0}
                  max={100}
                  step={10}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Font Size</Label>
                <Select
                  value={settings.fontSize}
                  onValueChange={(value: AppSettings['fontSize']) => updateSetting('fontSize', value)}
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
                <div className="p-4 bg-muted rounded-lg">
                  <p 
                    style={{ 
                      fontSize: settings.fontSize === 'small' ? '14px' : settings.fontSize === 'large' ? '18px' : '16px'
                    }}
                  >
                    {previewText}
                  </p>
                </div>
              </div>

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
              <CardDescription>Customize your study sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-advance Cards</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically flip cards after a delay
                  </p>
                </div>
                <Switch
                  checked={settings.autoAdvanceCards}
                  onCheckedChange={(checked) => updateSetting('autoAdvanceCards', checked)}
                />
              </div>

              {settings.autoAdvanceCards && (
                <div className="space-y-2">
                  <Label>Auto-advance Delay: {settings.autoAdvanceDelay}s</Label>
                  <Slider
                    value={[settings.autoAdvanceDelay]}
                    onValueChange={([value]) => updateSetting('autoAdvanceDelay', value)}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>
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

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Study Timer</Label>
                  <p className="text-sm text-muted-foreground">
                    Display session timer during study
                  </p>
                </div>
                <Switch
                  checked={settings.showStudyTimer}
                  onCheckedChange={(checked) => updateSetting('showStudyTimer', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sound Effects</Label>
                  <p className="text-sm text-muted-foreground">
                    Play sounds for flip, correct, and wrong
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
              <CardDescription>Customize keyboard shortcuts and controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <KeybindInput
                  label="Flip Card"
                  value={settings.keyboardShortcuts.flip}
                  onChange={(key) => updateSetting('keyboardShortcuts', {
                    ...settings.keyboardShortcuts,
                    flip: key
                  })}
                />
                <KeybindInput
                  label="Mark Correct"
                  value={settings.keyboardShortcuts.correct}
                  onChange={(key) => updateSetting('keyboardShortcuts', {
                    ...settings.keyboardShortcuts,
                    correct: key
                  })}
                />
                <KeybindInput
                  label="Mark Wrong"
                  value={settings.keyboardShortcuts.wrong}
                  onChange={(key) => updateSetting('keyboardShortcuts', {
                    ...settings.keyboardShortcuts,
                    wrong: key
                  })}
                />
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
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Daily Reminder</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded to study every day
                  </p>
                </div>
                <Switch
                  checked={settings.dailyReminderEnabled}
                  onCheckedChange={(checked) => updateSetting('dailyReminderEnabled', checked)}
                />
              </div>

              {settings.dailyReminderEnabled && (
                <div className="space-y-2">
                  <Label>Reminder Time</Label>
                  <Input
                    type="time"
                    value={settings.dailyReminderTime}
                    onChange={(e) => updateSetting('dailyReminderTime', e.target.value)}
                  />
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Streak Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when about to lose streak
                  </p>
                </div>
                <Switch
                  checked={settings.streakAlerts}
                  onCheckedChange={(checked) => updateSetting('streakAlerts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Progress Digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive weekly summary of your progress
                  </p>
                </div>
                <Switch
                  checked={settings.weeklyDigest}
                  onCheckedChange={(checked) => updateSetting('weeklyDigest', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Peer Sync Alerts</Label>
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
                    <SelectItem value="all">All</SelectItem>
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
              <CardDescription>Optimize app performance and storage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Offline Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Work without P2P (saves battery)
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

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Preload Images</Label>
                  <p className="text-sm text-muted-foreground">
                    Load all images when bundle opens
                  </p>
                </div>
                <Switch
                  checked={settings.preloadImages}
                  onCheckedChange={(checked) => updateSetting('preloadImages', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Cache Limit: {settings.cacheLimit} MB</Label>
                <Slider
                  value={[settings.cacheLimit]}
                  onValueChange={([value]) => updateSetting('cacheLimit', value)}
                  min={50}
                  max={500}
                  step={50}
                />
              </div>
            </CardContent>
          </Card>

          {/* P2P Sync Settings */}
          <Card>
            <CardHeader>
              <CardTitle>P2P Sync Settings</CardTitle>
              <CardDescription>
                Configure how your data syncs with connected peers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
              </div>

              {settings.syncFrequency === 'interval' && (
                <div className="space-y-2">
                  <Label>Sync Interval: {settings.syncIntervalMinutes} minutes</Label>
                  <Slider
                    value={[settings.syncIntervalMinutes]}
                    onValueChange={([value]) => updateSetting('syncIntervalMinutes', value)}
                    min={1}
                    max={60}
                    step={1}
                  />
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show sync notifications
                  </p>
                </div>
                <Switch
                  checked={settings.notificationsEnabled}
                  onCheckedChange={(checked) => updateSetting('notificationsEnabled', checked)}
                />
              </div>

              {isElectron && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Desktop Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Show system notifications
                      </p>
                    </div>
                    <Switch
                      checked={settings.desktopNotifications}
                      onCheckedChange={(checked) => updateSetting('desktopNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Run in Background</Label>
                      <p className="text-sm text-muted-foreground">
                        Keep syncing when window is closed
                      </p>
                    </div>
                    <Switch
                      checked={settings.runInBackground}
                      onCheckedChange={(checked) => updateSetting('runInBackground', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Launch on Startup</Label>
                      <p className="text-sm text-muted-foreground">
                        Start app when system boots
                      </p>
                    </div>
                    <Switch
                      checked={settings.launchOnStartup}
                      onCheckedChange={(checked) => updateSetting('launchOnStartup', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-check Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically check for new versions
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoCheckUpdates}
                      onCheckedChange={(checked) => updateSetting('autoCheckUpdates', checked)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
