import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePeer } from '@/contexts/PeerContext';
import { getBundles, saveBundle, updateBundle, deleteBundle, getFlashcards, Bundle, getUsers } from '@/lib/storage';
import { handleImageInputChange } from '@/lib/imageUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BundleEditor = () => {
  const { bundleId } = useParams();
  const { user } = useAuth();
  const { broadcastUpdate, broadcastDelete } = usePeer();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [label, setLabel] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [existingLabels, setExistingLabels] = useState<string[]>([]);
  const [isCreatingNewLabel, setIsCreatingNewLabel] = useState(false);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [selectedCollaborator, setSelectedCollaborator] = useState('');

  useEffect(() => {
    // Get all unique labels from existing bundles
    const bundles = getBundles();
    const labels = [...new Set(bundles.map(b => b.label).filter(Boolean))] as string[];
    setExistingLabels(labels);
  }, []);

  useEffect(() => {
    if (bundleId && bundleId !== 'new') {
      const bundles = getBundles();
      const bundle = bundles.find(b => b.id === bundleId);
      
      if (bundle) {
        // Check if user is owner or collaborator
        const canEdit = bundle.userId === user?.id || bundle.collaborators?.includes(user?.id || '');
        if (!canEdit) {
          toast({
            title: "Access denied",
            description: "You don't have permission to edit this bundle",
            variant: "destructive",
          });
          navigate('/home');
          return;
        }
        
        setTitle(bundle.title);
        setLabel(bundle.label || '');
        setThumbnail(bundle.thumbnail || '');
        setIsPublic(bundle.isPublic);
        setCollaborators(bundle.collaborators || []);
      }
    }
  }, [bundleId, user, navigate, toast]);

  const handleSave = () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    if (bundleId === 'new') {
      const newBundle: Bundle = {
        id: `bundle_${Date.now()}`,
        userId: user!.id,
        title,
        label: label || undefined,
        thumbnail: thumbnail || undefined,
        isPublic,
        collaborators: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveBundle(newBundle);
      
      // Broadcast to connected peers if public
      if (isPublic) {
        broadcastUpdate('bundle', newBundle);
      }
      
      toast({
        title: "Bundle created!",
        description: "Now add some flashcards",
      });
      navigate(`/bundle/${newBundle.id}/cards`);
    } else {
      const updatedBundle = getBundles().find(b => b.id === bundleId);
      if (updatedBundle) {
        const newBundleData = {
          ...updatedBundle,
          title,
          label: label || undefined,
          thumbnail: thumbnail || undefined,
          isPublic,
          collaborators,
          updatedAt: new Date().toISOString(),
        };
        updateBundle(bundleId!, {
          title,
          label: label || undefined,
          thumbnail: thumbnail || undefined,
          isPublic,
          collaborators,
          updatedAt: new Date().toISOString(),
        });
        
        // Always broadcast updates (handles both public and private state changes)
        broadcastUpdate('bundle', newBundleData);
      }
      
      toast({
        title: "Bundle updated!",
      });
      navigate(`/bundle/${bundleId}/cards`);
    }
  };

  const addCollaborator = () => {
    if (!selectedCollaborator) return;
    if (collaborators.includes(selectedCollaborator)) {
      toast({ title: "User is already a collaborator", variant: "destructive" });
      return;
    }
    setCollaborators([...collaborators, selectedCollaborator]);
    setSelectedCollaborator('');
    toast({ title: "Collaborator added" });
  };

  const removeCollaborator = (userId: string) => {
    setCollaborators(collaborators.filter(id => id !== userId));
    toast({ title: "Collaborator removed" });
  };

  const handleDelete = () => {
    const bundle = getBundles().find(b => b.id === bundleId);
    if (bundle?.userId !== user?.id) {
      toast({ title: "Only the creator can delete this bundle", variant: "destructive" });
      return;
    }
    
    if (confirm('Are you sure you want to delete this bundle and all its flashcards?')) {
      // Broadcast deletion to peers before deleting
      if (bundle?.isPublic) {
        broadcastDelete('bundle', bundleId!);
      }
      
      deleteBundle(bundleId!);
      toast({
        title: "Bundle deleted",
      });
      navigate('/home');
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      await handleImageInputChange(e, (dataUrl) => {
        setThumbnail(dataUrl);
        toast({ title: "Thumbnail uploaded successfully!" });
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/home')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {bundleId === 'new' ? 'Create Bundle' : 'Edit Bundle'}
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Bundle Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Carpentry Level 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Label/Tag</Label>
              {existingLabels.length > 0 && !isCreatingNewLabel ? (
                <div className="space-y-2">
                  <Select value={label} onValueChange={(value) => {
                    if (value === '__create_new__') {
                      setIsCreatingNewLabel(true);
                      setLabel('');
                    } else {
                      setLabel(value);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select or create label" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingLabels.map((existingLabel) => (
                        <SelectItem key={existingLabel} value={existingLabel}>
                          {existingLabel}
                        </SelectItem>
                      ))}
                      <SelectItem value="__create_new__">
                        <Plus className="w-4 h-4 inline mr-2" />
                        Create new label
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {label && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreatingNewLabel(true);
                        setLabel('');
                      }}
                    >
                      Or create new label
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    id="label"
                    placeholder="e.g., Carpentry, Math, History"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                  {existingLabels.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCreatingNewLabel(false)}
                    >
                      Or select existing label
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail">Thumbnail</Label>
              <Input
                id="thumbnail"
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
              />
              {thumbnail && (
                <img src={thumbnail} alt="Thumbnail preview" className="w-full h-40 object-cover rounded-lg mt-2" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="public">Make Public</Label>
                <p className="text-sm text-muted-foreground">Other users can view and study this bundle</p>
              </div>
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            {bundleId !== 'new' && (
              <div className="space-y-2">
                <Label>Collaborators</Label>
                <p className="text-sm text-muted-foreground">Users who can edit this bundle</p>
                <div className="flex gap-2">
                  <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {getUsers()
                        .filter(u => u.id !== user?.id && !collaborators.includes(u.id))
                        .map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.username}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={addCollaborator} disabled={!selectedCollaborator}>
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
                {collaborators.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {collaborators.map(userId => {
                      const collaboratorUser = getUsers().find(u => u.id === userId);
                      return (
                        <div key={userId} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span>{collaboratorUser?.username || 'Unknown'}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCollaborator(userId)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={() => navigate('/home')} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1">
                {bundleId === 'new' ? 'Create & Add Cards' : 'Save & Continue'}
              </Button>
              {bundleId !== 'new' && getBundles().find(b => b.id === bundleId)?.userId === user?.id && (
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BundleEditor;
