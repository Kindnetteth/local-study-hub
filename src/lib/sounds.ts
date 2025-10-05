/**
 * Sound management system with better quality audio
 */

const audioContext = typeof window !== 'undefined' 
  ? new (window.AudioContext || (window as any).webkitAudioContext)()
  : null;

// Better quality sound generation using oscillators
export const playSound = (type: 'flip' | 'correct' | 'wrong', enabled: boolean = true) => {
  if (!enabled || !audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Configure based on sound type
  switch (type) {
    case 'flip':
      // Pleasant rising tone for flip
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.type = 'sine';
      break;

    case 'correct':
      // Cheerful ascending chime for correct answer
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.08); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.16); // G5
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.type = 'triangle';
      break;

    case 'wrong':
      // Gentle descending tone for wrong answer (not harsh)
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
      oscillator.type = 'sine';
      break;
  }

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
};
