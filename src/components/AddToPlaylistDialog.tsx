import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPlaylists, savePlaylist, updatePlaylist, Playlist } from '@/lib/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface AddToPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCardIds: string[];
}

const AddToPlaylistDialog = ({ open, onOpenChange, selectedCardIds }: AddToPlaylistDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);

  const userPlaylists = getPlaylists().filter(p => p.userId === user?.id);

  const handleAddToPlaylist = (playlistId: string) => {
    const playlist = getPlaylists().find(p => p.id === playlistId);
    if (playlist) {
      const updatedCardIds = [...new Set([...playlist.cardIds, ...selectedCardIds])];
      updatePlaylist(playlistId, { cardIds: updatedCardIds, updatedAt: new Date().toISOString() });
      toast({ title: `Added ${selectedCardIds.length} card(s) to playlist` });
      onOpenChange(false);
    }
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      toast({ title: "Please enter a playlist name", variant: "destructive" });
      return;
    }

    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      userId: user!.id,
      title: newPlaylistName,
      cardIds: selectedCardIds,
      isPublic: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    savePlaylist(newPlaylist);
    toast({ title: "Playlist created successfully" });
    setNewPlaylistName('');
    setShowNewPlaylist(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Playlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {userPlaylists.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Select Playlist</p>
              {userPlaylists.map(playlist => (
                <Button
                  key={playlist.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAddToPlaylist(playlist.id)}
                >
                  {playlist.title}
                </Button>
              ))}
            </div>
          )}

          {!showNewPlaylist ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowNewPlaylist(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Playlist
            </Button>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleCreatePlaylist} className="flex-1">Create</Button>
                <Button variant="outline" onClick={() => setShowNewPlaylist(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddToPlaylistDialog;
