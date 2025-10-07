import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Bundle, saveBundle, deleteBundle } from '@/lib/storage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface UnknownBundlesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unknownBundles: Bundle[];
  onComplete: () => void;
}

export const UnknownBundlesDialog = ({
  open,
  onOpenChange,
  unknownBundles,
  onComplete,
}: UnknownBundlesDialogProps) => {
  const handleAction = (bundleId: string, action: 'hide' | 'delete' | 'keep') => {
    const bundle = unknownBundles.find(b => b.id === bundleId);
    if (!bundle) return;

    switch (action) {
      case 'hide':
        saveBundle({ ...bundle, isHidden: true });
        break;
      case 'delete':
        deleteBundle(bundleId);
        break;
      case 'keep':
        // Just keep it as is
        break;
    }

    // Check if we processed all
    const remaining = unknownBundles.filter(b => b.id !== bundleId);
    if (remaining.length === 0) {
      onComplete();
    }

    // Trigger refresh
    window.dispatchEvent(new Event('storage'));
  };

  const handleHideAll = () => {
    unknownBundles.forEach(bundle => {
      saveBundle({ ...bundle, isHidden: true });
    });
    onComplete();
    window.dispatchEvent(new Event('storage'));
  };

  const handleDeleteAll = () => {
    unknownBundles.forEach(bundle => {
      deleteBundle(bundle.id);
    });
    onComplete();
    window.dispatchEvent(new Event('storage'));
  };

  const handleKeepAll = () => {
    onComplete();
  };

  if (unknownBundles.length === 0) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Unverified Bundles Detected</AlertDialogTitle>
          <AlertDialogDescription>
            {unknownBundles.length} bundle(s) from unknown or unverified sources were found. 
            These may be from disconnected peers or outdated syncs.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[400px] w-full rounded-md border p-4">
          <div className="space-y-4">
            {unknownBundles.map(bundle => (
              <div key={bundle.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{bundle.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Owner: {bundle.ownerId || 'Unknown'}
                    </p>
                    {bundle.originPeerId && (
                      <p className="text-xs text-muted-foreground">
                        Peer: {bundle.originPeerId}
                      </p>
                    )}
                  </div>
                  <Badge variant="destructive">Unverified</Badge>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <AlertDialogAction
                    onClick={() => handleAction(bundle.id, 'keep')}
                    className="bg-primary"
                  >
                    Keep
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => handleAction(bundle.id, 'hide')}
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  >
                    Hide
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => handleAction(bundle.id, 'delete')}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={handleKeepAll}>
            Keep All
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleHideAll} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
            Hide All
          </AlertDialogAction>
          <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
