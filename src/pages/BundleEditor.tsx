import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getBundles, saveBundle, updateBundle, deleteBundle, getFlashcards, Bundle } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BundleEditor = () => {
  const { bundleId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [label, setLabel] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (bundleId && bundleId !== 'new') {
      const bundles = getBundles();
      const bundle = bundles.find(b => b.id === bundleId);
      
      if (bundle) {
        if (bundle.userId !== user?.id) {
          toast({
            title: "Access denied",
            description: "You can only edit your own bundles",
            variant: "destructive",
          });
          navigate('/home');
          return;
        }
        
        setTitle(bundle.title);
        setLabel(bundle.label || '');
        setThumbnail(bundle.thumbnail || '');
        setIsPublic(bundle.isPublic);
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
        createdAt: new Date().toISOString(),
      };
      saveBundle(newBundle);
      toast({
        title: "Bundle created!",
        description: "Now add some flashcards",
      });
      navigate(`/bundle/${newBundle.id}/cards`);
    } else {
      updateBundle(bundleId!, {
        title,
        label: label || undefined,
        thumbnail: thumbnail || undefined,
        isPublic,
      });
      toast({
        title: "Bundle updated!",
      });
      navigate(`/bundle/${bundleId}/cards`);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this bundle and all its flashcards?')) {
      deleteBundle(bundleId!);
      toast({
        title: "Bundle deleted",
      });
      navigate('/home');
    }
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnail(reader.result as string);
      };
      reader.readAsDataURL(file);
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
              <Input
                id="label"
                placeholder="e.g., Carpentry, Math, History"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
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

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1">
                {bundleId === 'new' ? 'Create & Add Cards' : 'Save Changes'}
              </Button>
              {bundleId !== 'new' && (
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
