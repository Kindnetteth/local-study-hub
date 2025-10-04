import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

export function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<{
    available: boolean;
    downloaded: boolean;
    version?: string;
    progress?: number;
  }>({ available: false, downloaded: false });

  useEffect(() => {
    // Only run in Electron environment
    if (!(window as any).electronAPI) return;

    const api = (window as any).electronAPI;

    api.onUpdateAvailable((version: string) => {
      setUpdateInfo({ available: true, downloaded: false, version });
    });

    api.onUpdateDownloaded(() => {
      setUpdateInfo(prev => ({ ...prev, downloaded: true }));
    });

    api.onDownloadProgress((progress: number) => {
      setUpdateInfo(prev => ({ ...prev, progress }));
    });

    // Check for updates on mount
    api.checkForUpdates();
  }, []);

  if (!updateInfo.available) return null;

  const handleInstall = () => {
    (window as any).electronAPI?.installUpdate();
  };

  return (
    <Alert className="fixed bottom-4 right-4 w-96 shadow-lg border-primary/20 bg-card">
      <Download className="h-4 w-4" />
      <AlertTitle>
        {updateInfo.downloaded ? "Update Ready" : "Update Available"}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-sm">
          {updateInfo.downloaded
            ? `Version ${updateInfo.version} has been downloaded and is ready to install.`
            : `Version ${updateInfo.version} is being downloaded...`}
        </p>
        {updateInfo.progress !== undefined && !updateInfo.downloaded && (
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${updateInfo.progress}%` }}
            />
          </div>
        )}
        {updateInfo.downloaded && (
          <Button
            onClick={handleInstall}
            size="sm"
            className="w-full"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Restart and Install
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
