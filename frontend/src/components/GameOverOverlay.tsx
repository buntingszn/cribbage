import { motion } from 'framer-motion';
import { Trophy, Share2 } from 'lucide-react';
import { BottomSheet } from './ui/BottomSheet';
import { useHaptics } from '../hooks/useHaptics';
import { useEffect } from 'react';

interface Player {
  name: string;
  seat: number;
  score: number;
}

interface GameOverOverlayProps {
  winner: { seat: number; name: string };
  players: Player[];
  onPlayAgain: () => void;
  isOpen?: boolean;
}

export default function GameOverOverlay({
  winner,
  players,
  onPlayAgain,
  isOpen = true,
}: GameOverOverlayProps) {
  const { trigger } = useHaptics();
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const losingScore = sortedPlayers[sortedPlayers.length - 1]?.score || 0;

  // Determine skunk status
  let skunkStatus = '';
  if (losingScore < 61) {
    skunkStatus = 'Double Skunk!';
  } else if (losingScore < 91) {
    skunkStatus = 'Skunk!';
  }

  // Celebrate on open
  useEffect(() => {
    if (isOpen) {
      trigger('success');
    }
  }, [isOpen, trigger]);

  const handleShare = async () => {
    const text = `I just ${winner.seat === sortedPlayers[0].seat ? 'won' : 'played'} a game of Cribbage! Final score: ${sortedPlayers.map(p => `${p.name}: ${p.score}`).join(', ')}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cribbage Game',
          text,
        });
        trigger('success');
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(text);
      trigger('selection');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onPlayAgain}
      height={0.85}
      swipeable={false}
    >
      <div className="px-6 pb-8 text-center">
        {/* Trophy with bounce animation */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 12,
            delay: 0.1,
          }}
          className="mb-4"
        >
          <Trophy className="w-20 h-20 text-amber-400 mx-auto" />
        </motion.div>

        {/* Title */}
        <motion.h2
          className="text-3xl font-bold text-white mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Game Over!
        </motion.h2>

        {/* Winner */}
        <motion.p
          className="text-xl text-green-400 mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {winner.name} wins!
        </motion.p>

        {/* Skunk status */}
        {skunkStatus && (
          <motion.p
            className="text-amber-500 font-bold text-lg mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
          >
            {skunkStatus}
          </motion.p>
        )}

        {/* Final scores */}
        <motion.div
          className="bg-slate-900 rounded-xl p-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-sm font-medium text-slate-400 mb-3">
            Final Scores
          </h3>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <motion.div
                key={player.seat}
                className={`flex items-center justify-between py-3 px-4 rounded-lg ${
                  index === 0 ? 'bg-amber-900/30' : 'bg-slate-800'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <div className="flex items-center gap-2">
                  {index === 0 && (
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                    >
                      <Trophy className="w-5 h-5 text-amber-400" />
                    </motion.div>
                  )}
                  <span className="text-white font-medium">{player.name}</span>
                </div>
                <motion.span
                  className="text-white font-mono text-xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    delay: 0.6 + index * 0.1,
                  }}
                >
                  {player.score}
                </motion.span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          className="flex gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <motion.button
            onClick={handleShare}
            className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            whileTap={{ scale: 0.98 }}
          >
            <Share2 className="w-5 h-5" />
            Share
          </motion.button>
          <motion.button
            onClick={onPlayAgain}
            className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold text-lg transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            Play Again
          </motion.button>
        </motion.div>
      </div>
    </BottomSheet>
  );
}
