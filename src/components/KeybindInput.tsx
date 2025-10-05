import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface KeybindInputProps {
  value: string;
  onChange: (key: string) => void;
  label: string;
}

export const KeybindInput = ({ value, onChange, label }: KeybindInputProps) => {
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!isCapturing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let key = e.key;
      
      // Format special keys
      if (key === ' ') key = 'Space';
      else if (key === 'ArrowUp') key = 'ArrowUp';
      else if (key === 'ArrowDown') key = 'ArrowDown';
      else if (key === 'ArrowLeft') key = 'ArrowLeft';
      else if (key === 'ArrowRight') key = 'ArrowRight';
      else if (key === 'Enter') key = 'Enter';
      else if (key === 'Escape') {
        setIsCapturing(false);
        return;
      }
      
      onChange(key);
      setIsCapturing(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCapturing, onChange]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <Input
          value={value}
          readOnly
          placeholder="Not set"
          className="flex-1"
        />
        <Button
          onClick={() => setIsCapturing(true)}
          variant={isCapturing ? "default" : "outline"}
          className="min-w-[100px]"
        >
          {isCapturing ? 'Press key...' : 'Change'}
        </Button>
      </div>
    </div>
  );
};
