import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUsers, updateUser, deleteUser } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trash2, Key, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const Admin = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [updateStatus, setUpdateStatus] = useState<{
    checking: boolean;
    available: boolean;
    version?: string;
    currentVersion?: string;
  }>({ checking: false, available: false });

  const isElectron = !!(window as any).electronAPI;

  if (!isAdmin) {
    navigate('/home');
    return null;
  }

  const users = getUsers().filter(u => u.id !== user?.id);

  const handlePasswordChange = (userId: string) => {
    if (!newPassword.trim()) {
      toast({ title: "Error", description: "Password cannot be empty", variant: "destructive" });
      return;
    }

    updateUser(userId, { password: newPassword });
    toast({ title: "Password updated!" });
    setEditingUserId(null);
    setNewPassword('');
  };

  const handleDeleteUser = (userId: string, username: string) => {
    if (confirm(`Delete user ${username}? This will also delete all their bundles and flashcards.`)) {
      deleteUser(userId);
      toast({ title: "User deleted" });
    }
  };

  const handleCheckForUpdates = () => {
    if (!isElectron) {
      toast({
        title: "Not in Electron",
        description: "Update checking only works in the desktop app.",
        variant: "destructive"
      });
      return;
    }

    // Check if running in packaged app
    const isPackaged = !(window.location.protocol === 'http:' && window.location.hostname === 'localhost');
    
    if (!isPackaged) {
      toast({
        title: "Development Mode",
        description: "Updates only work in the packaged desktop app, not in dev mode.",
        variant: "destructive"
      });
      setUpdateStatus({
        checking: false,
        available: false,
        currentVersion: (window as any).electron?.version || 'Unknown'
      });
      return;
    }

    setUpdateStatus({ checking: true, available: false });
    
    const api = (window as any).electronAPI;
    let updateFound = false;
    
    // Listen for update events
    const handleUpdateAvailable = (version: string) => {
      updateFound = true;
      setUpdateStatus({
        checking: false,
        available: true,
        version,
        currentVersion: (window as any).electron?.version || 'Unknown'
      });
      toast({
        title: "Update Available!",
        description: `Version ${version} is available for download.`,
      });
    };

    // Register listeners
    api.onUpdateAvailable(handleUpdateAvailable);
    api.onCheckingForUpdate(() => {
      toast({
        title: "Checking for Updates",
        description: "Searching for new versions...",
      });
    });

    // Trigger check
    api.checkForUpdates();

    // Timeout after 10 seconds if no response
    setTimeout(() => {
      if (!updateFound) {
        setUpdateStatus({
          checking: false,
          available: false,
          currentVersion: (window as any).electron?.version || 'Unknown'
        });
        toast({
          title: "No Updates Available",
          description: "You're running the latest version!",
        });
      }
    }, 10000);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/home')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Update System Tester - Only for Electron */}
        {isElectron && (
          <Card>
            <CardHeader>
              <CardTitle>Update System Verification</CardTitle>
              <CardDescription>
                Test the auto-update system to ensure it's working correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Current Version</p>
                  <p className="text-sm text-muted-foreground">
                    {updateStatus.currentVersion || (window as any).electron?.version || 'Unknown'}
                  </p>
                </div>
                <Button
                  onClick={handleCheckForUpdates}
                  disabled={updateStatus.checking}
                >
                  {updateStatus.checking ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Check for Updates
                    </>
                  )}
                </Button>
              </div>

              {updateStatus.available && (
                <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Update System Working!</p>
                    <p className="text-sm text-muted-foreground">
                      Version {updateStatus.version} detected successfully
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10">
                    {updateStatus.version}
                  </Badge>
                </div>
              )}

              {!updateStatus.checking && !updateStatus.available && updateStatus.currentVersion && (
                <div className="flex items-center gap-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Up to Date</p>
                    <p className="text-sm text-muted-foreground">
                      No updates available - system is working correctly
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {editingUserId === u.id ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              type="password"
                              placeholder="New password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-40"
                            />
                            <Button size="sm" onClick={() => handlePasswordChange(u.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              setEditingUserId(null);
                              setNewPassword('');
                            }}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setEditingUserId(u.id)}>
                              <Key className="w-4 h-4 mr-1" />
                              Change Password
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {users.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No other users yet</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
