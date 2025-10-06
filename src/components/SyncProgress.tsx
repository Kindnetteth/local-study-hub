import { usePeer } from '@/contexts/PeerContext';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi } from 'lucide-react';

export const SyncProgress = () => {
  const { knownPeers, isInitialized } = usePeer();
  
  const connectedPeers = knownPeers.filter(p => p.status === 'connected');
  const syncingPeers = knownPeers.filter(p => (p as any).syncStatus === 'syncing');
  
  if (!isInitialized || connectedPeers.length === 0) {
    return null;
  }
  
  if (syncingPeers.length > 0) {
    return (
      <Badge variant="outline" className="gap-2 animate-pulse">
        <Loader2 className="h-3 w-3 animate-spin" />
        Syncing with {syncingPeers.length} peer{syncingPeers.length > 1 ? 's' : ''}
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="gap-2">
      <Wifi className="h-3 w-3 text-green-500" />
      {connectedPeers.length} peer{connectedPeers.length > 1 ? 's' : ''} connected
    </Badge>
  );
};
