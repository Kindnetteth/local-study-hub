import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePeer } from '@/contexts/PeerContext';
import { getPlaylists, savePlaylist, updatePlaylist, deletePlaylist, getFlashcards, getBundles, Playlist } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const PlaylistEditor = () => {
  const { playlistId } = useParams();
  const { user } = useAuth();
  const { broadcastUpdate } = usePeer();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [availableFlashcards, setAvailableFlashcards] = useState<any[]>([]);
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Load all flashcards with bundle info
    const flashcards = getFlashcards();
    const bundles = getBundles();
    const cardsWithBundles = flashcards.map(card => {
      const bundle = bundles.find(b => b.id === card.bundleId);
      return { ...card, bundleTitle: bundle?.title || 'Unknown' };
    });
    setAvailableFlashcards(cardsWithBundles);

    if (playlistId && playlistId !== 'new') {
      const playlist = getPlaylists().find(p => p.id === playlistId);
      if (playlist) {
        if (playlist.userId !== user.id) {
          toast({ title: "Unauthorized", variant: "destructive" });
          navigate('/home');
          return;
        }
        setTitle(playlist.title);
        setSelectedCards(playlist.cardIds);
        setIsPublic(playlist.isPublic);
      }
    }
  }, [playlistId, user, navigate, toast]);

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: "Please enter a title", variant: "destructive" });
      return;
    }

    if (selectedCards.length === 0) {
      toast({ title: "Please select at least one card", variant: "destructive" });
      return;
    }

    if (playlistId === 'new') {
      const newPlaylist: Playlist = {
        id: Date.now().toString(),
        userId: user!.id,
        title,
        cardIds: selectedCards,
        isPublic,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      savePlaylist(newPlaylist);
      
      // Broadcast to connected peers if public
      if (isPublic) {
        broadcastUpdate('playlist', newPlaylist);
      }
      
      toast({ title: "Playlist created successfully" });
    } else {
      const updatedPlaylist = getPlaylists().find(p => p.id === playlistId);
      if (updatedPlaylist) {
        const newPlaylistData = {
          ...updatedPlaylist,
          title,
          cardIds: selectedCards,
          isPublic,
          updatedAt: new Date().toISOString(),
        };
        updatePlaylist(playlistId!, { title, cardIds: selectedCards, isPublic, updatedAt: new Date().toISOString() });
        
        // Always broadcast updates (handles both public and private state changes)
        broadcastUpdate('playlist', newPlaylistData);
      }
      
      toast({ title: "Playlist updated successfully" });
    }
    navigate('/home');
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this playlist?')) {
      deletePlaylist(playlistId!);
      toast({ title: "Playlist deleted" });
      navigate('/home');
    }
  };

  const toggleCard = (cardId: string) => {
    setSelectedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/home')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>{playlistId === 'new' ? 'Create Playlist' : 'Edit Playlist'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Playlist Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter playlist title"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Select Cards</label>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableFlashcards.map(card => (
                  <Card 
                    key={card.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedCards.includes(card.id) ? 'bg-primary/20 border-primary' : ''
                    }`}
                    onClick={() => toggleCard(card.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">{card.bundleTitle}</p>
                        <p className="font-medium">{card.questionText || 'Image question'}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedCards.includes(card.id)}
                        onChange={() => toggleCard(card.id)}
                        className="mt-1"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="public">Make Public</Label>
                <p className="text-sm text-muted-foreground">Other users can view and study this playlist</p>
              </div>
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} className="flex-1">
                {playlistId === 'new' ? 'Create Playlist' : 'Save Changes'}
              </Button>
              {playlistId !== 'new' && (
                <Button onClick={handleDelete} variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PlaylistEditor;
