import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AIFormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AI_FORMAT_JSON = `{
  "bundles": [
    {
      "id": "bundle_unique_id",
      "userId": "your_user_id",
      "title": "Python Basics",
      "label": "Programming",
      "isPublic": true,
      "collaborators": [],
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "flashcards": [
    {
      "id": "card_1",
      "bundleId": "bundle_unique_id",
      "type": "basic",
      "questionText": "What is a variable in Python?",
      "answerText": "A variable is a container for storing data values.",
      "explanation": "Variables in Python don't need explicit declaration.",
      "hints": [
        { "text": "Think about data storage" }
      ],
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": "card_2",
      "bundleId": "bundle_unique_id",
      "type": "true-false",
      "questionText": "Python is a compiled language.",
      "answerText": "false",
      "explanation": "Python is an interpreted language, not compiled.",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": "card_3",
      "bundleId": "bundle_unique_id",
      "type": "multiple-choice",
      "questionText": "Which of these is NOT a Python data type?",
      "options": ["int", "float", "char", "str"],
      "correctOption": 2,
      "explanation": "Python doesn't have a 'char' type, it uses 'str' for characters.",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": "card_4",
      "bundleId": "bundle_unique_id",
      "type": "fill-blank",
      "questionText": "To print output in Python, use the _____ function.",
      "answerText": "print",
      "explanation": "The print() function displays output to the console.",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}`;

const AI_INSTRUCTIONS = `# How to Generate Flashcards with AI

## Step 1: Copy the Format
Click "Copy JSON Template" below to copy the format to your clipboard.

## Step 2: Prepare Your Prompt
Open your favorite AI (ChatGPT, Claude, Gemini, etc.) and paste the template, then add your request:

Example prompt:
"Using this format, create 20 flashcards about World War 2. Include all card types: basic Q&A, true/false, multiple choice, and fill-in-the-blank questions."

## Step 3: Generate and Download
The AI will generate a properly formatted JSON file. Save the response as a .json file (e.g., "ww2_flashcards.json").

## Step 4: Import
Go back to the app, click "Import Bundles", and select your JSON file. You can also import from a ZIP file if it contains bundle.json and images.

## Supported Card Types

### Basic Q&A
- questionText: Your question
- answerText: The answer
- explanation: Optional explanation
- questionImage/answerImage: Optional (use image URLs or data URLs)
- hints: Optional array of hints

### True/False
- questionText: Statement to evaluate
- answerText: "true" or "false"
- explanation: Why it's true or false

### Multiple Choice
- questionText: The question
- options: Array of 4 choices
- correctOption: Index of correct answer (0-3)
- explanation: Why that option is correct

### Fill in the Blank
- questionText: Sentence with _____ for the blank
- answerText: The correct answer
- explanation: Additional context

## Tips
- Generate unique IDs for each bundle and card
- Use consistent timestamps
- Keep questions clear and concise
- Always include explanations for learning
- You can include image URLs in questionImage/answerImage fields
- The AI can generate as many cards as you want in one file`;

export const AIFormatDialog = ({ open, onOpenChange }: AIFormatDialogProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(AI_FORMAT_JSON);
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
                <pre className="text-xs">{AI_FORMAT_JSON}</pre>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
