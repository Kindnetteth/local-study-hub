import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getBundles, getFlashcards, getUserBundleStats, updateStats, Flashcard, UserStats } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Lightbulb, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
    };

    let totalCorrect = existingStats.totalCorrect;
    let totalIncorrect = existingStats.totalIncorrect;

    Object.entries(finalStats).forEach(([cardId, stats]) => {
      if (!existingStats.cardStats[cardId]) {
        existingStats.cardStats[cardId] = { correct: 0, incorrect: 0 };
      }
      existingStats.cardStats[cardId].correct += stats.correct;
      existingStats.cardStats[cardId].incorrect += stats.incorrect;
      existingStats.cardStats[cardId].lastStudied = new Date().toISOString();
      
      totalCorrect += stats.correct;
      totalIncorrect += stats.incorrect;
    });

    const updatedStats: UserStats = {
      ...existingStats,
      totalCorrect,
      totalIncorrect,
      lastStudied: new Date().toISOString(),
    };

    updateStats(updatedStats);

    const total = totalCorrect + totalIncorrect;
    const accuracy = (totalCorrect / total) * 100;
    
    let medal = '';
    if (accuracy === 100) medal = '🥇 Gold';
    else if (accuracy >= 80) medal = '🥈 Silver';
    else if (accuracy >= 50) medal = '🥉 Bronze';

    toast({
      title: "Session Complete!",
      description: medal ? `${medal} - ${Math.round(accuracy)}% accuracy` : `${Math.round(accuracy)}% accuracy`,
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
        <Card className="mb-6">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center">Question</h2>
              {currentCard.questionText && (
                <p className="text-lg text-center">{currentCard.questionText}</p>
              )}
              {currentCard.questionImage && (
                <img src={currentCard.questionImage} alt="Question" className="w-full max-h-64 object-contain rounded-lg" />
              )}
            </div>

            {showAnswer && (
              <div className="space-y-4 pt-6 border-t">
                <h2 className="text-2xl font-bold text-center text-primary">Answer</h2>
                {currentCard.answerText && (
                  <p className="text-lg text-center">{currentCard.answerText}</p>
                )}
                {currentCard.answerImage && (
                  <img src={currentCard.answerImage} alt="Answer" className="w-full max-h-64 object-contain rounded-lg" />
                )}
              </div>
            )}
          </CardContent>
        </Card>

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
