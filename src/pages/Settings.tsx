import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings, resetSettings, AppSettings } from '@/lib/settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, RotateCcw } from 'lucide-react';
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
