import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { updateUser, getUserStats, getBundles, getUsers, getFlashcards } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MedalBadge } from '@/components/MedalBadge';

const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const users = getUsers();
  const user = userId ? users.find(u => u.id === userId) : currentUser;
  const isOwnProfile = !userId || userId === currentUser?.id;

  const [newPassword, setNewPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');

  const userStats = user ? getUserStats(user.id) : [];
  const bundles = getBundles();
  const flashcards = getFlashcards();
  const userBundles = bundles.filter(b => b.userId === user?.id);

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

  const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwnProfile) return;
    
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const pic = reader.result as string;
        setProfilePicture(pic);
        updateUser(currentUser!.id, { profilePicture: pic });
        toast({ title: "Profile picture updated!" });
      };
      reader.readAsDataURL(file);
    }
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
      </main>
    </div>
  );
};

export default Profile;
