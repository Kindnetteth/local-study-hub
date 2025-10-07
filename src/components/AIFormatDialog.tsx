import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface AIFormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getAIFormatJSON = (userId: string) => `{
  "bundles": [
    {
      "id": "bundle_${Date.now()}",
      "userId": "${userId}",
      "title": "Python Basics",
      "label": "Programming",
      "isPublic": false,
      "createdAt": "${new Date().toISOString()}",
      "updatedAt": "${new Date().toISOString()}"
    }
  ],
  "flashcards": [
    {
      "id": "card_1",
      "bundleId": "bundle_${Date.now()}",
      "type": "basic",
      "questionText": "What is a variable in Python?",
      "answerText": "A variable is a container for storing data values.",
      "explanation": "Variables in Python don't need explicit declaration.",
      "hints": [
        { "text": "Think about data storage" }
      ],
      "createdAt": "${new Date().toISOString()}",
      "updatedAt": "${new Date().toISOString()}"
    },
    {
      "id": "card_2",
      "bundleId": "bundle_${Date.now()}",
      "type": "true-false",
      "questionText": "Python is a compiled language.",
      "answerText": "false",
      "explanation": "Python is an interpreted language, not compiled.",
      "createdAt": "${new Date().toISOString()}",
      "updatedAt": "${new Date().toISOString()}"
    },
    {
      "id": "card_3",
      "bundleId": "bundle_${Date.now()}",
      "type": "multiple-choice",
      "questionText": "Which of these is NOT a Python data type?",
      "options": ["int", "float", "char", "str"],
      "correctOption": 2,
      "explanation": "Python doesn't have a 'char' type, it uses 'str' for characters.",
      "createdAt": "${new Date().toISOString()}",
      "updatedAt": "${new Date().toISOString()}"
    },
    {
      "id": "card_4",
      "bundleId": "bundle_${Date.now()}",
      "type": "fill-blank",
      "questionText": "To print output in Python, use the _____ function.",
      "answerText": "print",
      "explanation": "The print() function displays output to the console.",
      "createdAt": "${new Date().toISOString()}",
      "updatedAt": "${new Date().toISOString()}"
    }
  ]
}`;

const AI_INSTRUCTIONS = `# How to Generate Flashcards with AI

## Quick Start
1. Copy the JSON template below
2. Paste it into any AI (ChatGPT, Claude, Gemini, etc.)
3. Add your prompt: "Using this JSON format, create 50 flashcards for learning GDScript"
4. Save the AI's response as a .json file
5. Import it using "Import Bundles" button

## IMPORTANT: The Template Already Has Your User ID
The template below is pre-filled with your actual user ID. The AI should keep the "userId" field exactly as shown in the template.

## What the AI Should Generate

### REQUIRED Fields (AI MUST include these):
- **id**: Unique for each card (e.g., "card_1", "card_2", "card_3"...)
- **bundleId**: MUST be the same for all cards (use the one from template)
- **type**: One of: "basic", "true-false", "multiple-choice", "fill-blank"
- **questionText**: The question or statement
- **answerText**: The correct answer (for true-false: must be "true" or "false")
- **createdAt/updatedAt**: ISO timestamps (copy from template)

### For Multiple Choice Cards (REQUIRED):
- **options**: Array of exactly 4 choices
- **correctOption**: Index 0-3 (which option is correct)

### OPTIONAL Fields (AI can add if helpful):
- **explanation**: Why the answer is correct (highly recommended)
- **hints**: Array of hint objects like [{"text": "hint here"}]
- **questionImage/answerImage**: Image URLs or base64 data

### Card Type Specifics

**Basic Q&A** ("type": "basic")
- questionText: "What is GDScript?"
- answerText: "A Python-like scripting language for Godot"
- explanation: Additional context
- hints: [{"text": "Think about Godot"}]

**True/False** ("type": "true-false")
- questionText: "GDScript is statically typed by default."
- answerText: "false" (must be lowercase "true" or "false")
- explanation: Why it's true or false

**Multiple Choice** ("type": "multiple-choice")
- questionText: "Which symbol is used for comments?"
- options: ["//", "#", "--", "/* */"]
- correctOption: 1 (the index of "#" in the array)
- explanation: The "#" symbol is used

**Fill in the Blank** ("type": "fill-blank")
- questionText: "To print output use the _____ function."
- answerText: "print"
- explanation: The print() function outputs to console

## Example Prompt for AI
"Using this exact JSON format, create 50 flashcards for learning GDScript. Include all 4 card types (basic, true-false, multiple-choice, fill-blank). Use sequential card IDs like card_1, card_2, etc. Keep the same bundleId for all cards. Cover variables, functions, signals, nodes, and syntax."

## Tips for Best Results
- Tell the AI to keep the bundleId consistent for all cards
- Request sequential card IDs: card_1, card_2, card_3...
- Multiple choice MUST have exactly 4 options
- True/false answers MUST be lowercase "true" or "false"
- Fill-in-blank questions should use _____ to show where the blank is
- Keep questions clear and answers concise`;

export const AIFormatDialog = ({ open, onOpenChange }: AIFormatDialogProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const aiFormatJson = useMemo(() => {
    return getAIFormatJSON(user?.id || 'your_user_id');
  }, [user?.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(aiFormatJson);
    setCopied(true);
    toast({ title: 'Template copied to clipboard!' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Generate Flashcards with AI</DialogTitle>
          <DialogDescription>
            Learn how to use AI to generate properly formatted flashcards
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="instructions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
            <TabsTrigger value="template">JSON Template</TabsTrigger>
          </TabsList>

          <TabsContent value="instructions" className="mt-4">
            <ScrollArea className="h-[500px] w-full rounded-md border p-4">
              <pre className="whitespace-pre-wrap text-sm">{AI_INSTRUCTIONS}</pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="template" className="mt-4">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={handleCopy} size="sm" className="gap-2">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy JSON Template'}
                </Button>
              </div>
              <ScrollArea className="h-[450px] w-full rounded-md border p-4">
                <pre className="text-xs">{aiFormatJson}</pre>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
