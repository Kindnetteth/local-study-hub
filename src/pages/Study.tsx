import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getBundles, getFlashcards, getUserBundleStats, updateStats, Flashcard, UserStats, getPlaylists, updatePlaylist } from '@/lib/storage';
import { getSettings } from '@/lib/settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Lightbulb, RotateCcw, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import successImage from '@/assets/success-image.jpg';
import AddToPlaylistDialog from '@/components/AddToPlaylistDialog';
import { Checkbox } from '@/components/ui/checkbox';

const Study = () => {
  const { bundleId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const settings = getSettings();

  const [cardQueue, setCardQueue] = useState<Flashcard[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [shownHints, setShownHints] = useState<number[]>([]);
  const [sessionStats, setSessionStats] = useState<Record<string, { correct: number; incorrect: number }>>({});
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [finalAccuracy, setFinalAccuracy] = useState(0);
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [selectedCardsForPlaylist, setSelectedCardsForPlaylist] = useState<string[]>([]);
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    // Timer for study session
    if (!showCompletionScreen && settings.showStudyTimer) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showCompletionScreen, sessionStartTime, settings.showStudyTimer]);

  useEffect(() => {
    // Check if it's a playlist
    const playlist = getPlaylists().find(p => p.id === bundleId);
    if (playlist) {
      setIsPlaylist(true);
      const allFlashcards = getFlashcards();
      const cards = allFlashcards.filter(f => playlist.cardIds.includes(f.id));
      
      if (cards.length === 0) {
        toast({ title: "No flashcards in this playlist", variant: "destructive" });
        navigate('/home');
        return;
      }

      // Randomize cards if shuffle is enabled
      const shuffled = settings.shuffleByDefault ? shuffleArray([...cards]) : [...cards];

      setAllCards(cards);
      setCardQueue(shuffled);
      setSessionStartTime(Date.now());
      return;
    }

    // Otherwise it's a bundle
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

    // Randomize cards if shuffle is enabled
    const shuffled = settings.shuffleByDefault ? shuffleArray([...cards]) : [...cards];

    setAllCards(cards);
    setCardQueue(shuffled);
    setSessionStartTime(Date.now());
  }, [bundleId, user, navigate, toast, settings.shuffleByDefault]);

  const currentCard = cardQueue[0];

  // Auto-advance cards
  useEffect(() => {
    if (settings.autoAdvanceCards && showAnswer && currentCard) {
      const timer = setTimeout(() => {
        handleAnswer(true);
      }, settings.autoAdvanceDelay * 1000);
      return () => clearTimeout(timer);
    }
  }, [settings.autoAdvanceCards, settings.autoAdvanceDelay, showAnswer, currentCard]);
  const totalCards = Object.keys(sessionStats).length + cardQueue.length;
  const progress = ((totalCards - cardQueue.length) / totalCards) * 100;

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const playSound = (type: 'flip' | 'correct' | 'wrong') => {
    if (!settings.soundEffects) return;
    
    // Create audio context for sound effects
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'flip') {
      oscillator.frequency.value = 440;
      gainNode.gain.value = 0.1;
    } else if (type === 'correct') {
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.15;
    } else {
      oscillator.frequency.value = 220;
      gainNode.gain.value = 0.1;
    }
    
    oscillator.start();
    setTimeout(() => oscillator.stop(), 100);
  };

  const handleFlip = () => {
    setShowAnswer(!showAnswer);
    playSound('flip');
  };

  const handleAnswer = (correct: boolean) => {
    if (!currentCard) return;

    playSound(correct ? 'correct' : 'wrong');

    const newStats = { ...sessionStats };
    if (!newStats[currentCard.id]) {
      newStats[currentCard.id] = { correct: 0, incorrect: 0 };
    }
    
    if (correct) {
      newStats[currentCard.id].correct++;
      // Remove card from queue (answered correctly)
      const newQueue = cardQueue.slice(1);
      setCardQueue(newQueue);
      setSessionStats(newStats);
      
      // Check if we're done
      if (newQueue.length === 0) {
        finishSession(newStats);
      } else {
        setShowAnswer(false);
        setShownHints([]);
      }
    } else {
      newStats[currentCard.id].incorrect++;
      // Move card to back of queue (needs retry)
      const newQueue = [...cardQueue.slice(1), currentCard];
      setCardQueue(newQueue);
      setSessionStats(newStats);
      setShowAnswer(false);
      setShownHints([]);
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
    if (sessionAccuracy === 100) {
      medal = 'gold';
    } else if (sessionAccuracy >= 80) {
      medal = 'silver';
    } else if (sessionAccuracy >= 50) {
      medal = 'bronze';
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

    // Show completion screen with confetti for success
    setFinalAccuracy(Math.round(sessionAccuracy));
    setShowCompletionScreen(true);
    
    if (sessionAccuracy >= 50 && settings.showConfetti) {
      // Fire confetti
      const duration = 3000;
      const end = Date.now() + duration;
      
      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
      
      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  };

  const showHint = (index: number) => {
    setShownHints([...shownHints, index]);
  };

  const restart = () => {
    const shuffled = settings.shuffleByDefault ? shuffleArray([...allCards]) : [...allCards];
    setCardQueue(shuffled);
    setShowAnswer(false);
    setShownHints([]);
    setSessionStats({});
    setSelectedCardsForPlaylist([]);
    setSessionStartTime(Date.now());
    setElapsedTime(0);
  };

  if (showCompletionScreen) {
    const isPassed = finalAccuracy >= 50;
    
    const correctCardIds = Object.entries(sessionStats)
      .filter(([_, stats]) => stats.correct > 0 && stats.incorrect === 0)
      .map(([cardId]) => cardId);
    
    const failedCardIds = Object.entries(sessionStats)
      .filter(([_, stats]) => stats.incorrect > 0)
      .map(([cardId]) => cardId);

    const toggleCardSelection = (cardId: string) => {
      setSelectedCardsForPlaylist(prev =>
        prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
      );
    };

    const handleRemoveFromPlaylist = () => {
      if (isPlaylist && selectedCardsForPlaylist.length > 0) {
        const playlist = getPlaylists().find(p => p.id === bundleId);
        if (playlist) {
          const updatedCardIds = playlist.cardIds.filter(id => !selectedCardsForPlaylist.includes(id));
          updatePlaylist(bundleId!, { cardIds: updatedCardIds });
          toast({ title: `Removed ${selectedCardsForPlaylist.length} card(s) from playlist` });
          navigate('/home');
        }
      }
    };
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <div className="container mx-auto max-w-4xl space-y-4">
          <Card>
            <CardContent className="p-8 text-center space-y-6">
              <div className={cn(
                "w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl",
                isPassed ? "bg-green-500/20" : "bg-red-500/20"
              )}>
                {isPassed ? "🎉" : "😔"}
              </div>
              
              <h1 className={cn(
                "text-4xl font-bold",
                isPassed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {isPassed ? "Completed!" : "Failed"}
              </h1>
              
              <p className="text-2xl font-semibold">
                Your Score: {finalAccuracy}%
              </p>
              
              {isPassed ? (
                <>
                  <p className="text-lg text-muted-foreground">
                    Great job! You've successfully completed this {isPlaylist ? 'playlist' : 'bundle'}.
                  </p>
                  <img 
                    src={successImage} 
                    alt="Success" 
                    className="w-48 h-48 mx-auto rounded-full object-cover border-4 border-primary"
                  />
                </>
              ) : (
                <p className="text-lg text-muted-foreground">
                  Don't give up! Practice makes perfect. Try again to improve your score.
                </p>
              )}
              
              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={() => navigate('/home')} 
                  variant="outline" 
                  className="flex-1"
                  size="lg"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
                <Button 
                  onClick={() => {
                    setShowCompletionScreen(false);
                    restart();
                  }} 
                  className="flex-1"
                  size="lg"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Menu */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-bold">Session Statistics</h2>
              
              {failedCardIds.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">Failed Cards ({failedCardIds.length})</h3>
                  <div className="space-y-2">
                    {failedCardIds.map(cardId => {
                      const card = allCards.find(c => c.id === cardId);
                      if (!card) return null;
                      return (
                        <div key={cardId} className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg">
                          <Checkbox
                            checked={selectedCardsForPlaylist.includes(cardId)}
                            onCheckedChange={() => toggleCardSelection(cardId)}
                          />
                          <p className="flex-1">{card.questionText || 'Image question'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {correctCardIds.length > 0 && (
                <div>
                  <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">Correct Cards ({correctCardIds.length})</h3>
                  <div className="space-y-2">
                    {correctCardIds.map(cardId => {
                      const card = allCards.find(c => c.id === cardId);
                      if (!card) return null;
                      return (
                        <div key={cardId} className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                          <Checkbox
                            checked={selectedCardsForPlaylist.includes(cardId)}
                            onCheckedChange={() => toggleCardSelection(cardId)}
                          />
                          <p className="flex-1">{card.questionText || 'Image question'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedCardsForPlaylist.length > 0 && (
                <div className="flex gap-2 pt-4">
                  {isPlaylist ? (
                    <Button 
                      onClick={handleRemoveFromPlaylist}
                      variant="destructive"
                      className="flex-1"
                    >
                      Remove Selected from Playlist
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => setShowPlaylistDialog(true)}
                      className="flex-1"
                    >
                      Add Selected to Playlist
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <AddToPlaylistDialog
          open={showPlaylistDialog}
          onOpenChange={setShowPlaylistDialog}
          selectedCardIds={selectedCardsForPlaylist}
        />
      </div>
    );
  }

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
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-muted-foreground">
              {cardQueue.length} card{cardQueue.length !== 1 ? 's' : ''} remaining
            </p>
            {settings.showStudyTimer && (
              <p className="text-sm text-muted-foreground">
                Time: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6" style={{ perspective: '1000px' }}>
          <div 
              className={cn(
                "relative w-full",
                settings.animationSpeed !== 'off' && "transition-smooth",
                showAnswer && "[transform:rotateY(180deg)]"
              )}
              style={{ 
                transformStyle: 'preserve-3d',
                transitionDuration: settings.animationSpeed === 'fast' ? '0.15s' : 
                                  settings.animationSpeed === 'slow' ? '0.6s' : '0.3s'
              }}
              onClick={settings.doubleTapToFlip ? undefined : handleFlip}
              onDoubleClick={settings.doubleTapToFlip ? handleFlip : undefined}
          >
            {/* Front of card (Question) */}
            <Card 
              className={cn(
                "shadow-xl border-2",
                showAnswer && "invisible",
                settings.cardCorners === 'sharp' && "rounded-none"
              )}
              style={{ 
                backfaceVisibility: 'hidden',
                opacity: settings.cardOpacity / 100,
                boxShadow: settings.glossLevel > 0 ? `inset 0 -10px ${settings.glossLevel}px rgba(255, 255, 255, ${settings.glossLevel / 200})` : undefined
              }}
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
                !showAnswer && "invisible",
                settings.cardCorners === 'sharp' && "rounded-none"
              )}
              style={{ 
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                opacity: settings.cardOpacity / 100,
                boxShadow: settings.glossLevel > 0 ? `inset 0 -10px ${settings.glossLevel}px rgba(255, 255, 255, ${settings.glossLevel / 200})` : undefined
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
