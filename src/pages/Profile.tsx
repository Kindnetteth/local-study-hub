import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { updateUser, getUserStats, getBundles } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');

  const userStats = user ? getUserStats(user.id) : [];
  const bundles = getBundles();

  const totalStudied = userStats.reduce((acc, stat) => acc + stat.totalCorrect + stat.totalIncorrect, 0);
  const totalCorrect = userStats.reduce((acc, stat) => acc + stat.totalCorrect, 0);
  const accuracy = totalStudied > 0 ? Math.round((totalCorrect / totalStudied) * 100) : 0;

  const goldMedals = userStats.filter(stat => {
    const total = stat.totalCorrect + stat.totalIncorrect;
    return total > 0 && (stat.totalCorrect / total) === 1;
  }).length;

  const silverMedals = userStats.filter(stat => {
    const total = stat.totalCorrect + stat.totalIncorrect;
    const acc = total > 0 ? stat.totalCorrect / total : 0;
    return acc >= 0.8 && acc < 1;
  }).length;

  const bronzeMedals = userStats.filter(stat => {
    const total = stat.totalCorrect + stat.totalIncorrect;
    const acc = total > 0 ? stat.totalCorrect / total : 0;
    return acc >= 0.5 && acc < 0.8;
  }).length;

  const handlePasswordChange = () => {
    if (!newPassword.trim()) {
      toast({ title: "Error", description: "Password cannot be empty", variant: "destructive" });
      return;
    }

    updateUser(user!.id, { password: newPassword });
    toast({ title: "Password updated!" });
    setNewPassword('');
  };

  const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const pic = reader.result as string;
        setProfilePicture(pic);
        updateUser(user!.id, { profilePicture: pic });
        toast({ title: "Profile picture updated!" });
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
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
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

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold">{totalStudied}</p>
                <p className="text-sm text-muted-foreground">Cards Studied</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold">{accuracy}%</p>
                <p className="text-sm text-muted-foreground">Overall Accuracy</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold">Medals Earned</p>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold">
                    {goldMedals}
                  </div>
                  <span className="text-sm">Gold</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                    {silverMedals}
                  </div>
                  <span className="text-sm">Silver</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">
                    {bronzeMedals}
                  </div>
                  <span className="text-sm">Bronze</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold">Bundle Progress</p>
              {userStats.map(stat => {
                const bundle = bundles.find(b => b.id === stat.bundleId);
                if (!bundle) return null;
                
                const total = stat.totalCorrect + stat.totalIncorrect;
                const acc = total > 0 ? Math.round((stat.totalCorrect / total) * 100) : 0;
                
                return (
                  <div key={stat.bundleId} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{bundle.title}</span>
                    <span className="text-sm font-semibold">{acc}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
