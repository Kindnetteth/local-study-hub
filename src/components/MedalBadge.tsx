interface MedalBadgeProps {
  medal: 'none' | 'bronze' | 'silver' | 'gold';
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export const MedalBadge = ({ medal, score, size = 'md' }: MedalBadgeProps) => {
  if (medal === 'none') return null;

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-16 h-16 text-sm',
    lg: 'w-24 h-24 text-lg',
  };

  const medalConfig = {
    gold: {
      gradient: 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600',
      shadow: 'shadow-lg shadow-yellow-500/50',
      ring: 'ring-4 ring-yellow-200',
      emoji: '🥇',
    },
    silver: {
      gradient: 'bg-gradient-to-br from-gray-200 via-gray-300 to-gray-500',
      shadow: 'shadow-lg shadow-gray-400/50',
      ring: 'ring-4 ring-gray-200',
      emoji: '🥈',
    },
    bronze: {
      gradient: 'bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700',
      shadow: 'shadow-lg shadow-orange-500/50',
      ring: 'ring-4 ring-orange-200',
      emoji: '🥉',
    },
  };

  const config = medalConfig[medal];
  
  // Safety check: if config is undefined, don't render
  if (!config) {
    console.warn(`Invalid medal type: ${medal}`);
    return null;
  }

  return (
    <div className={`${sizeClasses[size]} ${config.gradient} ${config.shadow} ${config.ring} rounded-full flex flex-col items-center justify-center text-white font-bold relative animate-scale-in`}>
      <span className="text-lg">{config.emoji}</span>
      <span className="text-xs mt-0.5">{score}%</span>
    </div>
  );
};
