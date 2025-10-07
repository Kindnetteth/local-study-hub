import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getBundles, getFlashcards, getUserStats, getUsers, getPlaylists, getBundleProgress, saveBundle, saveFlashcard, deleteBundle } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Plus, Search, User, Shield, LogOut, List, Wifi, Settings as SettingsIcon, Eye, EyeOff, Copy, Trash } from 'lucide-react';
import { MedalBadge } from '@/components/MedalBadge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationCenter } from '@/components/NotificationCenter';
import { SyncProgress } from '@/components/SyncProgress';
import { ImportExportButtons } from '@/components/ImportExportButtons';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationContext';
import { UnknownBundlesDialog } from '@/components/UnknownBundlesDialog';

const Home = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedBundles, setSelectedBundles] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [showUnknownDialog, setShowUnknownDialog] = useState(false);
  const [unknownBundles, setUnknownBundles] = useState<any[]>([]);

  // Listen for storage changes AND p2p updates to refresh UI in real-time
  useEffect(() => {
    const handleStorageChange = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    const handleP2PUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('p2p-update' as any, handleP2PUpdate as any);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('p2p-update' as any, handleP2PUpdate as any);
    };
  }, []);

  // Check for unknown/unverified bundles on mount
  useEffect(() => {
    if (!user) return;

    const allBundles = getBundles();
    const unverified = allBundles.filter(bundle => {
      // Bundle has an owner/origin but it's not verified
      if (bundle.ownerId && bundle.ownerId !== user.id) {
        // Check if the owner is a known peer
        const isKnownPeer = user.knownPeers?.some(p => p.userId === bundle.ownerId);
        return !isKnownPeer;
      }
      return false;
    });

    if (unverified.length > 0) {
      setUnknownBundles(unverified);
      setShowUnknownDialog(true);
      addNotification({
        title: 'Unverified Bundles Detected',
        description: `Found ${unverified.length} bundle(s) from unknown sources`,
        type: 'warning',
      });
    }
  }, [user, refreshKey]);


  const bundles = getBundles();
  const flashcards = getFlashcards();
  const userStats = user ? getUserStats(user.id) : [];
  const users = getUsers();
  const playlists = getPlaylists();
  
  console.log('[Home] Render info:', {
    refreshKey,
    userId: user?.id,
    knownPeersCount: user?.knownPeers?.length || 0,
    knownPeers: user?.knownPeers?.map(p => ({
      peerId: p.peerId,
      userId: p.userId,
      username: p.username
    }))
  });

  const visibleBundles = bundles.filter(
    b => (b.isPublic || b.userId === user?.id || b.collaborators?.includes(user?.id || '')) && !b.isHidden
  );

  const hiddenBundles = bundles.filter(
    b => (b.isPublic || b.userId === user?.id || b.collaborators?.includes(user?.id || '')) && b.isHidden
  );

  const visiblePlaylists = playlists.filter(
    p => p.isPublic || p.userId === user?.id
  );

  const myPlaylists = playlists.filter(p => p.userId === user?.id);

  const allLabels = Array.from(new Set(bundles.map(b => b.label).filter(Boolean))) as string[];

  const filteredBundles = useMemo(() => {
    return visibleBundles.filter(bundle => {
      const matchesSearch = 
        bundle.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bundle.label?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesLabel = labelFilter === 'all' || bundle.label === labelFilter;
      
      return matchesSearch && matchesLabel;
    });
  }, [visibleBundles, searchQuery, labelFilter]);

  const filteredPlaylists = useMemo(() => {
    return visiblePlaylists.filter(playlist => 
      playlist.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [visiblePlaylists, searchQuery]);

  const getBundleStats = (bundleId: string) => {
    const stats = userStats.find(s => s.bundleId === bundleId);
    if (!stats) return { medal: 'none' as const, bestScore: 0 };
    return { medal: stats.bestMedal, bestScore: stats.bestScore };
  };

  const getBundleProgressPercent = (bundleId: string) => {
    if (!user) return 0;
    const bundleCards = flashcards.filter(f => f.bundleId === bundleId);
    if (bundleCards.length === 0) return 0;
    const progress = getBundleProgress(user.id, bundleId);
    const progressCount = progress.length;
    return Math.round((progressCount / bundleCards.length) * 100);
  };

  const toggleBundleSelection = (bundleId: string) => {
    setSelectedBundles(prev => 
      prev.includes(bundleId) 
        ? prev.filter(id => id !== bundleId)
        : [...prev, bundleId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedBundles.length === visibleBundles.length) {
      setSelectedBundles([]);
    } else {
      setSelectedBundles(visibleBundles.map(b => b.id));
    }
  };

  const cloneBundle = (bundleId: string) => {
    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle || !user) return;

    const newBundle = {
      ...bundle,
      id: `bundle_${Date.now()}`,
      userId: user.id,
      title: `${bundle.title} (copy)`,
      ownerId: user.id,
      originPeerId: undefined,
      verified: true,
      isPublic: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const bundleCards = flashcards.filter(f => f.bundleId === bundleId);
    const newCards = bundleCards.map(card => ({
      ...card,
      id: `card_${Date.now()}_${Math.random()}`,
      bundleId: newBundle.id,
    }));

    saveBundle(newBundle);
    newCards.forEach(card => saveFlashcard(card));

    toast({
      title: 'Bundle cloned!',
      description: 'The bundle is now yours to edit.',
    });
    
    addNotification({
      title: 'Bundle Cloned',
      description: `Successfully cloned "${bundle.title}"`,
      type: 'success',
    });
    
    window.dispatchEvent(new Event('storage'));
  };

  const toggleBundleHidden = (bundleId: string) => {
    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) return;

    const newHiddenState = !bundle.isHidden;
    saveBundle({ ...bundle, isHidden: newHiddenState });

    toast({
      title: newHiddenState ? 'Bundle hidden' : 'Bundle unhidden',
      description: newHiddenState ? 'Moved to hidden section' : 'Moved to main view',
    });

    addNotification({
      title: newHiddenState ? 'Bundle Hidden' : 'Bundle Unhidden',
      description: `"${bundle.title}" ${newHiddenState ? 'hidden' : 'unhidden'}`,
      type: 'info',
    });

    window.dispatchEvent(new Event('storage'));
  };

  const deleteBundleCompletely = (bundleId: string) => {
    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) return;

    if (confirm(`Are you sure you want to delete "${bundle.title}"? This cannot be undone.`)) {
      deleteBundle(bundleId);
      
      toast({
        title: 'Bundle deleted',
        description: 'The bundle has been permanently removed',
      });

      addNotification({
        title: 'Bundle Deleted',
        description: `"${bundle.title}" has been deleted`,
        type: 'error',
      });

      window.dispatchEvent(new Event('storage'));
    }
  };

  const myBundles = bundles.filter(b => 
    b.userId === user?.id || b.collaborators?.includes(user?.id || '')
  );

  const getCreatorName = (userId: string) => {
    // First check local users
    const localUser = users.find(u => u.id === userId);
    if (localUser) {
      return localUser.username;
    }
    
    // Then check known peers (for synced content)
    if (user?.knownPeers) {
      const peerInfo = user.knownPeers.find(p => p.userId === userId);
      if (peerInfo?.username) {
        return peerInfo.username;
      }
    }
    
    console.warn('[Home] Creator not found for userId:', userId, {
      localUsers: users.length,
      knownPeersCount: user?.knownPeers?.length || 0,
      searchedUserId: userId
    });
    return 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">FlashLearn</h1>
            <SyncProgress />
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationCenter />
            <Button variant="outline" onClick={() => navigate('/peer-sync')}>
              <Wifi className="w-4 h-4 mr-2" />
              P2P Sync
            </Button>
            <Button variant="outline" onClick={() => navigate('/settings')}>
              <SettingsIcon className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" onClick={() => navigate('/profile')}>
              <User className="w-4 h-4 mr-2" />
              {user?.username}
            </Button>
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate('/admin')}>
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="outline" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 space-y-4">
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search bundles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={labelFilter} onValueChange={setLabelFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Labels</SelectItem>
                {allLabels.map(label => (
                  <SelectItem key={label} value={label}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={() => navigate('/bundle/new')} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Bundle
            </Button>
            <Button onClick={() => navigate('/playlist/new')} variant="outline" className="gap-2">
              <List className="w-4 h-4" />
              Create Playlist
            </Button>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            {visibleBundles.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="gap-2"
                >
                  <Checkbox checked={selectedBundles.length === visibleBundles.length} />
                  {selectedBundles.length === visibleBundles.length ? 'Deselect All' : 'Select All'}
                </Button>
                <ImportExportButtons selectedBundleIds={selectedBundles} className="flex gap-2" />
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Bundles</TabsTrigger>
            <TabsTrigger value="mine">My Bundles</TabsTrigger>
            <TabsTrigger value="playlists">My Playlists</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlaylists.map(playlist => {
                const playlistCards = flashcards.filter(f => playlist.cardIds.includes(f.id));
                const creatorName = getCreatorName(playlist.userId);
                
                return (
                  <Card key={playlist.id} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate(`/study/${playlist.id}`)}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="group-hover:text-primary transition-colors">{playlist.title}</CardTitle>
                        <Badge variant="secondary">
                          <List className="w-3 h-3 mr-1" />
                          Playlist
                        </Badge>
                      </div>
                      <CardDescription className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {playlistCards.length} cards
                          {!playlist.isPublic && <Badge variant="outline">Private</Badge>}
                        </div>
                        <button
                          className="text-xs text-primary hover:underline text-left w-fit"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${playlist.userId}`);
                          }}
                        >
                          by {creatorName}
                        </button>
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/study/${playlist.id}`);
                        }}
                      >
                        Study
                      </Button>
                      {playlist.userId === user?.id && (
                        <Button 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/playlist/${playlist.id}`);
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
              
              {filteredBundles.map(bundle => {
                const bundleFlashcards = flashcards.filter(f => f.bundleId === bundle.id);
                const stats = getBundleStats(bundle.id);
                const creatorName = getCreatorName(bundle.userId);
                const progressPercent = getBundleProgressPercent(bundle.id);
                const isSelected = selectedBundles.includes(bundle.id);
                const canEdit = bundle.userId === user?.id || bundle.collaborators?.includes(user?.id || '');
                const canClone = bundle.userId !== user?.id;
                
                return (
                  <Card 
                    key={bundle.id} 
                    className={`hover:shadow-lg transition-all cursor-pointer group relative ${isSelected ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div 
                      className="absolute top-4 left-4 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleBundleSelection(bundle.id)}
                      />
                    </div>
                    <div onClick={() => navigate(`/study/${bundle.id}`)}>
                      <CardHeader>
                        {bundle.thumbnail && (
                          <img src={bundle.thumbnail} alt={bundle.title} className="w-full h-40 object-cover rounded-lg mb-4" />
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="group-hover:text-primary transition-colors pl-8">{bundle.title}</CardTitle>
                          <MedalBadge medal={stats.medal} score={stats.bestScore} size="sm" />
                        </div>
                        <CardDescription className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {bundleFlashcards.length} cards
                            {bundle.label && <Badge variant="secondary">{bundle.label}</Badge>}
                            {!bundle.isPublic && <Badge variant="outline">Private</Badge>}
                            {bundle.ownerId && bundle.ownerId !== user?.id && (
                              <Badge variant="outline">From Peer</Badge>
                            )}
                          </div>
                          {progressPercent > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Progress</span>
                                <span>{progressPercent}%</span>
                              </div>
                              <Progress value={progressPercent} className="h-1" />
                            </div>
                          )}
                          <button
                            className="text-xs text-primary hover:underline text-left w-fit"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/profile/${bundle.userId}`);
                            }}
                          >
                            by {creatorName}
                          </button>
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="flex gap-2">
                        <Button 
                          className="flex-1" 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/study/${bundle.id}`);
                          }}
                        >
                          Study
                        </Button>
                        {canEdit && (
                          <Button 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/bundle/${bundle.id}`);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        {canClone && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              cloneBundle(bundle.id);
                            }}
                            title="Clone this bundle"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBundleHidden(bundle.id);
                          }}
                          title="Hide this bundle"
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                        {!canEdit && (
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteBundleCompletely(bundle.id);
                            }}
                            title="Delete this bundle"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </CardFooter>
                    </div>
                  </Card>
                );
              })}
            </div>

            {filteredBundles.length === 0 && filteredPlaylists.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No bundles or playlists found. Create your first one!</p>
              </div>
            )}

            {/* Hidden Bundles Section */}
            {hiddenBundles.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <EyeOff className="w-5 h-5" />
                    Hidden Bundles
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHidden(!showHidden)}
                  >
                    {showHidden ? 'Hide' : 'Show'} ({hiddenBundles.length})
                  </Button>
                </div>

                {showHidden && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hiddenBundles.map(bundle => {
                      const bundleFlashcards = flashcards.filter(f => f.bundleId === bundle.id);
                      const stats = getBundleStats(bundle.id);
                      const creatorName = getCreatorName(bundle.userId);
                      const progressPercent = getBundleProgressPercent(bundle.id);
                      
                      return (
                        <Card key={bundle.id} className="hover:shadow-lg transition-shadow cursor-pointer group opacity-60" onClick={() => navigate(`/study/${bundle.id}`)}>
                          <CardHeader>
                            {bundle.thumbnail && (
                              <img src={bundle.thumbnail} alt={bundle.title} className="w-full h-40 object-cover rounded-lg mb-4" />
                            )}
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="group-hover:text-primary transition-colors">{bundle.title}</CardTitle>
                              <MedalBadge medal={stats.medal} score={stats.bestScore} size="sm" />
                            </div>
                            <CardDescription className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {bundleFlashcards.length} cards
                                {bundle.label && <Badge variant="secondary">{bundle.label}</Badge>}
                                {!bundle.isPublic && <Badge variant="outline">Private</Badge>}
                                <Badge variant="outline">
                                  <EyeOff className="w-3 h-3 mr-1" />
                                  Hidden
                                </Badge>
                              </div>
                              {progressPercent > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Progress</span>
                                    <span>{progressPercent}%</span>
                                  </div>
                                  <Progress value={progressPercent} className="h-1" />
                                </div>
                              )}
                              <button
                                className="text-xs text-primary hover:underline text-left w-fit"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/profile/${bundle.userId}`);
                                }}
                              >
                                by {creatorName}
                              </button>
                            </CardDescription>
                          </CardHeader>
                          <CardFooter className="flex gap-2">
                            <Button 
                              className="flex-1" 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/study/${bundle.id}`);
                              }}
                            >
                              Study
                            </Button>
                            {bundle.userId === user?.id && (
                              <Button 
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/bundle/${bundle.id}`);
                                }}
                              >
                                Edit
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBundleHidden(bundle.id);
                              }}
                              title="Unhide this bundle"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteBundleCompletely(bundle.id);
                              }}
                              title="Delete this bundle"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mine">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myBundles.map(bundle => {
                const bundleFlashcards = flashcards.filter(f => f.bundleId === bundle.id);
                const stats = getBundleStats(bundle.id);
                const isCollaborator = bundle.userId !== user?.id && bundle.collaborators?.includes(user?.id || '');
                
                return (
                  <Card key={bundle.id} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate(`/study/${bundle.id}`)}>
                    <CardHeader>
                      {bundle.thumbnail && (
                        <img src={bundle.thumbnail} alt={bundle.title} className="w-full h-40 object-cover rounded-lg mb-4" />
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="group-hover:text-primary transition-colors">{bundle.title}</CardTitle>
                        <MedalBadge medal={stats.medal} score={stats.bestScore} size="sm" />
                      </div>
                      <CardDescription className="flex items-center gap-2 flex-wrap">
                        {bundleFlashcards.length} cards
                        {bundle.label && <Badge variant="secondary">{bundle.label}</Badge>}
                        {!bundle.isPublic && <Badge variant="outline">Private</Badge>}
                        {isCollaborator && <Badge variant="outline">Collaborator</Badge>}
                        <Badge variant="default">Bundle</Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/study/${bundle.id}`);
                        }}
                      >
                        Study
                      </Button>
                      {bundle.userId === user?.id && (
                        <Button 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/bundle/${bundle.id}`);
                          }}
                        >
                          Edit
                        </Button>
                      )}
                      {bundle.collaborators?.includes(user?.id || '') && (
                        <Button 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/bundle/${bundle.id}/cards`);
                          }}
                        >
                          Edit Cards
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            {myBundles.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">You haven't created any bundles yet.</p>
                <Button onClick={() => navigate('/bundle/new')} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Create Your First Bundle
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="playlists">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myPlaylists.map(playlist => {
                const playlistCards = flashcards.filter(f => playlist.cardIds.includes(f.id));
                
                return (
                  <Card key={playlist.id} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate(`/study/${playlist.id}`)}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="group-hover:text-primary transition-colors">{playlist.title}</CardTitle>
                        <Badge variant="secondary">
                          <List className="w-3 h-3 mr-1" />
                          Playlist
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2 flex-wrap">
                        {playlistCards.length} cards
                        {!playlist.isPublic && <Badge variant="outline">Private</Badge>}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/study/${playlist.id}`);
                        }}
                      >
                        Study
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/playlist/${playlist.id}`);
                        }}
                      >
                        Edit
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            {myPlaylists.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">You haven't created any playlists yet.</p>
                <Button onClick={() => navigate('/playlist/new')} className="mt-4 gap-2">
                  <List className="w-4 h-4" />
                  Create Your First Playlist
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <UnknownBundlesDialog
        open={showUnknownDialog}
        onOpenChange={setShowUnknownDialog}
        unknownBundles={unknownBundles}
        onComplete={() => {
          setShowUnknownDialog(false);
          setUnknownBundles([]);
          setRefreshKey(prev => prev + 1);
        }}
      />
    </div>
  );
};

export default Home;
