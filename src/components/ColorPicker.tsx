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

  const handleGradientToggle = () => {
    setIsGradient(!isGradient);
    if (!isGradient && onGradientChange) {
      onGradientChange({ start: gradientStart, end: gradientEnd, angle: gradientAngle });
    }
  };

  const handleGradientChange = () => {
    if (onGradientChange) {
      onGradientChange({ start: gradientStart, end: gradientEnd, angle: gradientAngle });
    }
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
            <div className="flex items-center gap-2 text-white mix-blend-difference">
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
              <HexColorPicker color={color} onChange={onChange} />
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
