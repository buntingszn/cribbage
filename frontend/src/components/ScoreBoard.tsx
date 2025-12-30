import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

interface Player {
  name: string;
  score: number;
  seat: number;
}

interface ScoreBoardProps {
  players: Player[];
  targetScore?: number;
}

// Floating score animation component
function FloatingScore({ points, onComplete }: { points: number; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="absolute -top-2 right-0 text-green-400 font-bold text-sm pointer-events-none"
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      +{points}
    </motion.div>
  );
}

export default function ScoreBoard({
  players,
  targetScore = 121,
}: ScoreBoardProps) {
  const [floatingScores, setFloatingScores] = useState<Map<number, number>>(new Map());
  const prevScores = useRef<Map<number, number>>(new Map());

  // Detect score changes and show floating +X
  useEffect(() => {
    players.forEach(player => {
      const prevScore = prevScores.current.get(player.seat) ?? 0;
      if (player.score > prevScore) {
        const diff = player.score - prevScore;
        setFloatingScores(prev => new Map(prev).set(player.seat, diff));
      }
      prevScores.current.set(player.seat, player.score);
    });
  }, [players]);

  const handleFloatComplete = (seat: number) => {
    setFloatingScores(prev => {
      const next = new Map(prev);
      next.delete(seat);
      return next;
    });
  };

  // Milestone markers
  const milestones = [
    { value: 0, label: '0' },
    { value: 61, label: '61', color: 'text-amber-400', desc: 'Skunk line' },
    { value: 91, label: '91', color: 'text-red-400', desc: 'Double skunk' },
    { value: targetScore, label: String(targetScore) },
  ];

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-400 mb-3">Scores</h3>
      <div className="space-y-3">
        {players.map((player) => {
          const progress = Math.min((player.score / targetScore) * 100, 100);
          const floatPoints = floatingScores.get(player.seat);

          return (
            <div key={player.seat} className="relative">
              <div className="flex items-center gap-3">
                <span className="text-white font-medium flex-1 truncate">
                  {player.name}
                </span>
                <div className="flex items-center gap-2">
                  {/* Progress bar */}
                  <div className="w-28 h-3 bg-slate-700 rounded-full overflow-hidden relative">
                    {/* Milestone markers */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-400/30"
                      style={{ left: `${(61 / targetScore) * 100}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-400/30"
                      style={{ left: `${(91 / targetScore) * 100}%` }}
                    />

                    {/* Progress fill */}
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                      initial={false}
                      animate={{ width: `${progress}%` }}
                      transition={{
                        type: 'spring',
                        stiffness: 100,
                        damping: 15,
                      }}
                    />
                  </div>

                  {/* Score */}
                  <div className="relative">
                    <motion.span
                      className="text-white font-mono w-10 text-right block font-bold"
                      key={player.score}
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 0.3 }}
                    >
                      {player.score}
                    </motion.span>

                    {/* Floating score indicator */}
                    <AnimatePresence>
                      {floatPoints && (
                        <FloatingScore
                          key={`float-${player.seat}-${player.score}`}
                          points={floatPoints}
                          onComplete={() => handleFloatComplete(player.seat)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Status badges */}
              {player.score >= targetScore && (
                <motion.span
                  className="absolute -right-1 -top-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold"
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  WIN!
                </motion.span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-slate-700">
        <div className="flex justify-between text-xs">
          {milestones.map((m) => (
            <span
              key={m.value}
              className={m.color || 'text-slate-500'}
              title={m.desc}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
