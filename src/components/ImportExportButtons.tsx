import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, Sparkles } from 'lucide-react';
import { exportBundles, importBundles, downloadZip, ImportConflictResolution } from '@/lib/exportImport';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
import { AIFormatDialog } from './AIFormatDialog';
import { Bundle } from '@/lib/storage';

interface ImportExportButtonsProps {
  selectedBundleIds?: string[];
  className?: string;
}

export const ImportExportButtons = ({ selectedBundleIds = [], className }: ImportExportButtonsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictBundle, setConflictBundle] = useState<Bundle | null>(null);
  const [conflictResolver, setConflictResolver] = useState<((resolution: ImportConflictResolution) => void) | null>(null);
  const [showAIDialog, setShowAIDialog] = useState(false);

  const handleExport = async () => {
    if (selectedBundleIds.length === 0) {
      toast({
        title: 'No bundles selected',
        description: 'Select at least one bundle to export',
        variant: 'destructive',
      });
      return;
    }

    try {
      const zipBlob = await exportBundles(selectedBundleIds);
      const filename = selectedBundleIds.length === 1
        ? 'flashcard_bundle.zip'
        : `flashcard_bundles_${Date.now()}.zip`;
      downloadZip(zipBlob, filename);
      toast({ title: 'Export successful!', description: `${selectedBundleIds.length} bundle(s) exported` });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const isZip = file.name.endsWith('.zip');
    const isJson = file.name.endsWith('.json');

    if (!isZip && !isJson) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a .zip or .json file',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await importBundles(file, {
        userId: user.id,
        onConflict: (bundle) => {
          return new Promise((resolve) => {
            setConflictBundle(bundle);
            setConflictResolver(() => resolve);
            setShowConflictDialog(true);
          });
        },
      });

      if (result.errors.length > 0) {
        toast({
          title: 'Import completed with errors',
          description: result.errors.join(', '),
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Import successful!',
          description: `Imported: ${result.imported}, Skipped: ${result.skipped}`,
        });
      }

      // Trigger refresh
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }

    // Reset file input
    event.target.value = '';
  };

  const handleConflictResolution = (resolution: ImportConflictResolution) => {
    if (conflictResolver) {
      conflictResolver(resolution);
      setConflictResolver(null);
    }
    setShowConflictDialog(false);
    setConflictBundle(null);
  };

  return (
    <>
      <div className={className}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,.json"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button onClick={handleImport} variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import
        </Button>
        {selectedBundleIds.length > 0 && (
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export ({selectedBundleIds.length})
          </Button>
        )}
        <Button onClick={() => setShowAIDialog(true)} className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Format
        </Button>
      </div>

      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bundle Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              A bundle named "{conflictBundle?.title}" already exists. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => handleConflictResolution('skip')}>
              Skip This Bundle
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConflictResolution('keep-both')}>
              Keep Both (Rename)
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleConflictResolution('replace')}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Replace Existing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AIFormatDialog open={showAIDialog} onOpenChange={setShowAIDialog} />
    </>
  );
};
