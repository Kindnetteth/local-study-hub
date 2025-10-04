import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getBundles, getFlashcards, getUserStats } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Plus, Search, User, Shield, LogOut } from 'lucide-react';

const Home = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState<string>('all');

  const bundles = getBundles();
  const flashcards = getFlashcards();
  const userStats = user ? getUserStats(user.id) : [];

  const visibleBundles = bundles.filter(
    b => b.isPublic || b.userId === user?.id
  );

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

  const getBundleStats = (bundleId: string) => {
    const stats = userStats.find(s => s.bundleId === bundleId);
    if (!stats) return { medal: 'none', accuracy: 0 };
    
    const total = stats.totalCorrect + stats.totalIncorrect;
    if (total === 0) return { medal: 'none', accuracy: 0 };
    
    const accuracy = (stats.totalCorrect / total) * 100;
    
    let medal = 'none';
    if (accuracy === 100) medal = 'gold';
    else if (accuracy >= 80) medal = 'silver';
    else if (accuracy >= 50) medal = 'bronze';
    
    return { medal, accuracy: Math.round(accuracy) };
  };

  const getMedalColor = (medal: string) => {
    switch (medal) {
      case 'gold': return 'bg-yellow-500';
      case 'silver': return 'bg-gray-400';
      case 'bronze': return 'bg-orange-600';
      default: return 'bg-muted';
    }
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
          </div>
          
          <div className="flex items-center gap-2">
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
        <div className="mb-8 flex gap-4 flex-col md:flex-row">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBundles.map(bundle => {
            const bundleFlashcards = flashcards.filter(f => f.bundleId === bundle.id);
            const stats = getBundleStats(bundle.id);
            
            return (
              <Card key={bundle.id} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate(`/study/${bundle.id}`)}>
                <CardHeader>
                  {bundle.thumbnail && (
                    <img src={bundle.thumbnail} alt={bundle.title} className="w-full h-40 object-cover rounded-lg mb-4" />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="group-hover:text-primary transition-colors">{bundle.title}</CardTitle>
                    {stats.medal !== 'none' && (
                      <div className={`w-8 h-8 rounded-full ${getMedalColor(stats.medal)} flex items-center justify-center text-white font-bold text-sm`}>
                        {stats.accuracy}%
                      </div>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    {bundleFlashcards.length} cards
                    {bundle.label && <Badge variant="secondary">{bundle.label}</Badge>}
                    {!bundle.isPublic && <Badge variant="outline">Private</Badge>}
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
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {filteredBundles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No bundles found. Create your first one!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
