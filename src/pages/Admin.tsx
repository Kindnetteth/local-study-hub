import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUsers, updateUser, deleteUser } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trash2, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

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

      <main className="container mx-auto px-4 py-8">
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
