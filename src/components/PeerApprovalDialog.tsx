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

interface PeerApprovalDialogProps {
  open: boolean;
  peerUsername: string;
  peerId: string;
  onApprove: () => void;
  onReject: () => void;
}

export const PeerApprovalDialog = ({
  open,
  peerUsername,
  peerId,
  onApprove,
  onReject,
}: PeerApprovalDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onReject()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Peer Connection Request</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              <strong>{peerUsername}</strong> wants to connect with you for P2P sync.
            </p>
            <p className="text-xs text-muted-foreground">Peer ID: {peerId}</p>
            <p className="mt-4">
              Once connected, you'll be able to share public bundles and playlists with each other.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onReject}>Reject</AlertDialogCancel>
          <AlertDialogAction onClick={onApprove}>Accept Connection</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
