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

interface SameNameDialogProps {
  open: boolean;
  username: string;
  onSameDevice: () => void;
  onDifferentPeer: () => void;
}

export const SameNameDialog = ({
  open,
  username,
  onSameDevice,
  onDifferentPeer,
}: SameNameDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Same Username Detected</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              A peer with the username <strong>{username}</strong> is trying to connect.
            </p>
            <p className="mt-4">
              Are you connecting from another device with the same account?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onDifferentPeer}>
            No, Different Person
          </AlertDialogCancel>
          <AlertDialogAction onClick={onSameDevice}>
            Yes, It's Me (Merge Devices)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
