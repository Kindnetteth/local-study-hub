import { useState } from 'react';
import { usePeer } from '@/contexts/PeerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Users, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const PeerConnection = () => {
  const { isInitialized, myPeerId, knownPeers, connectToPeer, disconnectFromPeer, syncData } = usePeer();
  const [peerIdInput, setPeerIdInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  const connectedPeers = knownPeers.filter(p => p.status === 'connected');

  const handleCopyPeerId = () => {
    if (myPeerId) {
      navigator.clipboard.writeText(myPeerId);
      toast({
        title: 'Copied!',
        description: 'Your Peer ID has been copied to clipboard',
      });
    }
  };

  const handleConnect = async () => {
    if (!peerIdInput.trim()) return;
    
    setIsConnecting(true);
    try {
      await connectToPeer(peerIdInput.trim());
      setPeerIdInput('');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          P2P Sync
        </CardTitle>
        <CardDescription>
          Connect with other users to sync your flashcard decks directly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* My Peer ID */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Peer ID</label>
          <div className="flex gap-2">
            <Input
              value={myPeerId || 'Initializing...'}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={handleCopyPeerId}
              disabled={!myPeerId}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this ID with others to let them connect to you
          </p>
        </div>

        {/* Connect to Peer */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Connect to Peer</label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter peer ID..."
              value={peerIdInput}
              onChange={(e) => setPeerIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              disabled={!isInitialized || isConnecting}
            />
            <Button
              onClick={handleConnect}
              disabled={!isInitialized || !peerIdInput.trim() || isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        </div>

        {/* Connected Peers */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Connected Peers</label>
            <Button
              size="sm"
              variant="outline"
              onClick={syncData}
              disabled={connectedPeers.length === 0}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </Button>
          </div>
          
          {connectedPeers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <WifiOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No peers connected</p>
            </div>
          ) : (
            <div className="space-y-2">
              {connectedPeers.map((peer) => (
                <div
                  key={peer.peerId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="font-mono text-sm truncate">{peer.peerId}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => disconnectFromPeer(peer.peerId)}
                  >
                    Disconnect
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex justify-center pt-2">
          <Badge variant={isInitialized ? 'default' : 'secondary'}>
            {isInitialized ? '● Connected to P2P Network' : '○ Initializing...'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
