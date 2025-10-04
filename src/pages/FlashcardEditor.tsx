import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getBundles, getFlashcards, saveFlashcard, updateFlashcard, deleteFlashcard, Flashcard } from '@/lib/storage';
import { handleImageInputChange } from '@/lib/imageUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, X, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FlashcardEditor = () => {
  const { bundleId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [questionText, setQuestionText] = useState('');
  const [questionImage, setQuestionImage] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [answerImage, setAnswerImage] = useState('');
  const [hints, setHints] = useState<Array<{ text?: string; image?: string }>>([]);

  useEffect(() => {
    const bundle = getBundles().find(b => b.id === bundleId);
    if (!bundle) {
      toast({
        title: "Bundle not found",
        variant: "destructive",
      });
      navigate('/home');
      return;
    }
    
    // Check if user is owner or collaborator
    const canEdit = bundle.userId === user?.id || bundle.collaborators?.includes(user?.id || '');
    if (!canEdit) {
      toast({
        title: "Access denied",
        description: "You don't have permission to edit this bundle",
        variant: "destructive",
      });
      navigate('/home');
      return;
    }

    loadFlashcards();
  }, [bundleId, user, navigate, toast]);

  const loadFlashcards = () => {
    const cards = getFlashcards().filter(f => f.bundleId === bundleId);
    setFlashcards(cards);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
    try {
      await handleImageInputChange(e, setter);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive"
      });
    }
  };

  const handleSave = () => {
    if (!questionText.trim() && !questionImage && !answerText.trim() && !answerImage) {
      toast({
        title: "Error",
        description: "Add at least a question or answer",
        variant: "destructive",
      });
      return;
    }

    const cardData = {
      bundleId: bundleId!,
      questionText: questionText || undefined,
      questionImage: questionImage || undefined,
      answerText: answerText || undefined,
      answerImage: answerImage || undefined,
      hints,
    };

    if (editingId) {
      updateFlashcard(editingId, { ...cardData, updatedAt: new Date().toISOString() });
      toast({ title: "Card updated!" });
    } else {
      const newCard: Flashcard = {
        id: `card_${Date.now()}`,
        ...cardData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveFlashcard(newCard);
      toast({ title: "Card added!" });
    }

    resetForm();
    loadFlashcards();
  };

  const resetForm = () => {
    setEditingId(null);
    setQuestionText('');
    setQuestionImage('');
    setAnswerText('');
    setAnswerImage('');
    setHints([]);
  };

  const handleEdit = (card: Flashcard) => {
    setEditingId(card.id);
    setQuestionText(card.questionText || '');
    setQuestionImage(card.questionImage || '');
    setAnswerText(card.answerText || '');
    setAnswerImage(card.answerImage || '');
    setHints(card.hints || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (cardId: string) => {
    if (confirm('Delete this flashcard?')) {
      deleteFlashcard(cardId);
      loadFlashcards();
      toast({ title: "Card deleted" });
    }
  };

  const addHint = () => {
    setHints([...hints, {}]);
  };

  const updateHint = (index: number, field: 'text' | 'image', value: string) => {
    const newHints = [...hints];
    newHints[index] = { ...newHints[index], [field]: value };
    setHints(newHints);
  };

  const removeHint = (index: number) => {
    setHints(hints.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(`/bundle/${bundleId}`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold">Manage Flashcards</h1>
          </div>
          <Button onClick={() => navigate('/home')} variant="default">
            Finish
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit' : 'Add'} Flashcard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Question</Label>
              <Textarea
                placeholder="Question text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={3}
              />
              <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setQuestionImage)} />
              {questionImage && <img src={questionImage} alt="Question" className="w-full h-40 object-cover rounded-lg" />}
            </div>

            <div className="space-y-4">
              <Label className="text-lg font-semibold">Answer</Label>
              <Textarea
                placeholder="Answer text"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                rows={3}
              />
              <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setAnswerImage)} />
              {answerImage && <img src={answerImage} alt="Answer" className="w-full h-40 object-cover rounded-lg" />}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Hints (Optional)</Label>
                <Button variant="outline" size="sm" onClick={addHint}>
                  <Plus className="w-4 h-4 mr-1" /> Add Hint
                </Button>
              </div>
              {hints.map((hint, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Hint {index + 1}</Label>
                      <Button variant="ghost" size="sm" onClick={() => removeHint(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Hint text"
                      value={hint.text || ''}
                      onChange={(e) => updateHint(index, 'text', e.target.value)}
                    />
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        try {
                          await handleImageInputChange(e, (dataUrl) => updateHint(index, 'image', dataUrl));
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: error instanceof Error ? error.message : "Failed to upload hint image",
                            variant: "destructive"
                          });
                        }
                      }}
                    />
                    {hint.image && <img src={hint.image} alt={`Hint ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />}
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                {editingId ? 'Update Card' : 'Add Card'}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Existing Cards ({flashcards.length})</h2>
          {flashcards.map((card) => (
            <Card key={card.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label className="text-sm text-muted-foreground">Question</Label>
                      {card.questionText && <p>{card.questionText}</p>}
                      {card.questionImage && <img src={card.questionImage} alt="Q" className="w-32 h-20 object-cover rounded mt-1" />}
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Answer</Label>
                      {card.answerText && <p>{card.answerText}</p>}
                      {card.answerImage && <img src={card.answerImage} alt="A" className="w-32 h-20 object-cover rounded mt-1" />}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(card)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(card.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default FlashcardEditor;
