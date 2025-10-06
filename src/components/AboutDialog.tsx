import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, Github, Heart } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const isElectron = !!(window as any).electron?.isElectron;
  const appVersion = isElectron ? (window as any).electron?.version || '1.0.0' : '1.0.0';
  const electronVersion = isElectron ? (window as any).electron?.version : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-2xl">FlashLearn</DialogTitle>
              <DialogDescription>Version {appVersion}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            FlashLearn lets you make flashcards, share them with friends, and study together. 
            Simple, fun, and collaborative!
          </p>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Author:</span>
              <span className="font-medium">Kind</span>
            </div>
            {isElectron && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform:</span>
                <span className="font-medium">{(window as any).electron?.platform || 'Desktop'}</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => window.open('https://github.com/Kindnetteth/local-study-hub', '_blank')}
            >
              <Github className="w-4 h-4 mr-2" />
              ⭐ Star on GitHub
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => window.open('mailto:OvrKind@gmail.com', '_blank')}
            >
              <Heart className="w-4 h-4 mr-2" />
              Support & Feedback
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            Made with ❤️ for students everywhere
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
