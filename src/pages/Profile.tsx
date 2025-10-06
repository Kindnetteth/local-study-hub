import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePeer } from '@/contexts/PeerContext';
import { updateUser, getUserStats, getBundles, getUsers, getFlashcards, getPlaylists, deletePlaylist, User } from '@/lib/storage';
import { handleImageInputChange } from '@/lib/imageUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, List, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MedalBadge } from '@/components/MedalBadge';
import { ImageCropper } from '@/components/ImageCropper';

const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser, logout } = useAuth();
  const { broadcastProfileUpdate } = usePeer();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Get user data - check local users first, then knownPeers
  const users = getUsers();
  let user = userId ? users.find(u => u.id === userId) : currentUser;
  
  console.log('[Profile] Looking for user:', {
    userId,
    foundInLocalUsers: !!user,
    currentUserId: currentUser?.id,
    hasKnownPeers: !!currentUser?.knownPeers?.length,
    refreshKey
  });
  
  // If user not found locally, check knownPeers for P2P user info
  if (!user && userId && currentUser?.knownPeers) {
    console.log('[Profile] Searching knownPeers for userId:', userId);
    console.log('[Profile] Available knownPeers:', currentUser.knownPeers.map(p => ({
      peerId: p.peerId,
      userId: p.userId,
      username: p.username
    })));
    
    const peerInfo = currentUser.knownPeers.find(p => p.userId === userId);
    
    if (peerInfo) {
      console.log('[Profile] Found peer info:', peerInfo);
      // Create a temporary user object from peer info
      user = {
        id: peerInfo.userId!,
        username: peerInfo.username || 'Unknown',
        password: '', // Not needed for peer profiles
        profilePicture: peerInfo.profilePicture,
        createdAt: peerInfo.lastConnected || new Date().toISOString(),
        peerId: peerInfo.peerId,
      } as User;
    } else {
      console.log('[Profile] Peer info not found for userId:', userId);
    }
  }
  
  const isOwnProfile = !userId || userId === currentUser?.id;
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');

  // Re-fetch data when refreshKey changes (triggered by P2P updates)
  useEffect(() => {
    if (user) {
      setProfilePicture(user.profilePicture || '');
    }
  }, [refreshKey, user]);

  const userStats = user ? getUserStats(user.id) : [];
  const bundles = getBundles();
  const flashcards = getFlashcards();
  
  console.log('[Profile] Current stats for user:', {
    userId: user?.id,
    username: user?.username,
    statsCount: userStats.length,
    refreshKey
  });
  
  // For peer profiles (not own profile), only show public bundles
  const userBundles = bundles.filter(b => 
    b.userId === user?.id && (isOwnProfile || b.isPublic)
  );
  
  const playlists = getPlaylists();
  const userPlaylists = playlists.filter(p => p.userId === user?.id);
  
  // Listen for real-time P2P updates
  useEffect(() => {
    if (!userId || isOwnProfile) return;
    
    const handleP2PUpdate = (e: CustomEvent) => {
      const { type, data } = e.detail;
      
      // Check if update is relevant to this profile
      if (type === 'profile-update' && data.userId === userId) {
        setRefreshKey(prev => prev + 1);
      } else if (type === 'stats-update' && data.userId === userId) {
        setRefreshKey(prev => prev + 1);
      } else if ((type === 'bundle-update' || type === 'flashcard-update') && data.userInfo?.id === userId) {
        setRefreshKey(prev => prev + 1);
      }
    };
    
    window.addEventListener('p2p-update' as any, handleP2PUpdate as any);
    return () => window.removeEventListener('p2p-update' as any, handleP2PUpdate as any);
  }, [userId, isOwnProfile]);

  const totalStudied = userStats.reduce((acc, stat) => acc + stat.totalCorrect + stat.totalIncorrect, 0);
  const totalCorrect = userStats.reduce((acc, stat) => acc + stat.totalCorrect, 0);
  const accuracy = totalStudied > 0 ? Math.round((totalCorrect / totalStudied) * 100) : 0;

  const goldMedals = userStats.filter(stat => stat.bestMedal === 'gold').length;
  const silverMedals = userStats.filter(stat => stat.bestMedal === 'silver').length;
  const bronzeMedals = userStats.filter(stat => stat.bestMedal === 'bronze').length;
  const totalPractices = userStats.reduce((acc, stat) => acc + stat.practiceCount, 0);

  const handlePasswordChange = () => {
    if (!isOwnProfile) return;
    
    if (!newPassword.trim()) {
      toast({ title: "Error", description: "Password cannot be empty", variant: "destructive" });
      return;
    }

    updateUser(currentUser!.id, { password: newPassword });
    toast({ title: "Password updated!" });
    setNewPassword('');
  };

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwnProfile) return;
    
    try {
      await handleImageInputChange(e, (dataUrl) => {
        setImageToCrop(dataUrl);
        setShowCropper(true);
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload profile picture",
        variant: "destructive"
      });
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setProfilePicture(croppedImage);
    updateUser(currentUser!.id, { profilePicture: croppedImage });
    setShowCropper(false);
    setImageToCrop(null);
    toast({ title: "Profile picture updated!" });
    
    // Broadcast profile update to peers
    broadcastProfileUpdate(currentUser!.id, currentUser!.username, croppedImage);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/home')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">{isOwnProfile ? 'My Profile' : `${user.username}'s Profile`}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {isOwnProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profilePicture} />
                  <AvatarFallback className="text-2xl">{user?.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-2xl font-bold">{user?.username}</p>
                  <Label htmlFor="picture" className="text-sm cursor-pointer text-primary hover:underline">
                    Change picture
                  </Label>
                  <Input
                    id="picture"
                    type="file"
                    accept="image/*"
                    onChange={handlePictureUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Change Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button onClick={handlePasswordChange}>Update</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isOwnProfile && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user.profilePicture} />
                  <AvatarFallback className="text-2xl">{user.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-2xl font-bold">{user.username}</p>
                  <p className="text-sm text-muted-foreground">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold">{totalStudied}</p>
                <p className="text-sm text-muted-foreground">Cards Studied</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold">{accuracy}%</p>
                <p className="text-sm text-muted-foreground">Overall Accuracy</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold">{totalPractices}</p>
                <p className="text-sm text-muted-foreground">Practice Sessions</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold">{userBundles.length}</p>
                <p className="text-sm text-muted-foreground">Bundles Created</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold">Medals Earned</p>
              <div className="flex gap-6 justify-center py-4">
                <div className="flex flex-col items-center gap-2">
                  <MedalBadge medal="gold" score={100} size="md" />
                  <span className="text-sm font-medium">{goldMedals} Gold</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <MedalBadge medal="silver" score={80} size="md" />
                  <span className="text-sm font-medium">{silverMedals} Silver</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <MedalBadge medal="bronze" score={50} size="md" />
                  <span className="text-sm font-medium">{bronzeMedals} Bronze</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold">Bundle Progress</p>
              {userStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No practice sessions yet</p>
              ) : (
                userStats.map(stat => {
                  const bundle = bundles.find(b => b.id === stat.bundleId);
                  if (!bundle) return null;
                  
                  return (
                    <div key={stat.bundleId} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{bundle.title}</p>
                        <p className="text-xs text-muted-foreground">Practiced {stat.practiceCount} times • Completed {stat.completionCount} times</p>
                      </div>
                      <MedalBadge medal={stat.bestMedal} score={stat.bestScore} size="sm" />
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {isOwnProfile && userPlaylists.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>My Playlists</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userPlaylists.map(playlist => {
                  const playlistCards = flashcards.filter(f => playlist.cardIds.includes(f.id));
                  
                  return (
                    <Card key={playlist.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{playlist.title}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <List className="w-3 h-3" />
                              {playlistCards.length} cards
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardFooter className="flex gap-2">
                        <Button 
                          className="flex-1" 
                          onClick={() => navigate(`/study/${playlist.id}`)}
                        >
                          Study
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => navigate(`/playlist/${playlist.id}`)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this playlist?')) {
                              deletePlaylist(playlist.id);
                              toast({ title: "Playlist deleted" });
                              window.location.reload();
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{isOwnProfile ? 'My' : `${user.username}'s`} Bundles</CardTitle>
          </CardHeader>
          <CardContent>
            {userBundles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {isOwnProfile ? "You haven't created any bundles yet" : "This user hasn't created any bundles yet"}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userBundles.map(bundle => {
                  const bundleFlashcards = flashcards.filter(f => f.bundleId === bundle.id);
                  
                  return (
                    <Card key={bundle.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/study/${bundle.id}`)}>
                      <CardHeader>
                        {bundle.thumbnail && (
                          <img src={bundle.thumbnail} alt={bundle.title} className="w-full h-32 object-cover rounded-lg mb-2" />
                        )}
                        <CardTitle className="text-lg">{bundle.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 flex-wrap">
                          {bundleFlashcards.length} cards
                          {bundle.label && <Badge variant="secondary" className="text-xs">{bundle.label}</Badge>}
                          {!bundle.isPublic && <Badge variant="outline" className="text-xs">Private</Badge>}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <Button 
                          className="w-full" 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/study/${bundle.id}`);
                          }}
                        >
                          Study
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {imageToCrop && (
          <ImageCropper
            image={imageToCrop}
            onCropComplete={handleCropComplete}
            onCancel={() => {
              setShowCropper(false);
              setImageToCrop(null);
            }}
            open={showCropper}
          />
        )}
      </main>
    </div>
  );
};

export default Profile;
