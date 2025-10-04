import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getBundles, getFlashcards, getUserBundleStats, updateStats, Flashcard, UserStats } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Lightbulb, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const Study = () => {
  const { bundleId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [shownHints, setShownHints] = useState<number[]>([]);
  const [sessionStats, setSessionStats] = useState<Record<string, { correct: number; incorrect: number }>>({});

  useEffect(() => {
    const bundle = getBundles().find(b => b.id === bundleId);
    if (!bundle) {
      toast({ title: "Bundle not found", variant: "destructive" });
      navigate('/home');
      return;
    }

    const cards = getFlashcards().filter(f => f.bundleId === bundleId);
    if (cards.length === 0) {
      toast({ title: "No flashcards in this bundle", variant: "destructive" });
      navigate('/home');
      return;
    }

    // Adaptive ordering: prioritize cards with worse performance
    const stats = getUserBundleStats(user!.id, bundleId!) || {
      userId: user!.id,
      bundleId: bundleId!,
      cardStats: {},
      totalCorrect: 0,
      totalIncorrect: 0,
      bestScore: 0,
      bestMedal: 'none' as const,
      practiceCount: 0,
      completionCount: 0,
    };

    const sortedCards = [...cards].sort((a, b) => {
      const aStats = stats.cardStats[a.id] || { correct: 0, incorrect: 0 };
      const bStats = stats.cardStats[b.id] || { correct: 0, incorrect: 0 };
      
      const aAccuracy = aStats.correct + aStats.incorrect === 0 ? 0 : aStats.correct / (aStats.correct + aStats.incorrect);
      const bAccuracy = bStats.correct + bStats.incorrect === 0 ? 0 : bStats.correct / (bStats.correct + bStats.incorrect);
      
      return aAccuracy - bAccuracy;
    });

    setFlashcards(sortedCards);
  }, [bundleId, user, navigate, toast]);

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  const handleAnswer = (correct: boolean) => {
    if (!currentCard) return;

    const newStats = { ...sessionStats };
    if (!newStats[currentCard.id]) {
      newStats[currentCard.id] = { correct: 0, incorrect: 0 };
    }
    
    if (correct) {
      newStats[currentCard.id].correct++;
    } else {
      newStats[currentCard.id].incorrect++;
    }
    
    setSessionStats(newStats);
    
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setShownHints([]);
    } else {
      finishSession(newStats);
    }
  };

  const finishSession = (finalStats: Record<string, { correct: number; incorrect: number }>) => {
    const existingStats = getUserBundleStats(user!.id, bundleId!) || {
      userId: user!.id,
      bundleId: bundleId!,
      cardStats: {},
      totalCorrect: 0,
      totalIncorrect: 0,
      bestScore: 0,
      bestMedal: 'none' as const,
      practiceCount: 0,
      completionCount: 0,
    };

    // Calculate CURRENT SESSION stats
    let sessionCorrect = 0;
    let sessionIncorrect = 0;

    Object.entries(finalStats).forEach(([cardId, stats]) => {
      if (!existingStats.cardStats[cardId]) {
        existingStats.cardStats[cardId] = { correct: 0, incorrect: 0 };
      }
      existingStats.cardStats[cardId].correct += stats.correct;
      existingStats.cardStats[cardId].incorrect += stats.incorrect;
      existingStats.cardStats[cardId].lastStudied = new Date().toISOString();
      
      sessionCorrect += stats.correct;
      sessionIncorrect += stats.incorrect;
    });

    // Update cumulative totals
    const totalCorrect = existingStats.totalCorrect + sessionCorrect;
    const totalIncorrect = existingStats.totalIncorrect + sessionIncorrect;

    // Calculate CURRENT SESSION accuracy (not cumulative)
    const sessionTotal = sessionCorrect + sessionIncorrect;
    const sessionAccuracy = (sessionCorrect / sessionTotal) * 100;
    
    let medal: 'none' | 'bronze' | 'silver' | 'gold' = 'none';
    let medalText = '';
    if (sessionAccuracy === 100) {
      medal = 'gold';
      medalText = '🥇 Gold';
    } else if (sessionAccuracy >= 80) {
      medal = 'silver';
      medalText = '🥈 Silver';
    } else if (sessionAccuracy >= 50) {
      medal = 'bronze';
      medalText = '🥉 Bronze';
    }

    // Update best score and medal if current session is better
    const medalRank = { none: 0, bronze: 1, silver: 2, gold: 3 };
    const bestMedal = medalRank[medal] > medalRank[existingStats.bestMedal] ? medal : existingStats.bestMedal;
    const bestScore = Math.max(Math.round(sessionAccuracy), existingStats.bestScore);

    const updatedStats: UserStats = {
      ...existingStats,
      totalCorrect,
      totalIncorrect,
      lastStudied: new Date().toISOString(),
      bestScore,
      bestMedal,
      practiceCount: existingStats.practiceCount + 1,
      completionCount: existingStats.completionCount + 1,
    };

    updateStats(updatedStats);

    const newBestText = bestScore > existingStats.bestScore ? ' 🎉 New Best!' : '';
    toast({
      title: "Session Complete!",
      description: medalText ? `${medalText} - ${Math.round(sessionAccuracy)}% this session${newBestText}` : `${Math.round(sessionAccuracy)}% accuracy`,
    });

    navigate('/home');
  };

  const showHint = (index: number) => {
    setShownHints([...shownHints, index]);
  };

  const restart = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setShownHints([]);
  };

  if (!currentCard) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" onClick={() => navigate('/home')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit
            </Button>
            <Button variant="ghost" onClick={restart}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Card {currentIndex + 1} of {flashcards.length}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6" style={{ perspective: '1000px' }}>
          <div 
            className={cn(
              "relative w-full transition-smooth",
              showAnswer && "[transform:rotateY(180deg)]"
            )}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front of card (Question) */}
            <Card 
              className={cn(
                "shadow-xl border-2",
                showAnswer && "invisible"
              )}
              style={{ backfaceVisibility: 'hidden' }}
            >
              <CardContent className="p-8 space-y-6 min-h-[400px] flex flex-col justify-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-3xl">❓</span>
                  </div>
                  <h2 className="text-2xl font-bold text-center">Question</h2>
                  {currentCard.questionText && (
                    <p className="text-lg text-center">{currentCard.questionText}</p>
                  )}
                  {currentCard.questionImage && (
                    <img src={currentCard.questionImage} alt="Question" className="w-full max-h-64 object-contain rounded-lg" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Back of card (Answer) */}
            <Card 
              className={cn(
                "absolute top-0 left-0 w-full shadow-xl border-2 border-primary",
                !showAnswer && "invisible"
              )}
              style={{ 
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <CardContent className="p-8 space-y-6 min-h-[400px] flex flex-col justify-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-3xl">✓</span>
                  </div>
                  <h2 className="text-2xl font-bold text-center text-primary">Answer</h2>
                  {currentCard.answerText && (
                    <p className="text-lg text-center">{currentCard.answerText}</p>
                  )}
                  {currentCard.answerImage && (
                    <img src={currentCard.answerImage} alt="Answer" className="w-full max-h-64 object-contain rounded-lg" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {!showAnswer && currentCard.hints && currentCard.hints.length > 0 && (
          <div className="mb-6 space-y-2">
            {currentCard.hints.map((hint, index) => (
              <div key={index}>
                {shownHints.includes(index) ? (
                  <Card className="p-4 bg-accent/10">
                    {hint.text && <p className="text-sm">{hint.text}</p>}
                    {hint.image && <img src={hint.image} alt={`Hint ${index + 1}`} className="w-full max-h-32 object-contain rounded mt-2" />}
                  </Card>
                ) : (
                  <Button variant="outline" onClick={() => showHint(index)} className="w-full">
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Show Hint {index + 1}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-4">
          {!showAnswer ? (
            <Button onClick={() => setShowAnswer(true)} className="flex-1" size="lg">
              Show Answer
            </Button>
          ) : (
            <>
              <Button onClick={() => handleAnswer(false)} variant="destructive" className="flex-1" size="lg">
                Wrong
              </Button>
              <Button onClick={() => handleAnswer(true)} className="flex-1" size="lg">
                Correct
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Study;
