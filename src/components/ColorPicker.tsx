import { HexColorPicker } from 'react-colorful';
import { useState, useEffect } from 'react';
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
  showConfirmButton?: boolean; // New prop to enable/disable confirm button
}

export const ColorPicker = ({ 
  color, 
  onChange, 
  label,
  showGradient = false,
  gradient,
  onGradientChange,
  showConfirmButton = false // Default to false for backward compatibility
}: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempColor, setTempColor] = useState(color);
  const [hexInput, setHexInput] = useState(color);
  const [isGradient, setIsGradient] = useState(false);
  const [gradientStart, setGradientStart] = useState(gradient?.start || color);
  const [gradientEnd, setGradientEnd] = useState(gradient?.end || color);
  const [gradientAngle, setGradientAngle] = useState(gradient?.angle || 90);
  const [colorHistory, setColorHistory] = useState<string[]>([color]);
  const [gradientHistory, setGradientHistory] = useState<{ start: string; end: string; angle: number }[]>([]);

  // Update temp color when prop changes
  useEffect(() => {
    setTempColor(color);
    setHexInput(color);
  }, [color]);

  const handleColorChange = (newColor: string) => {
    setTempColor(newColor);
    setHexInput(newColor);
    if (!showConfirmButton) {
      // Immediate mode (old behavior)
      setColorHistory(prev => [...prev.slice(-9), newColor]);
      onChange(newColor);
    }
  };

  const handleHexInputChange = (value: string) => {
    setHexInput(value);
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      setTempColor(value);
      if (!showConfirmButton) {
        onChange(value);
      }
    }
  };

  const handleConfirm = () => {
    setColorHistory(prev => [...prev.slice(-9), tempColor]);
    onChange(tempColor);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempColor(color);
    setHexInput(color);
    setIsOpen(false);
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
      const newGradient = { start: gradientStart, end: gradientEnd, angle: gradientAngle };
      onGradientChange(newGradient);
      // Save to gradient history
      setGradientHistory(prev => {
        const filtered = prev.filter(g => 
          !(g.start === newGradient.start && g.end === newGradient.end && g.angle === newGradient.angle)
        );
        return [...filtered.slice(-9), newGradient];
      });
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
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start"
            style={{
              background: isGradient 
                ? `linear-gradient(${gradientAngle}deg, ${gradientStart}, ${gradientEnd})`
                : (showConfirmButton ? tempColor : color)
            }}
          >
            <div className="flex items-center gap-2" style={{ color: getContrastColor(showConfirmButton ? tempColor : color) }}>
              <div className="w-4 h-4 rounded border" style={{ background: showConfirmButton ? tempColor : color }} />
              {isGradient ? 'Gradient' : (showConfirmButton ? tempColor : color)}
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
                <HexColorPicker color={showConfirmButton ? tempColor : color} onChange={handleColorChange} />
                
                <div className="space-y-2">
                  <Label className="text-xs">Hex Color</Label>
                  <Input
                    value={hexInput}
                    onChange={(e) => handleHexInputChange(e.target.value.toUpperCase())}
                    placeholder="#A855F7"
                    maxLength={7}
                    className="text-xs font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Type a hex color (e.g., #A855F7)
                  </p>
                </div>

                {colorHistory.length > 1 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Recent Colors</Label>
                    <div className="flex gap-1 flex-wrap">
                      {colorHistory.slice().reverse().map((historyColor, i) => (
                        <button
                          key={i}
                          className="w-6 h-6 rounded border-2 border-border hover:border-primary transition-colors"
                          style={{ backgroundColor: historyColor }}
                          onClick={() => {
                            if (showConfirmButton) {
                              setTempColor(historyColor);
                              setHexInput(historyColor);
                            } else {
                              onChange(historyColor);
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {showConfirmButton && (
                  <div className="flex gap-2">
                    <Button onClick={handleConfirm} className="flex-1" size="sm">
                      Done
                    </Button>
                    <Button onClick={handleCancel} variant="outline" className="flex-1" size="sm">
                      Cancel
                    </Button>
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

                {gradientHistory.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Recent Gradients</Label>
                    <div className="flex gap-1 flex-wrap">
                      {gradientHistory.slice().reverse().map((g, i) => (
                        <button
                          key={i}
                          className="w-12 h-6 rounded border-2 border-border hover:border-primary transition-colors"
                          style={{ 
                            background: `linear-gradient(${g.angle}deg, ${g.start}, ${g.end})`
                          }}
                          onClick={() => {
                            setGradientStart(g.start);
                            setGradientEnd(g.end);
                            setGradientAngle(g.angle);
                            handleGradientChange();
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
