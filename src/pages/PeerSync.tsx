import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeer } from '@/contexts/PeerContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUsers } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Users, RefreshCw, Wifi, WifiOff, ArrowLeft, UserCheck, Loader2, XCircle, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const PeerSync = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isInitialized, myPeerId, knownPeers, connectToPeer, disconnectFromPeer, syncData, removePeer } = usePeer();
  const [peerIdInput, setPeerIdInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  const users = getUsers();
  const connectedCount = knownPeers.filter(p => p.status === 'connected').length;

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
  
  // Get username from peer ID
  const getPeerUsername = (peerId: string) => {
    const peer = knownPeers.find(p => p.peerId === peerId);
    if (peer?.username) return peer.username;
    
    const peerUser = users.find(u => u.peerId === peerId);
    return peerUser?.username || 'Unknown Peer';
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500"><Wifi className="h-3 w-3 mr-1" />Connected</Badge>;
      case 'connecting':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Connecting</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Peer-to-Peer Sync</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Connection Status</span>
                <Badge variant={isInitialized ? 'default' : 'secondary'} className="ml-2">
                  {isInitialized ? '● Online' : '○ Initializing...'}
                </Badge>
              </CardTitle>
              <CardDescription>
                Your P2P connection is {isInitialized ? 'active' : 'initializing'}. You can share your Peer ID with others to sync data directly.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* My Peer ID Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Peer ID</CardTitle>
              <CardDescription>
                Share this unique ID with others to allow them to connect to you. This ID is permanent and won't change.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={myPeerId || 'Generating...'}
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
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Tip:</strong> Keep this ID safe! Anyone with this ID can request to connect to you. 
                  You can share it via email, messaging apps, or any other secure channel.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Connect to Peer Card */}
          <Card>
            <CardHeader>
              <CardTitle>Connect to a Peer</CardTitle>
              <CardDescription>
                Enter another user's Peer ID to establish a connection and start syncing data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Paste peer ID here..."
                  value={peerIdInput}
                  onChange={(e) => setPeerIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                  disabled={!isInitialized || isConnecting}
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleConnect}
                  disabled={!isInitialized || !peerIdInput.trim() || isConnecting}
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Known Peers Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Known Peers</CardTitle>
                  <CardDescription>
                    {knownPeers.length > 0 
                      ? `${connectedCount} of ${knownPeers.length} peer${knownPeers.length > 1 ? 's' : ''} connected`
                      : 'No peers yet'}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={syncData}
                  disabled={connectedCount === 0}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {knownPeers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <WifiOff className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">No peers yet</p>
                  <p className="text-sm">Connect to other users to start syncing your flashcard bundles</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {knownPeers.map((peer) => {
                    const username = getPeerUsername(peer.peerId);
                    return (
                      <div
                        key={peer.peerId}
                        className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserCheck className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{username}</span>
                              {getStatusBadge(peer.status)}
                            </div>
                            <span className="font-mono text-xs text-muted-foreground truncate block">
                              {peer.peerId}
                            </span>
                            {peer.lastConnected && (
                              <span className="text-xs text-muted-foreground">
                                Last: {new Date(peer.lastConnected).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {peer.status === 'connected' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => disconnectFromPeer(peer.peerId)}
                            >
                              Disconnect
                            </Button>
                          ) : peer.status === 'disconnected' || peer.status === 'error' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => connectToPeer(peer.peerId)}
                            >
                              Reconnect
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removePeer(peer.peerId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">How P2P Sync Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <div className="text-2xl">🔐</div>
                <div>
                  <strong className="text-foreground">Secure & Private:</strong> All data is synced directly between devices without going through our servers. Only public content is shared.
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">👁️</div>
                <div>
                  <strong className="text-foreground">Privacy Control:</strong> Only public bundles and playlists are synced. Private items remain on your device only.
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">🔄</div>
                <div>
                  <strong className="text-foreground">Smart Sync:</strong> Only changed items are synced. Your data won't be overwritten - newer versions are kept.
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">↔️</div>
                <div>
                  <strong className="text-foreground">Bidirectional:</strong> Data is exchanged both ways automatically when peers connect.
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
};
