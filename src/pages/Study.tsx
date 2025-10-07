import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePeer } from '@/contexts/PeerContext';
import { 
  getBundles, getFlashcards, getUserBundleStats, updateStats, Flashcard, UserStats, 
  getPlaylists, updatePlaylist, getBundleProgress, updateCardProgress, clearBundleProgress, CardProgress 
} from '@/lib/storage';
import { getSettings } from '@/lib/settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Lightbulb, RotateCcw, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import successImage from '@/assets/success-image.jpg';
import AddToPlaylistDialog from '@/components/AddToPlaylistDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { playSound } from '@/lib/sounds';
import { ImageViewer } from '@/components/ImageViewer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Study = () => {
  const { bundleId } = useParams();
  const { user } = useAuth();
  const { broadcastStatsUpdate } = usePeer();
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
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [hasProgress, setHasProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Timer for study session
    if (!showCompletionScreen && settings.showStudyTimer) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showCompletionScreen, sessionStartTime, settings.showStudyTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showCompletionScreen || showResumeDialog) return;
      
      const key = e.key === ' ' ? 'Space' : e.key;
      
      if (key === settings.keyboardShortcuts.flip) {
        e.preventDefault();
        handleFlip();
      } else if (showAnswer) {
        if (key === settings.keyboardShortcuts.correct) {
          e.preventDefault();
          handleAnswer(true);
        } else if (key === settings.keyboardShortcuts.wrong) {
          e.preventDefault();
          handleAnswer(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAnswer, showCompletionScreen, showResumeDialog, settings.keyboardShortcuts]);

  useEffect(() => {
    if (!user || !bundleId) return;

    setIsLoading(true);

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

      setAllCards(cards);
      startNewSession(cards);
      setIsLoading(false);
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

    setAllCards(cards);

    // Check for existing progress
    const progress = getBundleProgress(user.id, bundleId);
    if (progress.length > 0) {
      setHasProgress(true);
      setShowResumeDialog(true);
      setIsLoading(false);
    } else {
      startNewSession(cards);
      setIsLoading(false);
    }
  }, [bundleId, user, navigate, toast]);

  const startNewSession = (cards: Flashcard[]) => {
    const shuffled = settings.shuffleByDefault ? shuffleArray([...cards]) : [...cards];
    setCardQueue(shuffled);
    setSessionStartTime(Date.now());
  };

  const handleResumeChoice = (resume: boolean) => {
    setShowResumeDialog(false);
    
    try {
      if (resume && user && bundleId) {
        // Load progress and resume
        const progress = getBundleProgress(user.id, bundleId);
        const progressMap = new Map(progress.map(p => [p.cardId, p]));
        
        // Filter to unfinished cards
        const unfinishedCards = allCards.filter(card => {
          const cardProgress = progressMap.get(card.id);
          return !cardProgress || cardProgress.correctCount === 0;
        });
        
        setCardQueue(unfinishedCards.length > 0 ? unfinishedCards : allCards);
        toast({ title: "Resumed from where you left off" });
      } else {
        // Clear progress and start fresh
        if (user && bundleId) {
          clearBundleProgress(user.id, bundleId);
        }
        startNewSession(allCards);
      }
    } catch (error) {
      console.error('Error handling resume:', error);
      toast({ title: "Error loading progress", variant: "destructive" });
      startNewSession(allCards);
    }
  };

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

  const handleFlip = () => {
    setShowAnswer(!showAnswer);
    playSound('flip', settings.soundEffects);
  };

  const checkAnswer = () => {
    if (!currentCard) return false;

    switch (currentCard.type) {
      case 'fill-blank':
        return userAnswer.trim().toLowerCase() === (currentCard.answerText || '').trim().toLowerCase();
      
      case 'multiple-choice':
        return selectedOption === currentCard.correctOption;
      
      case 'true-false':
        return userAnswer.toLowerCase() === (currentCard.answerText || '').toLowerCase();
      
      default:
        return true; // For basic cards, user decides
    }
  };

  const handleAnswer = (correct: boolean) => {
    if (!currentCard || !user || !bundleId) return;

    // For non-basic cards, check answer automatically
    if (currentCard.type !== 'basic') {
      correct = checkAnswer();
    }

    playSound(correct ? 'correct' : 'wrong', settings.soundEffects);

    const newStats = { ...sessionStats };
    if (!newStats[currentCard.id]) {
      newStats[currentCard.id] = { correct: 0, incorrect: 0 };
    }
    
    if (correct) {
      newStats[currentCard.id].correct++;
    } else {
      newStats[currentCard.id].incorrect++;
    }

    // Update card progress
    const existingProgress = getBundleProgress(user.id, bundleId).find(p => p.cardId === currentCard.id);
    const cardProgress: CardProgress = {
      cardId: currentCard.id,
      bundleId,
      userId: user.id,
      lastSeen: new Date().toISOString(),
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due in 24 hours
      correctCount: (existingProgress?.correctCount || 0) + (correct ? 1 : 0),
      incorrectCount: (existingProgress?.incorrectCount || 0) + (correct ? 0 : 1),
      streak: correct ? (existingProgress?.streak || 0) + 1 : 0,
    };
    updateCardProgress(cardProgress);

    if (correct) {
      // Remove card from queue (answered correctly)
      const newQueue = cardQueue.slice(1);
      setCardQueue(newQueue);
      setSessionStats(newStats);
      
      // Check if we're done
      if (newQueue.length === 0) {
        finishSession(newStats);
      } else {
        resetCardState();
      }
    } else {
      // Move card to back of queue (needs retry)
      const newQueue = [...cardQueue.slice(1), currentCard];
      setCardQueue(newQueue);
      setSessionStats(newStats);
      resetCardState();
    }
  };

  const resetCardState = () => {
    setShowAnswer(false);
    setShownHints([]);
    setUserAnswer('');
    setSelectedOption(null);
  };

  const finishSession = (finalStats: Record<string, { correct: number; incorrect: number }>) => {
    if (!user || !bundleId) return;

    const existingStats = getUserBundleStats(user.id, bundleId) || {
      userId: user.id,
      bundleId: bundleId,
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
    
    // Clear progress since session is complete
    clearBundleProgress(user.id, bundleId);
    
    // Broadcast stats update to peers (only for public bundles)
    const currentBundle = getBundles().find(b => b.id === bundleId);
    if (currentBundle?.isPublic) {
      broadcastStatsUpdate(user.id, bundleId, updatedStats);
    }

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
    resetCardState();
    setSessionStats({});
    setSelectedCardsForPlaylist([]);
    setSessionStartTime(Date.now());
    setElapsedTime(0);
    if (user && bundleId) {
      clearBundleProgress(user.id, bundleId);
    }
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
                {isPassed ? "Completed!" : "Keep Practicing!"}
              </h1>
              
              <p className="text-2xl font-semibold">
                Your Score: {finalAccuracy}%
              </p>
              
              {isPassed ? (
                <>
                  <p className="text-lg text-muted-foreground">
                    Great job! You successfully completed this {isPlaylist ? 'playlist' : 'bundle'}.
                  </p>
                  <img 
                    src={successImage} 
                    alt="Success" 
                    className="w-48 h-48 mx-auto rounded-full object-cover border-4 border-primary"
                  />
                </>
              ) : (
                <p className="text-lg text-muted-foreground">
                  Practice makes perfect. Try again to improve your score.
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

          {(failedCardIds.length > 0 || correctCardIds.length > 0) && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">Session Summary</h2>
                
                {failedCardIds.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-red-600 dark:text-red-400">
                      Cards to Review ({failedCardIds.length})
                    </h3>
                    <div className="space-y-2">
                      {failedCardIds.map(cardId => {
                        const card = allCards.find(c => c.id === cardId);
                        if (!card) return null;
                        return (
                          <div key={cardId} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded">
                            <Checkbox
                              checked={selectedCardsForPlaylist.includes(cardId)}
                              onCheckedChange={() => toggleCardSelection(cardId)}
                            />
                            <span className="text-sm">{card.questionText || 'Card ' + cardId}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowPlaylistDialog(true)}
                        disabled={selectedCardsForPlaylist.length === 0}
                        size="sm"
                      >
                        Add to Playlist ({selectedCardsForPlaylist.length})
                      </Button>
                      {isPlaylist && (
                        <Button
                          onClick={handleRemoveFromPlaylist}
                          disabled={selectedCardsForPlaylist.length === 0}
                          variant="destructive"
                          size="sm"
                        >
                          Remove from Playlist
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <AddToPlaylistDialog
          open={showPlaylistDialog}
          onOpenChange={(open) => {
            setShowPlaylistDialog(open);
            if (!open) {
              setSelectedCardsForPlaylist([]);
            }
          }}
          selectedCardIds={selectedCardsForPlaylist}
        />
      </div>
    );
  }

  // Show resume dialog first if there's progress
  if (showResumeDialog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center">
        <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Resume Previous Session?</AlertDialogTitle>
              <AlertDialogDescription>
                You have unfinished progress in this bundle. Would you like to resume where you left off or start fresh?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => handleResumeChoice(false)}>
                Start Fresh
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => handleResumeChoice(true)}>
                Resume
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }
  
  if (isLoading || !currentCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center">
        <Card className="p-8">
          <p>Loading...</p>
        </Card>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderCardContent = () => {
    switch (currentCard.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="text-center">
                {currentCard.questionText && (
                  <h2 className="text-2xl font-bold mb-4">{currentCard.questionText}</h2>
                )}
                {currentCard.questionImage && (
                  <img
                    src={currentCard.questionImage}
                    alt="Question"
                    className="w-full max-h-64 object-contain rounded-lg cursor-pointer"
                    onClick={() => setEnlargedImage(currentCard.questionImage || null)}
                  />
                )}
              </div>

              {!showAnswer ? (
                <div className="space-y-3">
                  {currentCard.options?.map((option, index) => (
                    <Button
                      key={index}
                      variant={selectedOption === index ? 'default' : 'outline'}
                      className="w-full text-left justify-start h-auto py-4 px-6"
                      onClick={() => setSelectedOption(index)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {currentCard.options?.map((option, index) => (
                    <div
                      key={index}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border-2",
                        index === currentCard.correctOption
                          ? "bg-green-50 dark:bg-green-950/20 border-green-500"
                          : selectedOption === index
                          ? "bg-red-50 dark:bg-red-950/20 border-red-500"
                          : "bg-muted"
                      )}
                    >
                      {option}
                      {index === currentCard.correctOption && " ✓"}
                    </div>
                  ))}
                  {currentCard.explanation && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-sm font-semibold mb-1">Explanation:</p>
                      <p className="text-sm">{currentCard.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'true-false':
        return (
          <div className="space-y-6">
            <div className="text-center">
              {currentCard.questionText && (
                <h2 className="text-2xl font-bold mb-4">{currentCard.questionText}</h2>
              )}
              {currentCard.questionImage && (
                <img
                  src={currentCard.questionImage}
                  alt="Question"
                  className="w-full max-h-64 object-contain rounded-lg cursor-pointer"
                  onClick={() => setEnlargedImage(currentCard.questionImage || null)}
                />
              )}
            </div>

            {!showAnswer ? (
              <div className="flex gap-4">
                <Button
                  variant={userAnswer === 'true' ? 'default' : 'outline'}
                  className="flex-1 h-16 text-lg"
                  onClick={() => setUserAnswer('true')}
                >
                  True
                </Button>
                <Button
                  variant={userAnswer === 'false' ? 'default' : 'outline'}
                  className="flex-1 h-16 text-lg"
                  onClick={() => setUserAnswer('false')}
                >
                  False
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={cn(
                  "p-6 rounded-lg text-center",
                  checkAnswer() ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"
                )}>
                  <p className="text-xl font-bold">
                    {checkAnswer() ? "Correct!" : "Incorrect"}
                  </p>
                  <p className="mt-2">The answer is: <strong>{currentCard.answerText}</strong></p>
                </div>
                {currentCard.explanation && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="text-sm font-semibold mb-1">Explanation:</p>
                    <p className="text-sm">{currentCard.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'fill-blank':
        return (
          <div className="space-y-6">
            <div className="text-center">
              {currentCard.questionText && (
                <h2 className="text-2xl font-bold mb-4">{currentCard.questionText}</h2>
              )}
              {currentCard.questionImage && (
                <img
                  src={currentCard.questionImage}
                  alt="Question"
                  className="w-full max-h-64 object-contain rounded-lg cursor-pointer"
                  onClick={() => setEnlargedImage(currentCard.questionImage || null)}
                />
              )}
            </div>

            {!showAnswer ? (
              <Input
                type="text"
                placeholder="Type your answer..."
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="text-lg h-14"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && userAnswer.trim()) {
                    handleFlip();
                  }
                }}
              />
            ) : (
              <div className="space-y-4">
                <div className={cn(
                  "p-6 rounded-lg",
                  checkAnswer() ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"
                )}>
                  <p className="text-xl font-bold mb-2">
                    {checkAnswer() ? "Correct!" : "Incorrect"}
                  </p>
                  <p>Your answer: <strong>{userAnswer}</strong></p>
                  <p>Correct answer: <strong>{currentCard.answerText}</strong></p>
                </div>
                {currentCard.explanation && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="text-sm font-semibold mb-1">Explanation:</p>
                    <p className="text-sm">{currentCard.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      default: // basic
        return (
          <div className="space-y-6">
            <div className={cn("p-8 text-center", !showAnswer && "")}>
              {!showAnswer ? (
                <>
                  {currentCard.questionText && (
                    <h2 className="text-2xl font-bold mb-4">{currentCard.questionText}</h2>
                  )}
                  {currentCard.questionImage && (
                    <img
                      src={currentCard.questionImage}
                      alt="Question"
                      className="w-full max-h-96 object-contain rounded-lg mx-auto cursor-pointer"
                      onClick={() => setEnlargedImage(currentCard.questionImage || null)}
                    />
                  )}
                </>
              ) : (
                <>
                  {currentCard.answerText && (
                    <p className="text-xl mb-4">{currentCard.answerText}</p>
                  )}
                  {currentCard.answerImage && (
                    <img
                      src={currentCard.answerImage}
                      alt="Answer"
                      className="w-full max-h-96 object-contain rounded-lg mx-auto cursor-pointer"
                      onClick={() => setEnlargedImage(currentCard.answerImage || null)}
                    />
                  )}
                  {currentCard.explanation && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-left">
                      <p className="text-sm font-semibold mb-1">Explanation:</p>
                      <p className="text-sm">{currentCard.explanation}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/home')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-4">
              {settings.showStudyTimer && (
                <div className="text-sm font-mono bg-card px-4 py-2 rounded-lg">
                  {formatTime(elapsedTime)}
                </div>
              )}
              <div className="text-sm font-semibold">
                {totalCards - cardQueue.length} / {totalCards}
              </div>
            </div>
          </div>

          <Progress value={progress} className="mb-6" />

          <Card className="mb-6">
            <CardContent className="p-0">
              {renderCardContent()}
            </CardContent>
          </Card>

          {/* Hints Section */}
          {currentCard.hints && currentCard.hints.length > 0 && !showAnswer && (
            <Card className="mb-6">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Hints
                </h3>
                {currentCard.hints.map((hint, index) => (
                  <div key={index}>
                    {shownHints.includes(index) ? (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                        {hint.text && <p className="text-sm">{hint.text}</p>}
                        {hint.image && (
                          <img
                            src={hint.image}
                            alt={`Hint ${index + 1}`}
                            className="w-full max-h-32 object-contain rounded mt-2 cursor-pointer"
                            onClick={() => setEnlargedImage(hint.image || null)}
                          />
                        )}
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => showHint(index)}
                      >
                        Show Hint {index + 1}
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            {!showAnswer ? (
              <Button
                onClick={handleFlip}
                className="flex-1"
                size="lg"
                disabled={
                  (currentCard.type === 'multiple-choice' && selectedOption === null) ||
                  (currentCard.type === 'true-false' && !userAnswer) ||
                  (currentCard.type === 'fill-blank' && !userAnswer.trim())
                }
              >
                {currentCard.type === 'basic' ? 'Show Answer' : 'Check Answer'}
              </Button>
            ) : currentCard.type === 'basic' ? (
              <>
                <Button
                  onClick={() => handleAnswer(false)}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                >
                  Wrong
                </Button>
                <Button
                  onClick={() => handleAnswer(true)}
                  className="flex-1"
                  size="lg"
                >
                  Correct
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleAnswer(checkAnswer())}
                className="flex-1"
                size="lg"
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>

      <ImageViewer
        imageUrl={enlargedImage}
        onClose={() => setEnlargedImage(null)}
      />
    </>
  );
};

export default Study;
