import { HexColorPicker } from 'react-colorful';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  showGradient?: boolean;
  gradient?: { start: string; end: string; angle: number };
  onGradientChange?: (gradient: { start: string; end: string; angle: number }) => void;
}

export const ColorPicker = ({ 
  color, 
  onChange, 
  label,
  showGradient = false,
  gradient,
  onGradientChange
}: ColorPickerProps) => {
  const [isGradient, setIsGradient] = useState(false);
  const [gradientStart, setGradientStart] = useState(gradient?.start || color);
  const [gradientEnd, setGradientEnd] = useState(gradient?.end || color);
  const [gradientAngle, setGradientAngle] = useState(gradient?.angle || 90);
  const [colorHistory, setColorHistory] = useState<string[]>([color]);

  const handleColorChange = (newColor: string) => {
    setColorHistory(prev => [...prev.slice(-9), newColor]); // Keep last 10 colors
    onChange(newColor);
  };

  const handleGradientToggle = () => {
    const newGradientState = !isGradient;
    setIsGradient(newGradientState);
    if (newGradientState && onGradientChange) {
      onGradientChange({ start: gradientStart, end: gradientEnd, angle: gradientAngle });
    }
  };

  const handleGradientChange = () => {
    if (onGradientChange) {
      onGradientChange({ start: gradientStart, end: gradientEnd, angle: gradientAngle });
    }
  };

  const getContrastColor = (hexColor: string) => {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start"
            style={{
              background: isGradient 
                ? `linear-gradient(${gradientAngle}deg, ${gradientStart}, ${gradientEnd})`
                : color
            }}
          >
            <div className="flex items-center gap-2" style={{ color: getContrastColor(color) }}>
              <div className="w-4 h-4 rounded border" style={{ background: color }} />
              {isGradient ? 'Gradient' : color}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-4">
            {showGradient && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isGradient}
                  onChange={handleGradientToggle}
                  className="rounded"
                />
                <Label>Use Gradient</Label>
              </div>
            )}

            {!isGradient ? (
              <>
                <HexColorPicker color={color} onChange={handleColorChange} />
                {colorHistory.length > 1 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Recent Colors</Label>
                    <div className="flex gap-1 flex-wrap">
                      {colorHistory.slice().reverse().map((historyColor, i) => (
                        <button
                          key={i}
                          className="w-6 h-6 rounded border-2 border-border hover:border-primary transition-colors"
                          style={{ backgroundColor: historyColor }}
                          onClick={() => onChange(historyColor)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Start Color</Label>
                  <HexColorPicker 
                    color={gradientStart} 
                    onChange={(c) => {
                      setGradientStart(c);
                      handleGradientChange();
                    }} 
                  />
                </div>
                <div>
                  <Label className="text-xs">End Color</Label>
                  <HexColorPicker 
                    color={gradientEnd} 
                    onChange={(c) => {
                      setGradientEnd(c);
                      handleGradientChange();
                    }} 
                  />
                </div>
                <div>
                  <Label className="text-xs">Angle: {gradientAngle}°</Label>
                  <Slider
                    value={[gradientAngle]}
                    onValueChange={([v]) => {
                      setGradientAngle(v);
                      handleGradientChange();
                    }}
                    min={0}
                    max={360}
                    step={15}
                  />
                </div>
              </div>
            )}

            <Input
              value={isGradient ? `${gradientStart} → ${gradientEnd}` : color}
              readOnly
              className="text-xs"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
